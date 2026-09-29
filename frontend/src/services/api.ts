/**
 * Centralised API service. Every backend call in the app goes through here.
 *
 * Behaviour:
 *  - Base URL comes from VITE_API_URL (never hard-coded).
 *  - If the backend is unreachable, the call transparently falls back to the local deterministic
 *    engine (src/engine) and the app switches to DEMO SIMULATION MODE. Results are tagged with
 *    `source: "demo-local"` so the UI never pretends they came from the backend.
 *  - A background health poll switches back to the live API automatically when it recovers.
 */
import { useSyncExternalStore } from "react";
import * as demo from "../engine/demo";
import type {
  AllResult, CSSResult, Dashboard, FailureInput, FailureResult, FleetResult, Health, HistoryPoint, OperatingPoint,
  ProductionInput, ProductionResult, SimulationInput, SimulationResult, SRPResult, WellSummary,
} from "../types";

export const API_URL: string = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").trim().replace(/\/+$/, "");
export const BACKEND_UNAVAILABLE = "Backend connection unavailable.";

const HEALTH_TIMEOUT_MS = 8000;
const CALL_TIMEOUT_MS = 20000;
const POLL_MS = 15000;

export type BackendState = "checking" | "online" | "offline";
export interface ApiStatus { backend: BackendState; forcedDemo: boolean; configured: boolean }
export interface Toast { id: number; kind: "info" | "warn" | "ok"; text: string }

// ---------------------------------------------------------------- tiny external store
let status: ApiStatus = { backend: API_URL ? "checking" : "offline", forcedDemo: false, configured: !!API_URL };
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function setStatus(p: Partial<ApiStatus>) { status = { ...status, ...p }; emit(); }
export function pushToast(kind: Toast["kind"], text: string) {
  const t = { id: Date.now() + Math.random(), kind, text };
  toasts = [...toasts.filter((x) => x.text !== text), t].slice(-3);
  emit();
  setTimeout(() => dismissToast(t.id), 6000);
}
export function dismissToast(id: number) { toasts = toasts.filter((t) => t.id !== id); emit(); }

export const useApiStatus = () => useSyncExternalStore(subscribe, () => status);
export const useToasts = () => useSyncExternalStore(subscribe, () => toasts);
export const isDemoActive = (s: ApiStatus) => s.forcedDemo || s.backend !== "online";

// ---------------------------------------------------------------- low level
export class ApiError extends Error {}

async function http<T>(path: string, init?: RequestInit, timeout = CALL_TIMEOUT_MS): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init, signal: ctl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) {
        let detail = `Request rejected (${res.status})`;
        try { const j = await res.json(); if (typeof j.detail === "string") detail = j.detail; } catch { /* ignore */ }
        throw new ApiError(detail);
      }
      throw new Error(`Server error ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(path: string, body: unknown) => http<T>(path, { method: "POST", body: JSON.stringify(body) });

// ---------------------------------------------------------------- health / mode
let firstCheck: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | undefined;

export async function healthCheck(): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const h = await http<Health>("/api/health", undefined, HEALTH_TIMEOUT_MS);
    return h.status === "ok";
  } catch {
    return false;
  }
}

async function runCheck() {
  const ok = await healthCheck();
  const was = status.backend;
  if (ok && was !== "online") {
    setStatus({ backend: "online" });
    if (was === "offline") pushToast("ok", "Backend is back online.");
  } else if (!ok && was !== "offline") {
    setStatus({ backend: "offline" });
    pushToast("warn", `${BACKEND_UNAVAILABLE} Using DEMO SIMULATION MODE.`);
  }
}

/** Start health checking (called once from main.tsx). */
export function initApi() {
  if (firstCheck) return;
  firstCheck = runCheck();
  pollTimer = setInterval(() => { if (!document.hidden) void runCheck(); }, POLL_MS);
  window.addEventListener("beforeunload", () => clearInterval(pollTimer));
}

export function switchToDemo() { setStatus({ forcedDemo: true }); pushToast("info", "DEMO SIMULATION MODE enabled."); }
export async function switchToLive() {
  setStatus({ forcedDemo: false, backend: API_URL ? "checking" : "offline" });
  await runCheck();
  if (status.backend !== "online") pushToast("warn", `${BACKEND_UNAVAILABLE} Staying in DEMO SIMULATION MODE.`);
}

async function callApi<T>(remote: () => Promise<T>, local: () => T): Promise<T> {
  if (status.forcedDemo || !API_URL) return local();
  if (status.backend === "checking" && firstCheck) await firstCheck;
  if (status.backend !== "online") return local();
  try {
    return await remote();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    setStatus({ backend: "offline" });
    pushToast("warn", `${BACKEND_UNAVAILABLE} Switched to DEMO SIMULATION MODE.`);
    return local();
  }
}

// ---------------------------------------------------------------- endpoints
export const getWells = () => callApi<WellSummary[]>(() => http("/api/wells"), demo.listWells);

export const getWellDashboard = (wellId: string) =>
  callApi<Dashboard>(() => http(`/api/dashboard/${encodeURIComponent(wellId)}`), () => demo.dashboard(wellId));

export const getWellHistory = (wellId: string, days = 90) =>
  callApi<HistoryPoint[]>(() => http(`/api/wells/${encodeURIComponent(wellId)}/history?days=${days}`), () => demo.history(wellId, days));

export const predictProduction = (data: ProductionInput) =>
  callApi<ProductionResult>(() => post("/api/predict/production", data), () => demo.predictProduction(data));

export const predictFailure = (data: FailureInput) =>
  callApi<FailureResult>(() => post("/api/predict/failure", data), () => demo.predictFailure(data));

export type CssRequest = { well_id: string } & Pick<OperatingPoint, "steam_volume" | "injection_pressure" | "soak_time" | "production_cutoff">;
export const optimizeCSS = (data: CssRequest) =>
  callApi<CSSResult>(() => post("/api/optimize/css", data), () => demo.optimizeCSS(data));

export type SrpRequest = { well_id: string; oil_viscosity: number } & Pick<OperatingPoint, "stroke_length" | "spm" | "vfd_frequency" | "fluid_level">;
export const optimizeSRP = (data: SrpRequest) =>
  callApi<SRPResult>(() => post("/api/optimize/srp", data), () => demo.optimizeSRP(data));

export type AllRequest = CssRequest & SrpRequest;
export const optimizeAll = (data: AllRequest) =>
  callApi<AllResult>(() => post("/api/optimize/all", data), () => demo.optimizeAll(data));

export const runSimulation = (data: SimulationInput) =>
  callApi<SimulationResult>(() => post("/api/simulation/run", data), () => demo.simulate(data));

export const getFleet = () => callApi<FleetResult>(() => http("/api/analytics/fleet"), demo.fleet);
