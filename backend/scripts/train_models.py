"""Generate the synthetic datasets and train the ML models OFFLINE.

Run from backend/:   python scripts/train_models.py
Outputs: data/production_dataset.csv, data/failure_dataset.csv,
         models/production_model.joblib, models/failure_model.joblib, models/metadata.json
The API only *loads* these files; nothing is trained at request time.
"""
import csv
import json
import math
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app import physics as ph  # noqa: E402
from app.ml import FAILURE_FEATURES, FAILURE_TARGETS, PRODUCTION_FEATURES, failure_vector  # noqa: E402

rng = np.random.default_rng(42)
N = 4000


def make_production():
    rows = []
    for _ in range(N):
        f = dict(steam_volume=rng.uniform(800, 5500), injection_pressure=rng.uniform(40, 130),
                 soak_time=rng.uniform(2, 30), reservoir_temperature=rng.uniform(38, 48),
                 reservoir_pressure=rng.uniform(35, 60), oil_viscosity=rng.uniform(2000, 6000),
                 spm=rng.uniform(3, 9), stroke_length=rng.uniform(60, 168), vfd_frequency=rng.uniform(30, 60))
        w = ph.generic_well(f["reservoir_temperature"], f["reservoir_pressure"], f["oil_viscosity"])
        css = dict(steam_volume=f["steam_volume"], injection_pressure=f["injection_pressure"],
                   soak_time=f["soak_time"], production_cutoff=3.0)
        srp = dict(stroke_length=f["stroke_length"], spm=f["spm"], vfd_frequency=f["vfd_frequency"], fluid_level=220)
        y = ph.avg_rate_first_days(w, css, srp) * (1 + rng.normal(0, 0.02))
        rows.append({**{k: round(v, 3) for k, v in f.items()}, "oil_rate_90d_avg": round(y, 4)})
    return rows


def make_failure():
    rows = []
    w = ph.generic_well(42, 48, 3800)
    for _ in range(N):
        temp = rng.uniform(40, 220)
        mu = float(np.clip(ph.viscosity(temp, 3800, 42) * math.exp(rng.normal(0, 0.5)), 20, 6000))
        spm = rng.uniform(2, 10)
        stroke = rng.uniform(48, 168)
        vfd = float(np.clip(ph.SPM_TO_HZ * spm + rng.normal(0, 6), 30, 60))
        level = rng.uniform(20, 400)
        tp = rng.uniform(2, 15)
        s = ph.srp_state(w, stroke, spm, vfd, level, mu)
        rod_load = s["rod_load"] + rng.normal(0, 0.5)
        r = ph.rod_failure_risk(rod_load, spm, stroke, mu, tp, vfd, level)
        rows.append(dict(rod_load=rod_load, spm=spm, stroke_length=stroke, vfd_frequency=vfd, fluid_level=level,
                         pump_load=s["pump_load"], oil_viscosity=mu, reservoir_temperature=temp,
                         tubing_pressure=tp, production=s["oil_rate"],
                         floating_risk=float(np.clip(r["floating"] + rng.normal(0, 1.5), 0, 100)),
                         overload_risk=float(np.clip(r["overload"] + rng.normal(0, 1.5), 0, 100)),
                         failure_risk=float(np.clip(r["total"] + rng.normal(0, 1.5), 0, 100))))
    return [{k: round(v, 4) for k, v in r.items()} for r in rows]


def write_csv(path, rows):
    with open(path, "w", newline="") as fh:
        wr = csv.DictWriter(fh, fieldnames=list(rows[0]))
        wr.writeheader()
        wr.writerows(rows)


def fit(rows, feats, targets, name, vec=None):
    X = np.array([vec(r) if vec else [r[f] for f in feats] for r in rows])
    y = np.array([[r[t] for t in targets] for r in rows])
    y = y[:, 0] if len(targets) == 1 else y
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=1)
    m = RandomForestRegressor(n_estimators=60, max_depth=14, min_samples_leaf=3, n_jobs=-1, random_state=1)
    m.fit(Xtr, ytr)
    pred = m.predict(Xte)
    r2 = float(r2_score(yte, pred))
    mae = float(mean_absolute_error(yte, pred))
    print(f"{name}: R2={r2:.3f} MAE={mae:.3f}")
    m.fit(X, y)  # refit on all rows for deployment
    return m, dict(r2=round(r2, 4), mae=round(mae, 4), n_rows=len(rows), features=feats, targets=targets)


if __name__ == "__main__":
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "models").mkdir(exist_ok=True)
    prod, fail = make_production(), make_failure()
    write_csv(ROOT / "data" / "production_dataset.csv", prod)
    write_csv(ROOT / "data" / "failure_dataset.csv", fail)
    pm, pmeta = fit(prod, PRODUCTION_FEATURES, ["oil_rate_90d_avg"], "production")
    fm, fmeta = fit(fail, FAILURE_FEATURES, FAILURE_TARGETS, "failure", failure_vector)
    joblib.dump(pm, ROOT / "models" / "production_model.joblib", compress=3)
    joblib.dump(fm, ROOT / "models" / "failure_model.joblib", compress=3)
    (ROOT / "models" / "metadata.json").write_text(json.dumps(dict(production=pmeta, failure=fmeta), indent=2))
