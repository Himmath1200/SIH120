"""Pydantic request/response schemas (rendered in Swagger at /docs)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]


class Health(BaseModel):
    status: str = "ok"
    service: str = "Baghewala Digital Twin API"


# ------------------------------------------------------------------ inputs
class CSSInput(BaseModel):
    well_id: str = Field("WB-101", description="Well identifier, e.g. WB-101")
    steam_volume: float = Field(2200, ge=200, le=8000, description="Steam injected per cycle (tonnes cold-water equivalent)")
    injection_pressure: float = Field(114, ge=10, le=200, description="Injection pressure (bar)")
    soak_time: float = Field(5, ge=0, le=60, description="Soak (shut-in) time (days)")
    production_cutoff: float = Field(3.0, ge=0.5, le=20, description="Economic cut-off oil rate ending the cycle (m3/d)")


class SRPInput(BaseModel):
    well_id: str = "WB-101"
    stroke_length: float = Field(144, ge=30, le=200, description="Polished-rod stroke length (in)")
    spm: float = Field(8, ge=1, le=14, description="Strokes per minute")
    vfd_frequency: float = Field(60, ge=20, le=70, description="VFD frequency (Hz)")
    fluid_level: float = Field(220, ge=0, le=600, description="Fluid level above pump (m)")
    oil_viscosity: float = Field(1800, ge=5, le=10000, description="Oil viscosity at pump (cP)")


class OptimizeAllInput(BaseModel):
    well_id: str = "WB-101"
    steam_volume: float = Field(2200, ge=200, le=8000)
    injection_pressure: float = Field(114, ge=10, le=200)
    soak_time: float = Field(5, ge=0, le=60)
    production_cutoff: float = Field(3.0, ge=0.5, le=20)
    stroke_length: float = Field(144, ge=30, le=200)
    spm: float = Field(8, ge=1, le=14)
    vfd_frequency: float = Field(60, ge=20, le=70)
    fluid_level: float = Field(220, ge=0, le=600)
    oil_viscosity: float = Field(1800, ge=5, le=10000)


class ProductionInput(BaseModel):
    steam_volume: float = Field(2200, ge=200, le=8000, description="tonnes")
    injection_pressure: float = Field(100, ge=10, le=200, description="bar")
    soak_time: float = Field(10, ge=0, le=60, description="days")
    reservoir_temperature: float = Field(42, ge=20, le=120, description="deg C")
    reservoir_pressure: float = Field(48, ge=10, le=150, description="bar")
    oil_viscosity: float = Field(3800, ge=100, le=20000, description="cP at reservoir temperature")
    spm: float = Field(6, ge=1, le=14)
    stroke_length: float = Field(120, ge=30, le=200, description="in")
    vfd_frequency: float = Field(48, ge=20, le=70, description="Hz")


class FailureInput(BaseModel):
    rod_load: float = Field(41, ge=0, le=120, description="Peak polished rod load (kN)")
    spm: float = Field(8, ge=1, le=14)
    stroke_length: float = Field(144, ge=30, le=200)
    vfd_frequency: float = Field(60, ge=20, le=70)
    fluid_level: float = Field(220, ge=0, le=600)
    pump_load: float = Field(14, ge=0, le=100, description="kN")
    oil_viscosity: float = Field(1800, ge=5, le=10000, description="cP")
    reservoir_temperature: float = Field(60, ge=20, le=300, description="deg C")
    tubing_pressure: float = Field(6, ge=0, le=50, description="bar")
    production: float = Field(3, ge=0, le=200, description="m3/d oil")


class SimulationInput(BaseModel):
    well_id: str = "WB-101"
    temperature: float | None = Field(None, ge=100, le=360, description="Injection steam temperature (deg C); default = saturation temperature at the injection pressure")
    steam_volume: float = Field(2200, ge=200, le=8000)
    injection_pressure: float = Field(114, ge=10, le=200)
    soak_time: float = Field(5, ge=0, le=60)
    spm: float = Field(8, ge=1, le=14)
    stroke_length: float = Field(144, ge=30, le=200)
    vfd_frequency: float = Field(60, ge=20, le=70)
    production_cutoff: float = Field(3.0, ge=0.5, le=20)
    fluid_level: float = Field(220, ge=0, le=600)


# ------------------------------------------------------------------ outputs
class WellSummary(BaseModel):
    id: str
    name: str
    depth_m: float
    reservoir_temperature: float
    reservoir_pressure: float
    oil_viscosity: float
    current_viscosity: float
    frac_pressure: float
    baseline: dict[str, float] = Field(description="Baseline operating parameters")
    kpi: dict[str, float] = Field(description="Baseline KPIs (simulated)")


class Alert(BaseModel):
    severity: Literal["info", "warning", "critical"]
    message: str


class HistoryPoint(BaseModel):
    day: int
    oil_rate: float
    fluid_rate: float
    viscosity: float
    temperature: float
    rod_load: float
    pump_load: float
    spm: float
    tubing_pressure: float


class Dashboard(BaseModel):
    well: WellSummary
    kpi: dict[str, float]
    alerts: list[Alert]
    history: list[HistoryPoint]
    source: str = "backend"


class CSSMetrics(BaseModel):
    cycle_oil_m3: float
    cycle_days: float
    avg_rate_m3d: float
    sor: float
    energy_gj: float
    energy_per_m3_gj: float
    hot_temperature_c: float
    hot_viscosity_cp: float
    score: float


class CurvePoint(BaseModel):
    day: float
    baseline: float
    optimized: float


class CSSResult(BaseModel):
    well_id: str
    recommended: dict[str, float]
    baseline: CSSMetrics
    optimized: CSSMetrics
    predicted_production_m3: float
    predicted_sor: float
    energy_consumption_gj: float
    optimization_score: float
    production_improvement_pct: float
    curve: list[CurvePoint]
    source: str = "backend"


class SRPMetrics(BaseModel):
    stroke_length: float
    spm: float
    vfd_frequency: float
    pump_efficiency: float
    system_efficiency: float
    rod_load: float
    min_rod_load: float
    pump_load: float
    rod_failure_risk: float
    rod_floating_risk: float
    risk_level: RiskLevel
    production_m3d: float
    kwh_per_day: float
    fillage: float


class SweepPoint(BaseModel):
    spm: float
    rod_load: float
    risk: float
    production: float


class SRPResult(BaseModel):
    well_id: str
    recommended: dict[str, float]
    baseline: SRPMetrics
    optimized: SRPMetrics
    sweep: list[SweepPoint]
    source: str = "backend"


class AllResult(BaseModel):
    well_id: str
    css: CSSResult
    srp: SRPResult
    combined: dict[str, dict[str, float]] = Field(description="before/after summary metrics")
    source: str = "backend"


class SensitivityPoint(BaseModel):
    steam_volume: float
    predicted: float
    physics: float


class ProductionResult(BaseModel):
    predicted_oil_rate_m3d: float = Field(description="Predicted mean oil rate over the first 90 days (m3/d)")
    predicted_oil_rate_bbl_d: float
    predicted_90d_volume_m3: float
    physics_reference_m3d: float
    sensitivity: list[SensitivityPoint]
    model: str
    source: str = "backend"


class FailureResult(BaseModel):
    rod_floating_risk_pct: float
    overload_risk_pct: float
    overall_failure_risk_pct: float
    risk_level: RiskLevel
    drivers: list[str]
    model: str
    source: str = "backend"


class SimPoint(BaseModel):
    day: float
    temperature: float
    viscosity: float
    pressure: float
    production: float
    pump_load: float
    rod_load: float
    sor: float
    failure_risk: float
    cum_oil: float


class SimulationResult(BaseModel):
    well_id: str
    injection_temperature_c: float
    summary: dict[str, float]
    series: list[SimPoint]
    source: str = "backend"


class FleetRow(BaseModel):
    well_id: str
    name: str
    before: dict[str, float]
    after: dict[str, float]


class FleetResult(BaseModel):
    wells: list[FleetRow]
    source: str = "backend"
