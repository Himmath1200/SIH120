import { useEffect, useState } from "react";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { useApp } from "../state/AppState";
import { API_URL, getWellDashboard, isDemoActive, switchToDemo, switchToLive, useApiStatus } from "../services/api";
import type { Dashboard as Dash } from "../types";
import { Button, Card, PageHeader, SourceBadge, Stat, f0, f1, f2, riskTone } from "../components/ui";
import { LineChartBox } from "../components/charts";
import BeforeAfter from "../components/BeforeAfter";
import Hero from "../components/Hero";
import Telemetry from "../components/Telemetry";
import WellTwin from "../components/WellTwin";
import Gauge from "../components/Gauge";
import { exportReport } from "../components/exportReport";

export default function Dashboard() {
  const { wellId, all, runAll, busy } = useApp();
  const status = useApiStatus();
  const [d, setD] = useState<Dash>();

  useEffect(() => {
    let alive = true;
    setD(undefined);
    getWellDashboard(wellId).then((x) => alive && setD(x)).catch(() => undefined);
    return () => { alive = false; };
  }, [wellId, status.backend, status.forcedDemo]);

  const k = d?.kpi;
  const level = k ? (k.rod_floating_risk >= 60 ? "HIGH" : k.rod_floating_risk >= 30 ? "MEDIUM" : "LOW") : "";
  const demo = isDemoActive(status);

  return (
    <>
      <Hero wellId={wellId} />
      <PageHeader title={`Well Dashboard - ${wellId}`}
        subtitle="Baseline (pre-optimization) condition of a heavy-oil CSS/SRP well. All values are synthetic and model-generated."
        right={<div className="flex items-center gap-2"><SourceBadge source={d?.source} /><Button busy={busy.all} onClick={() => void runAll()}>Optimize this well</Button></div>} />

      <Telemetry kpi={k} />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Digital twin - live well schematic" className="lg:col-span-2 !p-2">
          <div className="h-64"><WellTwin spm={d?.well.baseline.spm ?? 6} hot={k?.hot_temperature_c ?? 100} risk={k?.rod_floating_risk ?? 0} /></div>
        </Card>
        <Card title="Rod floating risk" right={<Button variant="ghost" className="!px-3 !py-1 text-xs" onClick={() => exportReport(wellId, k, all)}>Export CSV</Button>}>
          <div className="flex flex-col items-center justify-center py-2">
            <Gauge value={k?.rod_floating_risk ?? 0} size={240} />
            <div className="-mt-4 text-3xl font-extrabold tabular-nums text-white">{k ? `${f0(k.rod_floating_risk)}%` : "-"}</div>
            <div className="text-xs uppercase tracking-widest text-slate-400">{level || "…"}</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Oil rate (now)" value={k ? f1(k.oil_rate_m3d) : "-"} unit="m³/d" />
        <Stat label="Oil viscosity" value={k ? f0(k.viscosity_cp) : "-"} unit="cP" tone={k && k.viscosity_cp > 1500 ? "warn" : "neutral"} />
        <Stat label="Steam-oil ratio" value={k ? f2(k.sor) : "-"} tone={k && k.sor > 3.5 ? "bad" : "neutral"} />
        <Stat label="Rod floating risk" value={k ? `${f0(k.rod_floating_risk)}%` : "-"} tone={k ? riskTone(k.rod_floating_risk) : "neutral"} hint={level} />
        <Stat label="Cycle energy" value={k ? f0(k.energy_gj) : "-"} unit="GJ" />
        <Stat label="Pump fillage eff." value={k ? f1(k.pump_efficiency) : "-"} unit="%" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Backend status" className="xl:col-span-1">
          <div className={`rounded-lg p-4 text-center text-lg font-bold ${demo ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>
            {status.backend === "checking" && !status.forcedDemo ? "Connecting…" : demo ? "🟡 DEMO MODE" : "🟢 API ONLINE"}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            {demo
              ? "Everything is computed by the built-in deterministic simulation. Nothing on this page depends on a server."
              : "Live results come from the FastAPI backend (trained ML + physics)."}
          </p>
          <p className="mt-2 break-all text-xs text-slate-500">API: {API_URL || "not configured (VITE_API_URL empty)"}</p>
          <div className="mt-3">
            {demo ? (API_URL && <Button variant="ghost" onClick={() => void switchToLive()}>Try live API</Button>) : <Button variant="ghost" onClick={switchToDemo}>Switch to Demo Mode</Button>}
          </div>
        </Card>

        <Card title="Alerts" className="xl:col-span-2">
          <ul className="space-y-2">
            {d?.alerts.map((a, i) => (
              <li key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${a.severity === "critical" ? "border-red-500/40 bg-red-500/10 text-red-200" : a.severity === "warning" ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-ink-600 bg-ink-800 text-slate-300"}`}>
                {a.severity === "critical" ? <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" /> : a.severity === "warning" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
                {a.message}
              </li>
            )) ?? <li className="text-sm text-slate-500">Loading…</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Oil rate & fluid rate - last 90 producing days (m³/d)">
          <LineChartBox data={d?.history ?? []} xKey="day" xLabel="day"
            series={[{ key: "oil_rate", name: "Oil", color: "#f59e0b" }, { key: "fluid_rate", name: "Fluid", color: "#38bdf8" }]} />
        </Card>
        <Card title="Oil viscosity (cP, log) & near-wellbore temperature (°C)">
          <LineChartBox data={d?.history ?? []} xKey="day" xLabel="day" logY
            series={[{ key: "viscosity", name: "Viscosity (cP)", color: "#f87171" }, { key: "temperature", name: "Temperature (°C)", color: "#34d399" }]} />
        </Card>
      </div>

      {all && <div className="mt-4"><BeforeAfter all={all} /></div>}
    </>
  );
}
