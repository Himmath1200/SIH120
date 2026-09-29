import { useEffect, useState } from "react";
import { useApp } from "../state/AppState";
import { getWellHistory, useApiStatus } from "../services/api";
import type { HistoryPoint } from "../types";
import { Card, PageHeader, f0, f1, f2, riskTone } from "../components/ui";
import { LineChartBox } from "../components/charts";

export default function WellMonitoring() {
  const { wellId, wells, setWellId } = useApp();
  const status = useApiStatus();
  const [h, setH] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    let alive = true;
    getWellHistory(wellId, 90).then((x) => alive && setH(x)).catch(() => undefined);
    return () => { alive = false; };
  }, [wellId, status.backend, status.forcedDemo]);

  return (
    <>
      <PageHeader title={`Well Monitoring - ${wellId}`} subtitle="Simulated 90-day monitoring history for the selected well and a fleet overview." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Oil viscosity (cP, log scale)"><LineChartBox data={h} xKey="day" xLabel="day" logY series={[{ key: "viscosity", name: "Viscosity", color: "#f87171" }]} /></Card>
        <Card title="Near-wellbore temperature (°C)"><LineChartBox data={h} xKey="day" xLabel="day" series={[{ key: "temperature", name: "Temperature", color: "#34d399" }]} /></Card>
        <Card title="Oil & fluid rate (m³/d)"><LineChartBox data={h} xKey="day" xLabel="day" series={[{ key: "oil_rate", name: "Oil", color: "#f59e0b" }, { key: "fluid_rate", name: "Fluid", color: "#38bdf8" }]} /></Card>
        <Card title="Rod & pump load (kN)"><LineChartBox data={h} xKey="day" xLabel="day" series={[{ key: "rod_load", name: "Peak rod load", color: "#a78bfa" }, { key: "pump_load", name: "Pump load", color: "#94a3b8" }]} /></Card>
      </div>

      <Card title="All wells (baseline, synthetic)" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2 text-left">Well</th><th className="text-right">Depth (m)</th><th className="text-right">Viscosity (cP)</th>
                <th className="text-right">Oil (m³/cycle)</th><th className="text-right">SOR</th><th className="text-right">Rod float risk</th><th className="text-right">Energy (GJ)</th>
              </tr>
            </thead>
            <tbody>
              {wells.map((w) => (
                <tr key={w.id} onClick={() => setWellId(w.id)} className={`cursor-pointer border-t border-ink-700 hover:bg-ink-800 ${w.id === wellId ? "bg-ink-800" : ""}`}>
                  <td className="py-2 font-semibold text-white">{w.id}</td>
                  <td className="text-right tabular-nums">{f0(w.depth_m)}</td>
                  <td className="text-right tabular-nums">{f0(w.current_viscosity)}</td>
                  <td className="text-right tabular-nums">{f0(w.kpi.cycle_oil_m3)}</td>
                  <td className="text-right tabular-nums">{f2(w.kpi.sor)}</td>
                  <td className={`text-right font-semibold tabular-nums ${{ good: "text-emerald-400", warn: "text-amber-400", bad: "text-red-400", neutral: "" }[riskTone(w.kpi.rod_floating_risk)]}`}>{f1(w.kpi.rod_floating_risk)}%</td>
                  <td className="text-right tabular-nums">{f0(w.kpi.energy_gj)}</td>
                </tr>
              ))}
              {!wells.length && <tr><td colSpan={7} className="py-6 text-center text-slate-500">Loading wells…</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
