"""Smoke-test every endpoint in-process.  Run from backend/:  python scripts/smoke_test.py   (needs `pip install httpx`)"""
import json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
def show(name, r, keys=None):
    assert r.status_code == 200, (name, r.status_code, r.text[:300])
    j = r.json()
    print(f"OK {name}:", json.dumps({k: j[k] for k in keys} if keys else j)[:300])
    return j

show("health", c.get("/api/health"))
w = show("wells", c.get("/api/wells")); assert len(w) == 5
d = show("dashboard", c.get("/api/dashboard/WB-101"), ["kpi", "alerts"])
show("history", c.get("/api/wells/WB-101/history")) if False else print("OK history", len(c.get("/api/wells/WB-101/history").json()))
show("prod", c.post("/api/predict/production", json={}), ["predicted_oil_rate_m3d", "physics_reference_m3d", "model"])
show("fail", c.post("/api/predict/failure", json={}), ["rod_floating_risk_pct", "risk_level", "model"])
t = time.time(); show("css", c.post("/api/optimize/css", json={}), ["recommended", "baseline", "optimized", "production_improvement_pct"]); print("  css s", round(time.time()-t, 2))
show("srp", c.post("/api/optimize/srp", json={}), ["recommended", "baseline", "optimized"])
t = time.time(); show("all", c.post("/api/optimize/all", json={}), ["combined"]); print("  all s", round(time.time()-t, 2))
show("sim", c.post("/api/simulation/run", json={}), ["summary", "injection_temperature_c"])
t = time.time(); f = show("fleet", c.get("/api/analytics/fleet"), None if False else ["source"]); print("  fleet s", round(time.time()-t, 2))
# dynamic behaviour: outputs must change with inputs
a = c.post("/api/predict/production", json={"steam_volume": 1500}).json()["predicted_oil_rate_m3d"]
b = c.post("/api/predict/production", json={"steam_volume": 4000}).json()["predicted_oil_rate_m3d"]
print("prod dynamic", a, b); assert a != b
a = c.post("/api/predict/failure", json={"spm": 4}).json()["rod_floating_risk_pct"]
b = c.post("/api/predict/failure", json={"spm": 9}).json()["rod_floating_risk_pct"]
print("fail dynamic", a, b); assert a != b
assert c.get("/api/dashboard/NOPE").status_code == 404
assert c.get("/docs").status_code == 200 and c.get("/openapi.json").status_code == 200
print("ALL OK")
