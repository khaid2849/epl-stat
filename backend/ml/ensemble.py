"""Ensemble blending of XGBoost and LightGBM predictions."""

import numpy as np
import pandas as pd
from typing import Any, Optional


XGB_WEIGHT = 0.6
LGBM_WEIGHT = 0.4


def blend_predictions(
    xgb_preds: np.ndarray,
    lgbm_preds: np.ndarray,
    xgb_weight: float = XGB_WEIGHT,
    lgbm_weight: float = LGBM_WEIGHT,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Blend XGB and LGBM predictions.

    Returns:
        blended: weighted average predictions
        confidence: absolute difference between models (lower = more confident)
    """
    blended = xgb_weight * xgb_preds + lgbm_weight * lgbm_preds
    confidence = np.abs(xgb_preds - lgbm_preds)
    return blended, confidence


def predict_ensemble(
    xgb_model: Any,
    lgbm_model: Any,
    X: pd.DataFrame,
) -> tuple[np.ndarray, np.ndarray]:
    """Run both models and return blended predictions + confidence."""
    xgb_preds = np.array(xgb_model.predict(X), dtype=float)
    lgbm_preds = np.array(lgbm_model.predict(X), dtype=float)
    # Clip negatives
    xgb_preds = np.clip(xgb_preds, 0, None)
    lgbm_preds = np.clip(lgbm_preds, 0, None)
    return blend_predictions(xgb_preds, lgbm_preds)
