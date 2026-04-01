"""Model evaluation utilities."""

import logging
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger(__name__)


def evaluate_model(model: Any, X: pd.DataFrame, y: pd.Series, model_name: str = "") -> dict:
    """Evaluate a model and return metrics dict."""
    y_pred = model.predict(X)
    mae = mean_absolute_error(y, y_pred)
    rmse = np.sqrt(mean_squared_error(y, y_pred))
    r2 = r2_score(y, y_pred)

    metrics = {
        "model": model_name,
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "n_samples": len(y),
    }
    logger.info("Eval %s: MAE=%.4f RMSE=%.4f R2=%.4f (n=%d)", model_name, mae, rmse, r2, len(y))
    return metrics


def cross_validate_timeseries(model_cls, model_kwargs: dict, X: pd.DataFrame, y: pd.Series, n_splits: int = 5) -> list[dict]:
    """Run TimeSeriesSplit cross-validation and return per-fold metrics."""
    from sklearn.model_selection import TimeSeriesSplit

    tscv = TimeSeriesSplit(n_splits=n_splits)
    results = []
    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = model_cls(**model_kwargs)
        model.fit(X_train, y_train)
        metrics = evaluate_model(model, X_val, y_val, model_name=f"fold_{fold}")
        results.append(metrics)

    avg_mae = np.mean([r["mae"] for r in results])
    avg_rmse = np.mean([r["rmse"] for r in results])
    logger.info("CV avg MAE=%.4f RMSE=%.4f", avg_mae, avg_rmse)
    return results
