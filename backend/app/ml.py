"""Loads the offline-trained models (joblib). Returns None if a model file is missing."""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

log = logging.getLogger("baghewala.ml")
MODEL_DIR = Path(__file__).resolve().parents[1] / "models"

PRODUCTION_FEATURES = ["steam_volume", "injection_pressure", "soak_time", "reservoir_temperature",
                       "reservoir_pressure", "oil_viscosity", "spm", "stroke_length", "vfd_frequency"]
FAILURE_FEATURES = ["rod_load", "spm", "stroke_length", "vfd_frequency", "fluid_level", "pump_load",
                    "oil_viscosity", "reservoir_temperature", "tubing_pressure", "production"]


def failure_vector(r: dict) -> list[float]:
    """Base inputs + physics-informed engineered features (stroke*SPM, sqrt(mu)*stroke*SPM, VFD mismatch)."""
    v = r["stroke_length"] * r["spm"]
    return [r[f] for f in FAILURE_FEATURES] + [v, (max(r["oil_viscosity"], 1.0) ** 0.5) * v,
                                               abs(r["vfd_frequency"] - 8.0 * r["spm"])]


FAILURE_TARGETS = ["floating_risk", "overload_risk", "failure_risk"]


@lru_cache(maxsize=None)
def _load(name: str):
    path = MODEL_DIR / f"{name}.joblib"
    try:
        return joblib.load(path)
    except Exception as exc:  # missing/incompatible file -> physics fallback
        log.warning("Model %s unavailable (%s); using physics fallback", name, exc)
        return None


def metadata() -> dict:
    try:
        return json.loads((MODEL_DIR / "metadata.json").read_text())
    except Exception:
        return {}


def predict_production(rows: list[dict]) -> list[float] | None:
    m = _load("production_model")
    if m is None:
        return None
    X = np.array([[r[f] for f in PRODUCTION_FEATURES] for r in rows], dtype=float)
    return [max(float(v), 0.0) for v in m.predict(X)]


def predict_failure(row: dict) -> dict[str, float] | None:
    m = _load("failure_model")
    if m is None:
        return None
    X = np.array([failure_vector(row)], dtype=float)
    out = m.predict(X)[0]
    return {t: float(min(max(v, 0.0), 100.0)) for t, v in zip(FAILURE_TARGETS, out)}
