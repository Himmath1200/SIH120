import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../state/AppState";
import { getFleet, useApiStatus } from "../services/api";
import type { FleetResult } from "../types";
import { Card, Empty, PageHeader, SourceBadge, AXIS, TOOLTIP, f0, f1, f2 } from "../components/ui";
import BeforeAfter from "../components/BeforeAfter";

function Compare({ data, title }: { data: { name: string; Before: number; After: number }[]; title: string }) {
  return (
    <Card title={title}>
      <div style={{ height: 250 }} className="min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#22314f" strokeDasharray="3 3" />
            <XAxis dataKey="name" {...AXIS} /><YAxis {...AXIS} />
            <Tooltip {...TOOLTIP} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Before" fill="#94a3b8" isAnimationActive animationDuration={1100} animationEasing="ease-out" /><Bar dataKey="After" fill="#f59e0b" isAnimationActive animationDuration={1100} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function Analytics() {
  const { all } = useApp();
  const status = useApiStatus();
  const [fleet, setFleet] = useState<FleetResult>();

  useEffect(() => {
    let alive = true;
    setFleet(undefined);
    getFleet().then((x) => alive && setFleet(x)).catch(() => undefined);
    return () => { alive = false; };
  }, [status.backend, status.forcedDemo]);

  const rows = fleet?.wells ?? [];
  const mk = (pick: (s: FleetResult["wells"][number]["before"]) => number) =>
    rows.map((w) => ({ name: w.well_id, Before: pick(w.before), After: pick(w.after) }));

  return (
    <>
      <PageHeader title="Analytics" subtitle="Fleet-wide comparison of current operating settings versus the optimizer's recommendation for each synthetic well."
        right={<SourceBadge source={fleet?.source} />} />
      {all && <div className="mb-4"><BeforeAfter all={all} /></div>}
      {fleet ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Compare title="Cycle oil production (m³)" data={mk((s) => s.cycle_oil_m3)} />
            <Compare title="Steam-oil ratio" data={mk((s) => s.sor)} />
            <Compare title="Energy per m³ of oil (GJ)" data={mk((s) => s.energy_per_m3_gj)} />
            <Compare title="Rod floating risk (%)" data={mk((s) => s.rod_risk)} />
          </div>
          <Card title="Fleet table" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr><th className="py-2 text-left">Well</th><th className="text-right">Oil before → after (m³)</th><th className="text-right">SOR before → after</th><th className="text-right">Rod risk before → after (%)</th><th className="text-right">Score</th></tr>
                </thead>
                <tbody>
                  {rows.map((w) => (
                    <tr key={w.well_id} className="border-t border-ink-700">
                      <td className="py-2 font-semibold text-white">{w.well_id}</td>
                      <td className="text-right tabular-nums">{f0(w.before.cycle_oil_m3)} → <b className="text-white">{f0(w.after.cycle_oil_m3)}</b></td>
                      <td className="text-right tabular-nums">{f2(w.before.sor)} → <b className="text-white">{f2(w.after.sor)}</b></td>
                      <td className="text-right tabular-nums">{f1(w.before.rod_risk)} → <b className="text-white">{f1(w.after.rod_risk)}</b></td>
                      <td className="text-right tabular-nums">{f1(w.before.score)} → <b className="text-white">{f1(w.after.score)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">Synthetic, model-generated scenarios - not field measurements.</p>
          </Card>
        </>
      ) : <Empty>Computing fleet analytics…</Empty>}
    </>
  );
}
