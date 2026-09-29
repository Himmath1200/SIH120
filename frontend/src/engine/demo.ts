/**
 * Local deterministic implementation of every API endpoint (port of backend/app/service.py).
 * Used when the backend is unreachable or the user picks DEMO SIMULATION MODE.
 * Results are physics-only (no trained ML) and always tagged source = "demo-local".
 */
import type {
  AllResult, CSSMetrics, CSSResult, Dashboard, FailureInput, FailureResult, FleetResult, HistoryPoint, Kpi,
  ProductionInput, ProductionResult, SimulationInput, SimulationResult, SRPMetrics, SRPResult, Summary, WellSummary,
  Alert, OperatingPoint,
} from "../types";
import * as ph from "./physics";

const SRC = "demo-local" as const;
const r = (x: number, n = 2) => { const f = 10 ** n; return Math.round(x * f) / f; };
const noise = (day: number, k: number) => {
  const x = Math.sin(day * 12.9898 + k * 78.233) * 43758.5453;
  return 2 * (x - Math.floor(x)) - 1;
};

function cssMetrics(c: ph.CssCycle): CSSMetrics {
  return { cycle_oil_m3: r(c.cycle_oil, 1), cycle_days: c.cycle_days, avg_rate_m3d: r(c.avg_rate), sor: r(c.sor),
    energy_gj: r(c.energy_total, 1), energy_per_m3_gj: r(c.energy_per_m3), hot_temperature_c: r(c.t_hot, 1),
    hot_viscosity_cp: r(c.mu_hot, 1), score: r(c.score, 1) };
}

function srpMetrics(w: ph.WellDef, stroke: number, spm: number, vfd: number, level: number, mu: number): SRPMetrics {
  const s = ph.srpState(w, stroke, spm, vfd, level, mu);
  return { stroke_length: r(stroke, 1), spm: r(spm, 1), vfd_frequency: r(vfd, 1), pump_efficiency: r(s.pump_efficiency, 1),
    system_efficiency: r(s.system_efficiency, 1), rod_load: r(s.rod_load), min_rod_load: r(s.min_rod_load),
    pump_load: r(s.pump_load), rod_failure_risk: r(s.failure_risk, 1), rod_floating_risk: r(s.floating_risk, 1),
    risk_level: ph.riskLevel(s.floating_risk), production_m3d: r(s.oil_rate), kwh_per_day: r(s.kwh_per_day, 1),
    fillage: r(s.fillage, 3) };
}

// ---------------------------------------------------------------- wells / dashboard
const baseCache = new Map<string, { css: ph.CssCycle; srp: ph.SrpState }>();
function baseline(id: string) {
  let b = baseCache.get(id);
  if (!b) {
    const w = ph.getWell(id);
    b = { css: ph.cssCycle(w, ph.wellCss(w), ph.wellSrp(w)),
      srp: ph.srpState(w, w.stroke_length, w.spm, w.vfd_frequency, w.fluid_level, w.current_viscosity) };
    baseCache.set(id, b);
  }
  return b;
}

function kpi(id: string): Kpi {
  const { css: c, srp: s } = baseline(id);
  return { oil_rate_m3d: r(c.peak_rate * 0.6), viscosity_cp: ph.getWell(id).current_viscosity, sor: r(c.sor),
    rod_floating_risk: r(s.floating_risk, 1), rod_failure_risk: r(s.failure_risk, 1), energy_gj: r(c.energy_total, 1),
    pump_efficiency: r(s.pump_efficiency, 1), cycle_oil_m3: r(c.cycle_oil, 1), hot_temperature_c: r(c.t_hot, 1),
    rod_load_kn: r(s.rod_load) };
}

export function listWells(): WellSummary[] {
  return ph.WELL_IDS.map((id) => {
    const w = ph.WELLS[id];
    return { id, name: w.name, depth_m: w.depth, reservoir_temperature: w.reservoir_temperature,
      reservoir_pressure: w.reservoir_pressure, oil_viscosity: w.oil_viscosity, current_viscosity: w.current_viscosity,
      frac_pressure: w.frac_pressure,
      baseline: { ...ph.wellCss(w), ...ph.wellSrp(w) }, kpi: kpi(id) };
  });
}

export function history(id: string, days = 90): HistoryPoint[] {
  const w = ph.getWell(id);
  const c = ph.cssCycle(w, ph.wellCss(w), ph.wellSrp(w), { wantSeries: true });
  return c.series.slice(-days).map((p, d) => ({
    day: d, oil_rate: r(Math.max(p.production * (1 + 0.04 * noise(d, 1)), 0)),
    fluid_rate: r(p.fluid_rate * (1 + 0.03 * noise(d, 2))), viscosity: r(p.viscosity * (1 + 0.05 * noise(d, 3)), 1),
    temperature: r(p.temperature + 2 * noise(d, 4), 1), rod_load: r(p.rod_load + 0.6 * noise(d, 5)),
    pump_load: r(p.pump_load + 0.4 * noise(d, 6)), spm: w.spm, tubing_pressure: r(w.tubing_pressure + 0.5 * noise(d, 7)),
  }));
}

function alerts(id: string): Alert[] {
  const w = ph.getWell(id), k = kpi(id), a: Alert[] = [];
  if (k.rod_floating_risk >= 60) a.push({ severity: "critical", message: `Rod floating risk ${k.rod_floating_risk.toFixed(0)}% - reduce SPM/stroke or heat the near-wellbore oil.` });
  else if (k.rod_floating_risk >= 30) a.push({ severity: "warning", message: `Rod floating risk elevated (${k.rod_floating_risk.toFixed(0)}%).` });
  if (w.current_viscosity > 1500) a.push({ severity: "warning", message: `High oil viscosity at pump (${w.current_viscosity} cP).` });
  if (k.sor > 3.5) a.push({ severity: k.sor > 5 ? "critical" : "warning", message: `High steam-oil ratio (${k.sor.toFixed(1)}) - CSS settings are inefficient.` });
  if (w.injection_pressure > w.frac_pressure) a.push({ severity: "warning", message: `Injection pressure ${w.injection_pressure} bar exceeds fracture-pressure limit ${w.frac_pressure} bar.` });
  if (!a.length) a.push({ severity: "info", message: "All monitored parameters within the simulated normal range." });
  return a;
}

export function dashboard(id: string): Dashboard {
  const wid = ph.WELLS[id] ? id : "WB-101";
  return { well: listWells().find((x) => x.id === wid)!, kpi: kpi(wid), alerts: alerts(wid), history: history(wid), source: SRC };
}

// ---------------------------------------------------------------- CSS
function curve(b: ph.CssCycle, o: ph.CssCycle) {
  const out = [];
  const n = Math.max(b.series.length, o.series.length);
  for (let i = 0; i < n; i += 5) {
    out.push({ day: i,
      baseline: i < b.series.length && i <= b.cycle_days + 5 ? r(b.series[i].production) : 0,
      optimized: i < o.series.length && i <= o.cycle_days + 5 ? r(o.series[i].production) : 0 });
  }
  return out;
}

type CssArgs = { well_id: string } & Pick<OperatingPoint, "steam_volume" | "injection_pressure" | "soak_time" | "production_cutoff">;

export function optimizeCSS(inp: CssArgs, srp?: ph.SrpIn): CSSResult {
  const w = ph.getWell(inp.well_id);
  const s = srp ?? ph.wellSrp(w);
  const css = { steam_volume: inp.steam_volume, injection_pressure: inp.injection_pressure, soak_time: inp.soak_time, production_cutoff: inp.production_cutoff };
  const base = ph.cssCycle(w, css, s, { wantSeries: true });
  const rec = ph.optimizeCss(w, css.production_cutoff, s);
  const opt = ph.cssCycle(w, { ...rec, production_cutoff: css.production_cutoff }, s, { wantSeries: true });
  const imp = 100 * (opt.cycle_oil - base.cycle_oil) / Math.max(base.cycle_oil, 1e-6);
  return { well_id: inp.well_id, recommended: rec, baseline: cssMetrics(base), optimized: cssMetrics(opt),
    predicted_production_m3: r(opt.cycle_oil, 1), predicted_sor: r(opt.sor), energy_consumption_gj: r(opt.energy_total, 1),
    optimization_score: r(opt.score, 1), production_improvement_pct: r(imp, 1), curve: curve(base, opt), source: SRC };
}

// ---------------------------------------------------------------- SRP
type SrpArgs = { well_id: string; stroke_length: number; spm: number; vfd_frequency: number; fluid_level: number; oil_viscosity: number };

function sweep(w: ph.WellDef, stroke: number, lvl: number, mu: number) {
  const out = [];
  for (let k = 4; k <= 20; k++) {
    const spm = k * 0.5;
    const s = ph.srpState(w, stroke, spm, ph.clamp(ph.SPM_TO_HZ * spm, 30, 60), lvl, mu);
    out.push({ spm, rod_load: r(s.rod_load), risk: r(s.failure_risk, 1), production: r(s.oil_rate) });
  }
  return out;
}

export function optimizeSRP(inp: SrpArgs): SRPResult {
  const w = ph.getWell(inp.well_id);
  const rec = ph.optimizeSrp(w, inp.fluid_level, inp.oil_viscosity);
  return { well_id: inp.well_id, recommended: rec,
    baseline: srpMetrics(w, inp.stroke_length, inp.spm, inp.vfd_frequency, inp.fluid_level, inp.oil_viscosity),
    optimized: srpMetrics(w, rec.stroke_length, rec.spm, rec.vfd_frequency, inp.fluid_level, inp.oil_viscosity),
    sweep: sweep(w, rec.stroke_length, inp.fluid_level, inp.oil_viscosity), source: SRC };
}

type AllArgs = CssArgs & SrpArgs;

export function optimizeAll(inp: AllArgs): AllResult {
  const w = ph.getWell(inp.well_id);
  const srp0: ph.SrpIn = { stroke_length: inp.stroke_length, spm: inp.spm, vfd_frequency: inp.vfd_frequency, fluid_level: inp.fluid_level };
  const css = optimizeCSS(inp, srp0);
  const rec = css.recommended;
  const cssIn = { ...rec, production_cutoff: inp.production_cutoff };
  const rs = ph.optimizeSrpCycle(w, cssIn, inp.fluid_level);
  const final = ph.cssCycle(w, cssIn, { ...rs, fluid_level: inp.fluid_level });
  const base = ph.cssCycle(w, { steam_volume: inp.steam_volume, injection_pressure: inp.injection_pressure, soak_time: inp.soak_time, production_cutoff: inp.production_cutoff }, srp0);
  const mu = inp.oil_viscosity, lvl = inp.fluid_level;
  const bSrp = srpMetrics(w, srp0.stroke_length, srp0.spm, srp0.vfd_frequency, lvl, mu);
  const aSrp = srpMetrics(w, rs.stroke_length, rs.spm, rs.vfd_frequency, lvl, mu);
  const srp: SRPResult = { well_id: inp.well_id, recommended: rs, baseline: bSrp, optimized: aSrp, sweep: sweep(w, rs.stroke_length, lvl, mu), source: SRC };
  const summ = (c: ph.CssCycle, m: SRPMetrics): Summary => ({
    cycle_oil_m3: r(c.cycle_oil, 1), sor: r(c.sor), energy_gj: r(c.energy_total, 1), energy_per_m3_gj: r(c.energy_per_m3),
    viscosity_cp: r(c.mu_hot, 1), rod_risk: m.rod_floating_risk, peak_cycle_risk: r(c.peak_risk, 1),
    pump_efficiency: r(c.avg_pump_eff, 1), score: r(c.score, 1) });
  css.optimized = cssMetrics(final);
  css.predicted_production_m3 = css.optimized.cycle_oil_m3;
  css.predicted_sor = css.optimized.sor;
  css.energy_consumption_gj = css.optimized.energy_gj;
  css.optimization_score = css.optimized.score;
  css.production_improvement_pct = r(100 * (final.cycle_oil - base.cycle_oil) / Math.max(base.cycle_oil, 1e-6), 1);
  return { well_id: inp.well_id, css, srp, combined: { before: summ(base, bSrp), after: summ(final, aSrp) }, source: SRC };
}

const fleetCache = new Map<string, FleetResult["wells"][number]>();
export function fleet(): FleetResult {
  const wells = ph.WELL_IDS.map((id) => {
    let row = fleetCache.get(id);
    if (!row) {
      const w = ph.WELLS[id];
      const res = optimizeAll({ well_id: id, oil_viscosity: w.current_viscosity, ...ph.wellCss(w), ...ph.wellSrp(w) });
      row = { well_id: id, name: w.name, before: res.combined.before, after: res.combined.after };
      fleetCache.set(id, row);
    }
    return row;
  });
  return { wells, source: SRC };
}

// ---------------------------------------------------------------- prediction (physics-only in demo mode)
function physRate(i: ProductionInput): number {
  const w = ph.genericWell(i.reservoir_temperature, i.reservoir_pressure, i.oil_viscosity);
  return ph.avgRateFirstDays(w,
    { steam_volume: i.steam_volume, injection_pressure: i.injection_pressure, soak_time: i.soak_time, production_cutoff: 3.0 },
    { stroke_length: i.stroke_length, spm: i.spm, vfd_frequency: i.vfd_frequency, fluid_level: 220 });
}

export function predictProduction(i: ProductionInput): ProductionResult {
  const phys = physRate(i);
  const steps = [0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.2].map((f) => Math.min(Math.max(i.steam_volume * f, 500), 8000));
  const sens = steps.map((v) => { const p = physRate({ ...i, steam_volume: v }); return { steam_volume: r(v, 0), predicted: r(p), physics: r(p) }; });
  return { predicted_oil_rate_m3d: r(phys), predicted_oil_rate_bbl_d: r(phys * 6.2898, 1), predicted_90d_volume_m3: r(phys * 90, 1),
    physics_reference_m3d: r(phys), sensitivity: sens, model: "Local physics model (demo mode - trained ML not used)", source: SRC };
}

export function predictFailure(i: FailureInput): FailureResult {
  const k = ph.rodFailureRisk(i.rod_load, i.spm, i.stroke_length, i.oil_viscosity, i.tubing_pressure, i.vfd_frequency, i.fluid_level);
  const d: string[] = [];
  if (k.floating >= 30) d.push("High downstroke viscous drag relative to rod weight (rod floating tendency)");
  if (k.overload >= 30) d.push("Peak rod load approaching allowable rod-string load");
  if (i.fluid_level < 70) d.push("Low fluid level - fluid pound / pump-off risk");
  if (Math.abs(i.vfd_frequency - ph.SPM_TO_HZ * i.spm) > 15) d.push("VFD frequency mismatched to SPM setpoint");
  if (!d.length) d.push("No dominant risk driver in the modelled range");
  return { rod_floating_risk_pct: r(k.floating, 1), overload_risk_pct: r(k.overload, 1), overall_failure_risk_pct: r(k.total, 1),
    risk_level: ph.riskLevel(k.floating), drivers: d, model: "Local physics model (demo mode - trained ML not used)", source: SRC };
}

// ---------------------------------------------------------------- simulation
export function simulate(i: SimulationInput): SimulationResult {
  const w = ph.getWell(i.well_id);
  const c = ph.cssCycle(w, { steam_volume: i.steam_volume, injection_pressure: i.injection_pressure, soak_time: i.soak_time, production_cutoff: i.production_cutoff },
    { stroke_length: i.stroke_length, spm: i.spm, vfd_frequency: i.vfd_frequency, fluid_level: i.fluid_level }, { injTemp: i.temperature ?? null, wantSeries: true });
  const series = c.series.filter((_, k) => k % 3 === 0).map((p) => ({
    day: p.day, temperature: r(p.temperature, 1), viscosity: r(p.viscosity, 1), pressure: r(p.pressure, 1), production: r(p.production),
    pump_load: r(p.pump_load), rod_load: r(p.rod_load), sor: r(p.sor), failure_risk: r(p.failure_risk, 1), cum_oil: r(p.cum_oil, 1) }));
  return { well_id: i.well_id, injection_temperature_c: r(c.t_inj, 1), series, source: SRC,
    summary: { cycle_oil_m3: r(c.cycle_oil, 1), cycle_days: c.cycle_days, sor: r(c.sor), energy_gj: r(c.energy_total, 1),
      peak_rate_m3d: r(c.peak_rate), hot_temperature_c: r(c.t_hot, 1), hot_viscosity_cp: r(c.mu_hot, 1),
      max_rod_load_kn: r(c.max_rod_load), avg_failure_risk: r(c.avg_risk, 1), peak_failure_risk: r(c.peak_risk, 1),
      avg_pump_efficiency: r(c.avg_pump_eff, 1), score: r(c.score, 1) } };
}
