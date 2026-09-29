export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Source = "backend" | "demo-local";

export interface Health { status: string; service: string }

export interface WellSummary {
  id: string; name: string; depth_m: number; reservoir_temperature: number; reservoir_pressure: number;
  oil_viscosity: number; current_viscosity: number; frac_pressure: number;
  baseline: OperatingPoint & { production_cutoff: number };
  kpi: Kpi;
}
export interface Kpi {
  oil_rate_m3d: number; viscosity_cp: number; sor: number; rod_floating_risk: number; rod_failure_risk: number;
  energy_gj: number; pump_efficiency: number; cycle_oil_m3: number; hot_temperature_c: number; rod_load_kn: number;
}
export interface Alert { severity: "info" | "warning" | "critical"; message: string }
export interface HistoryPoint {
  day: number; oil_rate: number; fluid_rate: number; viscosity: number; temperature: number;
  rod_load: number; pump_load: number; spm: number; tubing_pressure: number;
}
export interface Dashboard { well: WellSummary; kpi: Kpi; alerts: Alert[]; history: HistoryPoint[]; source: Source }

/** All tunable operating parameters (CSS + SRP). */
export interface OperatingPoint {
  steam_volume: number; injection_pressure: number; soak_time: number; production_cutoff: number;
  stroke_length: number; spm: number; vfd_frequency: number; fluid_level: number;
}

export interface CSSMetrics {
  cycle_oil_m3: number; cycle_days: number; avg_rate_m3d: number; sor: number; energy_gj: number;
  energy_per_m3_gj: number; hot_temperature_c: number; hot_viscosity_cp: number; score: number;
}
export interface CSSResult {
  well_id: string;
  recommended: { steam_volume: number; injection_pressure: number; soak_time: number };
  baseline: CSSMetrics; optimized: CSSMetrics;
  predicted_production_m3: number; predicted_sor: number; energy_consumption_gj: number;
  optimization_score: number; production_improvement_pct: number;
  curve: { day: number; baseline: number; optimized: number }[];
  source: Source;
}
export interface SRPMetrics {
  stroke_length: number; spm: number; vfd_frequency: number; pump_efficiency: number; system_efficiency: number;
  rod_load: number; min_rod_load: number; pump_load: number; rod_failure_risk: number; rod_floating_risk: number;
  risk_level: RiskLevel; production_m3d: number; kwh_per_day: number; fillage: number;
}
export interface SRPResult {
  well_id: string; recommended: { stroke_length: number; spm: number; vfd_frequency: number };
  baseline: SRPMetrics; optimized: SRPMetrics;
  sweep: { spm: number; rod_load: number; risk: number; production: number }[];
  source: Source;
}
export interface Summary {
  cycle_oil_m3: number; sor: number; energy_gj: number; energy_per_m3_gj: number; viscosity_cp: number;
  rod_risk: number; peak_cycle_risk: number; pump_efficiency: number; score: number;
}
export interface AllResult {
  well_id: string; css: CSSResult; srp: SRPResult; combined: { before: Summary; after: Summary }; source: Source;
}

export interface ProductionInput {
  steam_volume: number; injection_pressure: number; soak_time: number; reservoir_temperature: number;
  reservoir_pressure: number; oil_viscosity: number; spm: number; stroke_length: number; vfd_frequency: number;
}
export interface ProductionResult {
  predicted_oil_rate_m3d: number; predicted_oil_rate_bbl_d: number; predicted_90d_volume_m3: number;
  physics_reference_m3d: number; sensitivity: { steam_volume: number; predicted: number; physics: number }[];
  model: string; source: Source;
}
export interface FailureInput {
  rod_load: number; spm: number; stroke_length: number; vfd_frequency: number; fluid_level: number;
  pump_load: number; oil_viscosity: number; reservoir_temperature: number; tubing_pressure: number; production: number;
}
export interface FailureResult {
  rod_floating_risk_pct: number; overload_risk_pct: number; overall_failure_risk_pct: number;
  risk_level: RiskLevel; drivers: string[]; model: string; source: Source;
}
export interface SimulationInput {
  well_id: string; temperature?: number | null; steam_volume: number; injection_pressure: number; soak_time: number;
  spm: number; stroke_length: number; vfd_frequency: number; production_cutoff: number; fluid_level: number;
}
export interface SimPoint {
  day: number; temperature: number; viscosity: number; pressure: number; production: number; pump_load: number;
  rod_load: number; sor: number; failure_risk: number; cum_oil: number;
}
export interface SimulationResult {
  well_id: string; injection_temperature_c: number; summary: Record<string, number>; series: SimPoint[]; source: Source;
}
export interface FleetRow { well_id: string; name: string; before: Summary; after: Summary }
export interface FleetResult { wells: FleetRow[]; source: Source }
