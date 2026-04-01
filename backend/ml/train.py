"""Training pipeline for FPL point prediction models.

Run as:
    python -m backend.ml.train
    python -m backend.ml.train --position GKP
"""

import logging
import sys
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit

logger = logging.getLogger(__name__)

POSITIONS = ["GKP", "DEF", "MID", "FWD"]
MODEL_VERSION = "v1"


def _get_model_path(model_dir: str, model_type: str, position: str) -> Path:
    return Path(model_dir) / f"{model_type}_{position}.joblib"


def train_xgboost(X: pd.DataFrame, y: pd.Series, position: str) -> object:
    """Train an XGBoost regressor with TimeSeriesSplit CV."""
    from xgboost import XGBRegressor

    params = {
        "n_estimators": 300,
        "max_depth": 5,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 3,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "objective": "reg:squarederror",
        "eval_metric": "mae",
        "random_state": 42,
        "n_jobs": -1,
    }

    tscv = TimeSeriesSplit(n_splits=5)
    best_n_estimators = params["n_estimators"]
    mae_scores = []

    for train_idx, val_idx in tscv.split(X):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = XGBRegressor(**params)
        model.fit(
            X_tr, y_tr,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )
        preds = model.predict(X_val)
        mae = float(np.mean(np.abs(preds - y_val.values)))
        mae_scores.append(mae)

    logger.info("XGB %s CV MAE: %.4f ± %.4f", position, np.mean(mae_scores), np.std(mae_scores))

    # Final model on full data
    final = XGBRegressor(**params)
    final.fit(X, y, verbose=False)
    return final


def train_lightgbm(X: pd.DataFrame, y: pd.Series, position: str) -> object:
    """Train a LightGBM regressor with TimeSeriesSplit CV."""
    import lightgbm as lgb

    params = {
        "n_estimators": 300,
        "max_depth": 5,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_samples": 5,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "objective": "regression_l1",
        "metric": "mae",
        "random_state": 42,
        "n_jobs": -1,
        "verbose": -1,
    }

    tscv = TimeSeriesSplit(n_splits=5)
    mae_scores = []

    for train_idx, val_idx in tscv.split(X):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = lgb.LGBMRegressor(**params)
        model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)])
        preds = model.predict(X_val)
        mae = float(np.mean(np.abs(preds - y_val.values)))
        mae_scores.append(mae)

    logger.info("LGBM %s CV MAE: %.4f ± %.4f", position, np.mean(mae_scores), np.std(mae_scores))

    final = lgb.LGBMRegressor(**params)
    final.fit(X, y)
    return final


def train_position(position: str, model_dir: str) -> dict:
    """Train both models for one position. Returns metrics dict."""
    from ml.features import build_training_data

    logger.info("Building training data for position=%s...", position)
    X, y = build_training_data(position)

    if X.empty or len(y) < 20:
        logger.warning("Insufficient training data for %s (%d rows). Using dummy model.", position, len(y))
        return _save_dummy_models(position, model_dir)

    logger.info("Training data: %d rows, %d features for %s", len(X), len(X.columns), position)

    # XGBoost
    xgb_model = train_xgboost(X, y, position)
    xgb_path = _get_model_path(model_dir, "xgb", position)
    joblib.dump(xgb_model, xgb_path)
    logger.info("Saved XGB model to %s", xgb_path)

    # LightGBM
    lgbm_model = train_lightgbm(X, y, position)
    lgbm_path = _get_model_path(model_dir, "lgbm", position)
    joblib.dump(lgbm_model, lgbm_path)
    logger.info("Saved LGBM model to %s", lgbm_path)

    return {
        "position": position,
        "n_samples": len(X),
        "xgb_path": str(xgb_path),
        "lgbm_path": str(lgbm_path),
        "model_version": MODEL_VERSION,
    }


def _save_dummy_models(position: str, model_dir: str) -> dict:
    """Save trivial models that return the mean when real training isn't possible."""
    from sklearn.dummy import DummyRegressor

    dummy_X = pd.DataFrame([[0.0] * 35], columns=[f"f{i}" for i in range(35)])
    dummy_y = pd.Series([2.0])

    for model_type in ("xgb", "lgbm"):
        model = DummyRegressor(strategy="mean")
        model.fit(dummy_X, dummy_y)
        path = _get_model_path(model_dir, model_type, position)
        joblib.dump(model, path)
        logger.info("Saved dummy %s model for %s to %s", model_type, position, path)

    return {"position": position, "n_samples": 0, "model_version": MODEL_VERSION, "dummy": True}


def train_all(model_dir: Optional[str] = None) -> list[dict]:
    """Train all position models."""
    from config import settings

    md = model_dir or settings.model_dir
    Path(md).mkdir(parents=True, exist_ok=True)

    results = []
    for pos in POSITIONS:
        try:
            result = train_position(pos, md)
            results.append(result)
        except Exception as exc:
            logger.error("Training failed for %s: %s", pos, exc)
            results.append({"position": pos, "error": str(exc)})
    return results


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    import argparse

    parser = argparse.ArgumentParser(description="Train FPL prediction models")
    parser.add_argument("--position", choices=POSITIONS, default=None, help="Train a single position")
    parser.add_argument("--model-dir", default=None, help="Override model save directory")
    args = parser.parse_args()

    if args.position:
        from config import settings
        md = args.model_dir or settings.model_dir
        Path(md).mkdir(parents=True, exist_ok=True)
        result = train_position(args.position, md)
        print(result)
    else:
        results = train_all(args.model_dir)
        for r in results:
            print(r)
