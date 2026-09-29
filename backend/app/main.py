"""FastAPI entry point.  Run:  uvicorn app.main:app --host 0.0.0.0 --port $PORT"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import ml, physics, schemas, service

DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"

@asynccontextmanager
async def lifespan(_: FastAPI):
    """Load models once at startup (no training happens here)."""
    ml.predict_failure(dict(rod_load=30, spm=6, stroke_length=100, vfd_frequency=48, fluid_level=200, pump_load=12,
                            oil_viscosity=500, reservoir_temperature=60, tubing_pressure=6, production=5))
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Baghewala Digital Twin API",
    version="1.0.0",
    description=(
        "Synthetic-data digital twin for Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) optimisation "
        "of heavy-oil wells (SIH26120 prototype).\n\n**DEMO / SIMULATION ONLY** - results are model-generated "
        "from synthetic data and are not Baghewala field measurements."
    ),
)

# Allowed browser origins: comma-separated env var. Set it to your Vercel URL in production.
origins = [o.strip().rstrip("/") for o in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]
# Optional regex, e.g. https://.*\.vercel\.app to also allow Vercel preview deployments.
origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX") or None
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_origin_regex=origin_regex,
                   allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])


def _known(well_id: str) -> str:
    if well_id not in physics.WELLS:
        raise HTTPException(404, f"Unknown well '{well_id}'. Valid: {', '.join(physics.WELLS)}")
    return well_id


@app.get("/", include_in_schema=False)
def root():
    return {"service": "Baghewala Digital Twin API", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health", response_model=schemas.Health, tags=["system"], summary="Health check")
def health():
    return schemas.Health()


@app.get("/api/wells", response_model=list[schemas.WellSummary], tags=["wells"], summary="List wells with baseline KPIs")
def wells():
    return service.list_wells()


@app.get("/api/dashboard/{well_id}", response_model=schemas.Dashboard, tags=["wells"],
         summary="Dashboard data for one well (KPIs, alerts, 90-day history)")
def dashboard(well_id: str):
    return service.dashboard(_known(well_id))


@app.get("/api/wells/{well_id}/history", response_model=list[schemas.HistoryPoint], tags=["wells"],
         summary="Simulated production/monitoring history")
def well_history(well_id: str, days: int = 90):
    return service.history(_known(well_id), max(7, min(days, 180)))


@app.post("/api/predict/production", response_model=schemas.ProductionResult, tags=["prediction"],
          summary="ML prediction of mean 90-day oil rate")
def predict_production(body: schemas.ProductionInput):
    return service.predict_production(body.model_dump())


@app.post("/api/predict/failure", response_model=schemas.FailureResult, tags=["prediction"],
          summary="ML prediction of rod floating / failure risk")
def predict_failure(body: schemas.FailureInput):
    return service.predict_failure(body.model_dump())


@app.post("/api/optimize/css", response_model=schemas.CSSResult, tags=["optimization"],
          summary="Optimise cyclic steam stimulation settings")
def optimize_css(body: schemas.CSSInput):
    _known(body.well_id)
    return service.optimize_css(body.model_dump())


@app.post("/api/optimize/srp", response_model=schemas.SRPResult, tags=["optimization"],
          summary="Optimise sucker-rod-pump settings")
def optimize_srp(body: schemas.SRPInput):
    _known(body.well_id)
    return service.optimize_srp(body.model_dump())


@app.post("/api/optimize/all", response_model=schemas.AllResult, tags=["optimization"],
          summary="Joint CSS + SRP optimisation with before/after summary")
def optimize_all(body: schemas.OptimizeAllInput):
    _known(body.well_id)
    return service.optimize_all(body.model_dump())


@app.post("/api/simulation/run", response_model=schemas.SimulationResult, tags=["simulation"],
          summary="Run the well-to-surface digital-twin simulation for one CSS cycle")
def run_simulation(body: schemas.SimulationInput):
    _known(body.well_id)
    return service.simulate(body.model_dump())


@app.get("/api/analytics/fleet", response_model=schemas.FleetResult, tags=["analytics"],
         summary="Before/after comparison for all wells")
def fleet():
    return service.fleet()
