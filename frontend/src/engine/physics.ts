/**
 * Deterministic CSS + SRP physics used by DEMO SIMULATION MODE.
 * Direct TypeScript port of backend/app/physics.py - keep the two in sync.
 * All numbers are SYNTHETIC.
 */

export const G = 9.81;
export const RHO_OIL = 920.0;
export const OIL_REF_M3 = 600.0;
export const SPM_TO_HZ = 8.0;

export interface WellDef {
  name: string; depth: number; reservoir_temperature: number; reservoir_pressure: number; oil_viscosity: number;
  current_viscosity: number; pi: number; plunger_dia_in: number; rod_weight_kn: number; allowable_kn: number;
  frac_pressure: number; tubing_pressure: number; steam_volume: number; injection_pressure: number;
  soak_time: number; production_cutoff: number; spm: number; stroke_length: number; vfd_frequency: number;
  fluid_level: number;
}

export const WELLS: Record<string, WellDef> = {
  "WB-101": { name: "Baghewala WB-101", depth: 900, reservoir_temperature: 42, reservoir_pressure: 48, oil_viscosity: 3800, current_viscosity: 1800, pi: 0.085, plunger_dia_in: 2.0, rod_weight_kn: 22.0, allowable_kn: 48.0, frac_pressure: 105, tubing_pressure: 6, steam_volume: 2200, injection_pressure: 114, soak_time: 5, production_cutoff: 3.0, spm: 8.0, stroke_length: 144, vfd_frequency: 60, fluid_level: 220 },
  "WB-102": { name: "Baghewala WB-102", depth: 850, reservoir_temperature: 41, reservoir_pressure: 44, oil_viscosity: 3100, current_viscosity: 1500, pi: 0.095, plunger_dia_in: 2.0, rod_weight_kn: 20.5, allowable_kn: 46.0, frac_pressure: 100, tubing_pressure: 5, steam_volume: 2600, injection_pressure: 108, soak_time: 6, production_cutoff: 3.0, spm: 7.0, stroke_length: 132, vfd_frequency: 58, fluid_level: 200 },
  "WB-103": { name: "Baghewala WB-103", depth: 950, reservoir_temperature: 44, reservoir_pressure: 52, oil_viscosity: 4400, current_viscosity: 2100, pi: 0.07, plunger_dia_in: 2.25, rod_weight_kn: 23.6, allowable_kn: 52.0, frac_pressure: 110, tubing_pressure: 7, steam_volume: 2400, injection_pressure: 120, soak_time: 4, production_cutoff: 3.0, spm: 7.5, stroke_length: 144, vfd_frequency: 60, fluid_level: 260 },
  "WB-104": { name: "Baghewala WB-104", depth: 800, reservoir_temperature: 40, reservoir_pressure: 40, oil_viscosity: 2600, current_viscosity: 1000, pi: 0.105, plunger_dia_in: 1.75, rod_weight_kn: 19.6, allowable_kn: 44.0, frac_pressure: 95, tubing_pressure: 5, steam_volume: 2000, injection_pressure: 100, soak_time: 7, production_cutoff: 2.5, spm: 6.5, stroke_length: 120, vfd_frequency: 54, fluid_level: 180 },
  "WB-105": { name: "Baghewala WB-105", depth: 1000, reservoir_temperature: 45, reservoir_pressure: 55, oil_viscosity: 5200, current_viscosity: 2600, pi: 0.06, plunger_dia_in: 2.25, rod_weight_kn: 24.5, allowable_kn: 54.0, frac_pressure: 115, tubing_pressure: 8, steam_volume: 2800, injection_pressure: 126, soak_time: 4, production_cutoff: 3.5, spm: 8.0, stroke_length: 132, vfd_frequency: 60, fluid_level: 280 },
};
export const WELL_IDS = Object.keys(WELLS);

export interface CssIn { steam_volume: number; injection_pressure: number; soak_time: number; production_cutoff: number }
export interface SrpIn { stroke_length: number; spm: number; vfd_frequency: number; fluid_level: number }

export const getWell = (id: string): WellDef => WELLS[id] ?? WELLS["WB-101"];
export const genericWell = (t: number, p: number, mu: number): WellDef => ({ ...WELLS["WB-101"], reservoir_temperature: t, reservoir_pressure: p, oil_viscosity: mu });
export const wellCss = (w: WellDef): CssIn => ({ steam_volume: w.steam_volume, injection_pressure: w.injection_pressure, soak_time: w.soak_time, production_cutoff: w.production_cutoff });
export const wellSrp = (w: WellDef): SrpIn => ({ stroke_length: w.stroke_length, spm: w.spm, vfd_frequency: w.vfd_frequency, fluid_level: w.fluid_level });

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export const tSat = (pBar: number) => Math.min(345, 100 + 44 * Math.log(Math.max(pBar, 1.01)));
export const viscosity = (tempC: number, muRef: number, tRef: number) =>
  muRef * Math.exp(4200 * (1 / (tempC + 273.15) - 1 / (tRef + 273.15)));

export function steamEnthalpy(tInj: number): number {
  const sensible = 4.18 * (tInj - 25);
  const latent = 2257 * Math.pow((374 - Math.min(tInj, 373)) / 274, 0.38);
  return (sensible + 0.8 * latent) / 1000;
}

export interface Risk { floating: number; overload: number; pound: number; total: number }
export function rodFailureRisk(rodLoad: number, spm: number, stroke: number, mu: number, tubingP = 6, vfd?: number, fluidLevel?: number): Risk {
  const strokeM = stroke * 0.0254;
  const vPeak = 1.57 * 2 * strokeM * spm / 60;
  const alpha = stroke * spm * spm / 70500;
  const drag = 0.22 * Math.sqrt(Math.max(mu, 1)) * vPeak;
  const floatRatio = drag / (22 * (1 - alpha));
  const floating = 100 * sigmoid(9 * (floatRatio - 0.62));
  const mismatch = vfd === undefined ? 0 : Math.abs(vfd - SPM_TO_HZ * spm) / 20;
  const loadRatio = (rodLoad + 0.05 * tubingP) / 46;
  const overload = 100 * sigmoid(10 * (loadRatio + 0.03 * mismatch - 1.0));
  const pound = fluidLevel === undefined ? 0 : 100 * sigmoid((70 - fluidLevel) / 20) * 0.5;
  const total = 100 * (1 - (1 - floating / 100) * (1 - overload / 100) * (1 - pound / 100));
  return { floating, overload, pound, total };
}
export const riskLevel = (pct: number) => (pct >= 60 ? "HIGH" : pct >= 30 ? "MEDIUM" : "LOW") as "HIGH" | "MEDIUM" | "LOW";

export function rodLoads(w: WellDef, stroke: number, spm: number, mu: number, fluidLevel: number) {
  const ap = Math.PI * Math.pow(w.plunger_dia_in * 0.0254, 2) / 4;
  const strokeM = stroke * 0.0254;
  const alpha = stroke * spm * spm / 70500;
  const vPeak = 1.57 * 2 * strokeM * spm / 60;
  const wRod = w.rod_weight_kn;
  const fFluid = ap * RHO_OIL * G * Math.max(w.depth - fluidLevel, 0) / 1000;
  const drag = 0.22 * Math.sqrt(Math.max(mu, 1)) * vPeak * (w.depth / 900);
  const peak = wRod * (1 + alpha) + fFluid + 0.3 * drag;
  const minimum = wRod * (1 - alpha) - drag;
  return { ap, strokeM, alpha, peak, minimum, pumpLoad: fFluid + 0.3 * drag, drag, fFluid };
}

export interface SrpState {
  oil_rate: number; fluid_rate: number; pump_capacity: number; fillage: number; pump_efficiency: number;
  system_efficiency: number; electrical_kw: number; kwh_per_day: number; rod_load: number; min_rod_load: number;
  pump_load: number; floating_risk: number; overload_risk: number; failure_risk: number; allowable: number; load_ratio: number;
}

export function srpState(w: WellDef, stroke: number, spm: number, vfd: number, fluidLevel: number, mu: number,
  pRes?: number, oilCut = 0.6, muInflow?: number): SrpState {
  const pr = pRes ?? w.reservoir_pressure;
  const L = rodLoads(w, stroke, spm, mu, fluidLevel);
  const cap = L.ap * L.strokeM * spm * 1440 * 0.88;
  const pwf = w.tubing_pressure * 0.4 + 2 + fluidLevel * RHO_OIL * G / 1e5;
  const inflow = w.pi * Math.max(pr - pwf, 0) * Math.pow(w.oil_viscosity / Math.max(muInflow ?? mu, 1), 0.55);
  const fluid = Math.min(inflow, cap);
  const fillage = cap > 0 ? fluid / cap : 0;
  const oil = fluid * oilCut;
  const hydraulicKw = fluid / 86400 * RHO_OIL * G * Math.max(w.depth - fluidLevel, 0) / 1000;
  const mechKw = (L.fFluid + 0.5 * L.drag + 0.08 * w.rod_weight_kn) * L.strokeM * spm / 60;
  const etaDrive = clamp(0.94 - 0.004 * Math.abs(vfd - SPM_TO_HZ * spm), 0.7, 0.94);
  const elecKw = mechKw / (0.9 * etaDrive);
  const risk = rodFailureRisk(L.peak, spm, stroke, mu, w.tubing_pressure, vfd, fluidLevel);
  return {
    oil_rate: oil, fluid_rate: fluid, pump_capacity: cap, fillage, pump_efficiency: 100 * fillage * 0.88,
    system_efficiency: 100 * hydraulicKw / Math.max(elecKw, 1e-6), electrical_kw: elecKw, kwh_per_day: elecKw * 24,
    rod_load: L.peak, min_rod_load: L.minimum, pump_load: L.pumpLoad, floating_risk: risk.floating,
    overload_risk: risk.overload, failure_risk: risk.total, allowable: w.allowable_kn, load_ratio: L.peak / w.allowable_kn,
  };
}

export interface SeriesPt {
  day: number; temperature: number; viscosity: number; pressure: number; production: number; pump_load: number;
  rod_load: number; fluid_rate: number; failure_risk: number; floating_risk: number; cum_oil: number; sor: number;
}
export interface CssCycle {
  t_inj: number; t_hot: number; frac_penalty: number; cycle_days: number; cycle_oil: number; avg_rate: number;
  peak_rate: number; sor: number; energy_steam: number; energy_pump: number; energy_total: number;
  energy_per_m3: number; avg_risk: number; peak_risk: number; avg_pump_eff: number; max_rod_load: number;
  max_pump_load: number; series: SeriesPt[]; mu_hot: number; mu_cold: number; score: number;
}

export interface CycleOpts { injTemp?: number | null; step?: number; maxDays?: number; wantSeries?: boolean }

export function cssCycle(w: WellDef, css: CssIn, srp: SrpIn, o: CycleOpts = {}): CssCycle {
  const step = o.step ?? 1, maxDays = o.maxDays ?? 720, wantSeries = o.wantSeries ?? false;
  const { steam_volume: V, injection_pressure: P, soak_time: soak, production_cutoff: cutoff } = css;
  const tRes = w.reservoir_temperature, pRes = w.reservoir_pressure, muCold = w.oil_viscosity;
  const tInj = o.injTemp ?? tSat(P);
  const fracPen = P <= w.frac_pressure ? 1 : Math.max(0.55, 1 - 0.025 * (P - w.frac_pressure));
  const hf = 0.80 * (1 - Math.exp(-V / 1300));
  const soakF = 0.55 + 0.45 * Math.max(0, 1 - Math.pow((soak - 12) / 16, 2));
  const tHot = tRes + (tInj - tRes) * hf * soakF * fracPen;
  const tauT = 75 + 0.012 * V;
  const dp0 = 0.30 * Math.max(0, P - pRes) * (1 - Math.exp(-V / 2500)) * fracPen;
  const energySteam = V * steamEnthalpy(tInj);

  const series: SeriesPt[] = [];
  let totalOil = 0, kwh = 0, peakRate = 0, peakRisk = 0, riskSum = 0, n = 0, cycleDays = 0, ended = false;
  let sumEff = 0, maxLoad = 0, maxPump = 0;
  let t = 0;
  while (t < maxDays) {
    const temp = tRes + (tHot - tRes) * Math.exp(-t / tauT);
    const mu = viscosity(temp, muCold, tRes);
    const pNear = pRes + dp0 * Math.exp(-t / 45);
    const oilCut = 0.75 - 0.5 * Math.exp(-t / 40);
    const s = srpState(w, srp.stroke_length, srp.spm, srp.vfd_frequency, srp.fluid_level, mu, pNear, oilCut);
    const rate = s.oil_rate;
    peakRate = Math.max(peakRate, rate);
    if (!ended && t > 8 && rate < cutoff) { ended = true; cycleDays = t; }
    if (wantSeries) {
      series.push({ day: t, temperature: temp, viscosity: mu, pressure: pNear, production: rate, pump_load: s.pump_load,
        rod_load: s.rod_load, fluid_rate: s.fluid_rate, failure_risk: s.failure_risk, floating_risk: s.floating_risk,
        cum_oil: totalOil, sor: totalOil > 1 ? V / totalOil : 0 });
    }
    if (ended && !wantSeries) break;
    if (!ended) {
      totalOil += rate * step; kwh += s.kwh_per_day * step; riskSum += s.failure_risk;
      peakRisk = Math.max(peakRisk, s.failure_risk); sumEff += s.pump_efficiency;
      maxLoad = Math.max(maxLoad, s.rod_load); maxPump = Math.max(maxPump, s.pump_load); n += 1;
    } else if (wantSeries && t > cycleDays + 15) break;
    t += step;
  }
  if (!ended) cycleDays = t;
  totalOil = Math.max(totalOil, 1e-6);
  const sor = V / totalOil;
  const energyPump = kwh * 0.0036;
  const energyTotal = energySteam + energyPump;
  n = Math.max(n, 1);
  return {
    t_inj: tInj, t_hot: tHot, frac_penalty: fracPen, cycle_days: cycleDays, cycle_oil: totalOil,
    avg_rate: totalOil / Math.max(cycleDays, 1), peak_rate: peakRate, sor, energy_steam: energySteam,
    energy_pump: energyPump, energy_total: energyTotal, energy_per_m3: energyTotal / totalOil, avg_risk: riskSum / n,
    peak_risk: peakRisk, avg_pump_eff: sumEff / n, max_rod_load: maxLoad, max_pump_load: maxPump, series,
    mu_hot: viscosity(tHot, muCold, tRes), mu_cold: muCold, score: cssScore(totalOil, sor),
  };
}

export function cssScore(cycleOil: number, sor: number): number {
  const prodNorm = cycleOil / (cycleOil + OIL_REF_M3);
  const sorNorm = clamp(1 - (sor - 1) / 7, 0, 1);
  return 100 * (0.4 * prodNorm + 0.6 * sorNorm);
}

export function optimizeCss(w: WellDef, cutoff: number, srp: SrpIn) {
  let best: [number, number, number, number] | null = null;
  const lim = Math.min(w.frac_pressure, 110);
  for (let v = 1000; v <= 5000; v += 500) {
    for (let p = 50; p <= lim; p += 10) {
      for (let soak = 4; soak <= 24; soak += 2) {
        const c = cssCycle(w, { steam_volume: v, injection_pressure: p, soak_time: soak, production_cutoff: cutoff }, srp, { step: 3 });
        const sc = cssScore(c.cycle_oil, c.sor) - 0.15 * Math.max(c.avg_risk - 30, 0);
        if (best === null || sc > best[0]) best = [sc, v, p, soak];
      }
    }
  }
  return { steam_volume: best![1], injection_pressure: best![2], soak_time: best![3] };
}

export const STROKES = [60, 72, 84, 96, 108, 120, 132, 144, 156, 168];

export function optimizeSrpCycle(w: WellDef, css: CssIn, fluidLevel: number): { stroke_length: number; spm: number; vfd_frequency: number } {
  let best: [number, number, number, number] | null = null;
  for (const stroke of STROKES) {
    for (let k = 4; k <= 20; k++) {
      const spm = k * 0.5;
      const vfd = clamp(SPM_TO_HZ * spm, 30, 60);
      const c = cssCycle(w, css, { stroke_length: stroke, spm, vfd_frequency: vfd, fluid_level: fluidLevel }, { step: 5 });
      const obj = c.cycle_oil - 12 * Math.max(0, c.peak_risk - 35) - 0.02 * c.energy_pump * 1000 / 3.6;
      if (best === null || obj > best[0]) best = [obj, stroke, spm, vfd];
    }
  }
  return { stroke_length: best![1], spm: best![2], vfd_frequency: best![3] };
}

export function optimizeSrp(w: WellDef, fluidLevel: number, mu: number) {
  let best: [number, number, number, number] | null = null;
  let fallback: [number, number, number, number] | null = null;
  for (const stroke of STROKES) {
    for (let k = 4; k <= 20; k++) {
      const spm = k * 0.5;
      const vfd = clamp(SPM_TO_HZ * spm, 30, 60);
      const s = srpState(w, stroke, spm, vfd, fluidLevel, mu);
      const obj = s.oil_rate - 0.02 * s.kwh_per_day - 4 * Math.max(0, 0.7 - s.fillage);
      if (fallback === null || s.failure_risk < fallback[0]) fallback = [s.failure_risk, stroke, spm, vfd];
      if (s.failure_risk <= 30 && s.load_ratio <= 0.9 && (best === null || obj > best[0])) best = [obj, stroke, spm, vfd];
    }
  }
  const pick = best ?? fallback!;
  return { stroke_length: pick[1], spm: pick[2], vfd_frequency: pick[3] };
}

export function avgRateFirstDays(w: WellDef, css: CssIn, srp: SrpIn, days = 90): number {
  const c = cssCycle(w, css, srp, { maxDays: days, wantSeries: true });
  return c.series.reduce((a, r) => a + r.production, 0) / Math.max(c.series.length, 1);
}
