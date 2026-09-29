import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "../services/api";
import * as ph from "../engine/physics";
import type {
  AllResult, CSSResult, FailureInput, FailureResult, OperatingPoint, ProductionInput, ProductionResult,
  SimulationResult, SRPResult, WellSummary,
} from "../types";

export const DEFAULT_WELL = "WB-101";

export type Params = OperatingPoint & { oil_viscosity: number; injection_temperature?: number | null };

export function paramsFromWell(id: string): Params {
  const w = ph.getWell(id);
  return { ...ph.wellCss(w), ...ph.wellSrp(w), oil_viscosity: w.current_viscosity };
}

export function prodInputFromWell(id: string, p: Params): ProductionInput {
  const w = ph.getWell(id);
  return { steam_volume: p.steam_volume, injection_pressure: p.injection_pressure, soak_time: p.soak_time,
    reservoir_temperature: w.reservoir_temperature, reservoir_pressure: w.reservoir_pressure, oil_viscosity: w.oil_viscosity,
    spm: p.spm, stroke_length: p.stroke_length, vfd_frequency: p.vfd_frequency };
}

/** Temperature (deg C) at which the reservoir oil has viscosity `mu` (inverse of the Arrhenius law). */
function tempForViscosity(w: ph.WellDef, mu: number) {
  return 1 / (1 / (w.reservoir_temperature + 273.15) + Math.log(mu / w.oil_viscosity) / 4200) - 273.15;
}

export function failInputFromWell(id: string, p: Params): FailureInput {
  const w = ph.getWell(id);
  const s = ph.srpState(w, p.stroke_length, p.spm, p.vfd_frequency, p.fluid_level, p.oil_viscosity);
  const r = (x: number, n = 1) => Math.round(x * 10 ** n) / 10 ** n;
  return { rod_load: r(s.rod_load), spm: p.spm, stroke_length: p.stroke_length, vfd_frequency: p.vfd_frequency,
    fluid_level: p.fluid_level, pump_load: r(s.pump_load), oil_viscosity: p.oil_viscosity,
    reservoir_temperature: r(tempForViscosity(w, p.oil_viscosity), 0), tubing_pressure: w.tubing_pressure, production: r(s.oil_rate, 2) };
}

interface Ctx {
  wells: WellSummary[];
  wellId: string;
  well?: WellSummary;
  setWellId: (id: string) => void;
  params: Params;
  setParams: (p: Partial<Params>) => void;
  resetParams: () => void;
  prodInput: ProductionInput; setProdInput: (p: Partial<ProductionInput>) => void;
  failInput: FailureInput; setFailInput: (p: Partial<FailureInput>) => void;
  css?: CSSResult; srp?: SRPResult; all?: AllResult; sim?: SimulationResult; baseSim?: SimulationResult;
  prod?: ProductionResult; fail?: FailureResult;
  busy: Record<string, boolean>;
  runCss: () => Promise<CSSResult | undefined>;
  runSrp: () => Promise<SRPResult | undefined>;
  runAll: () => Promise<AllResult | undefined>;
  runSim: (p?: Params) => Promise<SimulationResult | undefined>;
  runBaseSim: () => Promise<SimulationResult | undefined>;
  runProduction: (i?: ProductionInput) => Promise<ProductionResult | undefined>;
  runFailure: (i?: FailureInput) => Promise<FailureResult | undefined>;
  /** Copy the optimiser's recommended settings into the operating parameters and forms. */
  applyRecommended: (all: AllResult) => { params: Params; prod: ProductionInput; fail: FailureInput };
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [wells, setWells] = useState<WellSummary[]>([]);
  const [wellId, setWellIdState] = useState(DEFAULT_WELL);
  const [params, setParamsState] = useState<Params>(() => paramsFromWell(DEFAULT_WELL));
  const [prodInput, setProdState] = useState<ProductionInput>(() => prodInputFromWell(DEFAULT_WELL, paramsFromWell(DEFAULT_WELL)));
  const [failInput, setFailState] = useState<FailureInput>(() => failInputFromWell(DEFAULT_WELL, paramsFromWell(DEFAULT_WELL)));
  const [css, setCss] = useState<CSSResult>();
  const [srp, setSrp] = useState<SRPResult>();
  const [all, setAll] = useState<AllResult>();
  const [sim, setSim] = useState<SimulationResult>();
  const [baseSim, setBaseSim] = useState<SimulationResult>();
  const [prod, setProd] = useState<ProductionResult>();
  const [fail, setFail] = useState<FailureResult>();
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // latest values for async actions
  const ref = useRef({ wellId, params, prodInput, failInput });
  ref.current = { wellId, params, prodInput, failInput };

  useEffect(() => {
    let alive = true;
    api.getWells().then((w) => alive && setWells(w)).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const clearResults = () => { setCss(undefined); setSrp(undefined); setAll(undefined); setSim(undefined); setBaseSim(undefined); setProd(undefined); setFail(undefined); };

  const loadBaseline = useCallback((id: string) => {
    const p = paramsFromWell(id);
    setParamsState(p);
    setProdState(prodInputFromWell(id, p));
    setFailState(failInputFromWell(id, p));
  }, []);

  const setWellId = useCallback((id: string) => { setWellIdState(id); loadBaseline(id); clearResults(); }, [loadBaseline]);
  const resetParams = useCallback(() => { loadBaseline(ref.current.wellId); clearResults(); }, [loadBaseline]);
  const setParams = useCallback((p: Partial<Params>) => setParamsState((s) => ({ ...s, ...p })), []);
  const setProdInput = useCallback((p: Partial<ProductionInput>) => setProdState((s) => ({ ...s, ...p })), []);
  const setFailInput = useCallback((p: Partial<FailureInput>) => setFailState((s) => ({ ...s, ...p })), []);

  async function track<T>(key: string, fn: () => Promise<T>, set: (v: T) => void): Promise<T | undefined> {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const v = await fn();
      set(v);
      return v;
    } catch (e) {
      api.pushToast("warn", e instanceof Error ? e.message : "Request failed.");
      return undefined;
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  const value = useMemo<Ctx>(() => {
    const cssReq = () => { const { wellId, params: p } = ref.current; return { well_id: wellId, steam_volume: p.steam_volume, injection_pressure: p.injection_pressure, soak_time: p.soak_time, production_cutoff: p.production_cutoff }; };
    const srpReq = () => { const { wellId, params: p } = ref.current; return { well_id: wellId, stroke_length: p.stroke_length, spm: p.spm, vfd_frequency: p.vfd_frequency, fluid_level: p.fluid_level, oil_viscosity: p.oil_viscosity }; };
    const simReq = (p: Params) => ({ well_id: ref.current.wellId, steam_volume: p.steam_volume, injection_pressure: p.injection_pressure, soak_time: p.soak_time,
      spm: p.spm, stroke_length: p.stroke_length, vfd_frequency: p.vfd_frequency, production_cutoff: p.production_cutoff, fluid_level: p.fluid_level, temperature: p.injection_temperature ?? null });

    return {
      wells, wellId, well: wells.find((w) => w.id === wellId), setWellId, params, setParams, resetParams,
      prodInput, setProdInput, failInput, setFailInput, css, srp, all, sim, baseSim, prod, fail, busy,
      runCss: () => track("css", () => api.optimizeCSS(cssReq()), setCss),
      runSrp: () => track("srp", () => api.optimizeSRP(srpReq()), setSrp),
      runAll: () => track("all", () => api.optimizeAll({ ...cssReq(), ...srpReq() }), (r) => { setAll(r); setCss(r.css); setSrp(r.srp); }),
      runSim: (p) => track("sim", () => api.runSimulation(simReq(p ?? ref.current.params)), setSim),
      runBaseSim: () => track("baseSim", () => api.runSimulation(simReq(paramsFromWell(ref.current.wellId))), setBaseSim),
      runProduction: (i) => track("prod", () => api.predictProduction(i ?? ref.current.prodInput), setProd),
      runFailure: (i) => track("fail", () => api.predictFailure(i ?? ref.current.failInput), setFail),
      applyRecommended: (a) => {
        const { wellId, params: p0 } = ref.current;
        const p: Params = { ...p0, ...a.css.recommended, ...a.srp.recommended };
        const prodI = prodInputFromWell(wellId, p);
        const failI = failInputFromWell(wellId, p);
        setParamsState(p); setProdState(prodI); setFailState(failI);
        return { params: p, prod: prodI, fail: failI };
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wells, wellId, params, prodInput, failInput, css, srp, all, sim, baseSim, prod, fail, busy, setWellId, setParams, resetParams, setProdInput, setFailInput]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
