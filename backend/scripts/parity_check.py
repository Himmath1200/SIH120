"""Compare the TypeScript demo engine with this backend: python scripts/parity_check.py /path/to/ts.json"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import service as sv, physics as ph

ts = json.load(open(sys.argv[1]))
w = dict(well_id="WB-101", steam_volume=2200, injection_pressure=114, soak_time=5, production_cutoff=3.0, stroke_length=144, spm=8, vfd_frequency=60, fluid_level=220, oil_viscosity=1800)
a = sv.optimize_all(w)
s = sv.simulate(dict(well_id="WB-101", temperature=None, steam_volume=3000, injection_pressure=90, soak_time=10, spm=5, stroke_length=100, vfd_frequency=40, production_cutoff=3, fluid_level=220))
py = dict(all=a["combined"], allRec=[a["css"]["recommended"], a["srp"]["recommended"]], sim=s["summary"],
          fail=sv.predict_failure(dict(rod_load=41, spm=8, stroke_length=144, vfd_frequency=60, fluid_level=220, pump_load=14, oil_viscosity=1800, reservoir_temperature=60, tubing_pressure=6, production=3))["rod_floating_risk_pct"] if False else ph.rod_failure_risk(41, 8, 144, 1800, 6, 60, 220)["floating"],
          srp=sv.optimize_srp(w)["recommended"], dash=sv._kpi("WB-103"))
bad = 0
def cmp(path, x, y):
    global bad
    if isinstance(x, dict):
        for k in x: cmp(f"{path}.{k}", x[k], y[k])
    elif isinstance(x, list):
        for i, (p, q) in enumerate(zip(x, y)): cmp(f"{path}[{i}]", p, q)
    elif isinstance(x, (int, float)):
        if abs(x - y) > max(0.02, 0.005 * abs(x)): bad += 1; print("MISMATCH", path, "py", x, "ts", y)
cmp("", py, ts)
print("PARITY OK" if not bad else f"{bad} mismatches")
