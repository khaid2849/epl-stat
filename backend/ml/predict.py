"""Model inference and prediction caching."""

import logging
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd

from config import settings
from database import get_connection
from ml.features import build_feature_row, build_feature_matrix, ALL_FEATURES

logger = logging.getLogger(__name__)

POSITIONS = ["GKP", "DEF", "MID", "FWD"]
MODEL_VERSION = "v1"

# Module-level model cache: {position: {"xgb": model, "lgbm": model}}
_models: dict[str, dict[str, Any]] = {}


def _model_path(model_type: str, position: str) -> Path:
    return Path(settings.model_dir) / f"{model_type}_{position}.joblib"


def load_models() -> bool:
    """Load all saved models into module cache. Returns True if any loaded."""
    global _models
    loaded = 0
    for pos in POSITIONS:
        xgb_path = _model_path("xgb", pos)
        lgbm_path = _model_path("lgbm", pos)
        if xgb_path.exists() and lgbm_path.exists():
            try:
                _models[pos] = {
                    "xgb": joblib.load(xgb_path),
                    "lgbm": joblib.load(lgbm_path),
                }
                loaded += 1
                logger.info("Loaded models for position=%s", pos)
            except Exception as exc:
                logger.warning("Failed to load models for %s: %s", pos, exc)
        else:
            logger.info("No saved models found for position=%s", pos)
    return loaded > 0


def models_ready() -> bool:
    return len(_models) > 0


def _predict_for_player(player_row: dict, target_gw: int, conn) -> tuple[Optional[float], Optional[float], dict]:
    """
    Predict points for a single player.

    Returns (predicted_points, confidence, feature_dict)
    """
    position = player_row.get("position", "MID")
    if position not in _models:
        return None, None, {}

    feat = build_feature_row(player_row, target_gw, conn)
    feat_df = pd.DataFrame([feat], columns=ALL_FEATURES).fillna(0.0)

    xgb_model = _models[position]["xgb"]
    lgbm_model = _models[position]["lgbm"]

    # Handle dummy DummyRegressor (sklearn) which may have different feature handling
    try:
        xgb_pred = float(xgb_model.predict(feat_df)[0])
    except Exception:
        xgb_pred = 2.0
    try:
        lgbm_pred = float(lgbm_model.predict(feat_df)[0])
    except Exception:
        lgbm_pred = 2.0

    xgb_pred = max(0.0, xgb_pred)
    lgbm_pred = max(0.0, lgbm_pred)

    blended = 0.6 * xgb_pred + 0.4 * lgbm_pred
    confidence = abs(xgb_pred - lgbm_pred)

    return round(blended, 3), round(confidence, 3), feat


def get_shap_values(player_row: dict, target_gw: int, conn, top_n: int = 5) -> list[dict]:
    """
    Compute SHAP feature contributions for a player using the XGB model.
    Returns top_n features sorted by |shap_value|.
    """
    try:
        import shap

        position = player_row.get("position", "MID")
        if position not in _models:
            return []

        feat = build_feature_row(player_row, target_gw, conn)
        feat_df = pd.DataFrame([feat], columns=ALL_FEATURES).fillna(0.0)

        xgb_model = _models[position]["xgb"]

        # Use TreeExplainer only for tree-based models
        model_type = type(xgb_model).__name__
        if model_type in ("DummyRegressor",):
            return []

        explainer = shap.TreeExplainer(xgb_model)
        shap_values = explainer.shap_values(feat_df)

        contributions = []
        for i, fname in enumerate(ALL_FEATURES):
            contributions.append({
                "feature": fname,
                "value": round(float(feat_df.iloc[0, i]), 4),
                "shap": round(float(shap_values[0][i]), 4),
            })

        contributions.sort(key=lambda x: abs(x["shap"]), reverse=True)
        return contributions[:top_n]
    except Exception as exc:
        logger.warning("SHAP computation failed: %s", exc)
        return []


def _get_next_gw(conn) -> int:
    """Determine the next upcoming gameweek."""
    row = conn.execute(
        """
        SELECT MIN(gameweek) as gw FROM fixtures
        WHERE finished = 0 AND gameweek IS NOT NULL
        """
    ).fetchone()
    if row and row["gw"]:
        return row["gw"]
    # Fall back to max known GW + 1
    row2 = conn.execute("SELECT MAX(gameweek) as gw FROM team_gw_stats").fetchone()
    return (row2["gw"] or 26) + 1


def generate_all_predictions() -> int:
    """
    Generate and cache predictions for all active players for the next GW.
    Returns number of predictions stored.
    """
    if not models_ready():
        logger.warning("Models not loaded — skipping prediction generation.")
        return 0

    conn = get_connection()
    try:
        target_gw = _get_next_gw(conn)
        logger.info("Generating predictions for GW %d...", target_gw)

        players = conn.execute(
            "SELECT * FROM players WHERE status = 'a'"
        ).fetchall()

        count = 0
        for player in players:
            prow = dict(player)
            pts, conf, _ = _predict_for_player(prow, target_gw, conn)
            if pts is None:
                continue
            conn.execute(
                """
                INSERT OR REPLACE INTO predictions
                    (player_id, gameweek, predicted_points, confidence, model_version, generated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                (prow["id"], target_gw, pts, conf, MODEL_VERSION),
            )
            count += 1

        conn.commit()
        logger.info("Stored %d predictions for GW %d", count, target_gw)
        return count
    finally:
        conn.close()


def get_player_prediction(player_id: int, gameweek: Optional[int] = None) -> Optional[dict]:
    """
    Return prediction for a player, optionally with SHAP breakdown.
    Fetches from cache or computes on the fly.
    """
    conn = get_connection()
    try:
        target_gw = gameweek or _get_next_gw(conn)

        # Check cache first
        cached = conn.execute(
            "SELECT * FROM predictions WHERE player_id = ? AND gameweek = ?",
            (player_id, target_gw),
        ).fetchone()

        player = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
        if not player:
            return None

        prow = dict(player)

        if cached:
            pts = cached["predicted_points"]
            conf = cached["confidence"]
        else:
            if not models_ready():
                return None
            pts, conf, _ = _predict_for_player(prow, target_gw, conn)
            if pts is not None:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO predictions
                        (player_id, gameweek, predicted_points, confidence, model_version, generated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                    (player_id, target_gw, pts, conf, MODEL_VERSION),
                )
                conn.commit()

        if pts is None:
            return None

        shap_breakdown = get_shap_values(prow, target_gw, conn)

        return {
            "player_id": player_id,
            "gameweek": target_gw,
            "predicted_points": pts,
            "confidence": conf,
            "model_version": MODEL_VERSION,
            "feature_breakdown": shap_breakdown,
        }
    finally:
        conn.close()
