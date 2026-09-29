import { useEffect } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../state/AppState";
import { Button, Card, Delta, Empty, PageHeader, SourceBadge, Stat, AXIS, TOOLTIP, f0, f2 } from "../components/ui";
import { LineChartBox } from "../components/charts";

export default function Energy() {
  const { baseSim, runBaseSim, all, runAll, busy, wellId } = useApp();

  useEffect(() => { if (!baseSim && !busy.baseSim) void runBaseSim(); /* eslint-disable-next-line */ }, [wellId]);

  const b = all?.combined.before, a = all?.combined.after;
  const s = baseSim?.summary;
  const bars = b && a ? [
    { metric: "SOR", Before: b.sor, After: a.sor },
    { metric: "Energy / m³ oil (GJ)", Before: b.energy_per_m3_gj, After: a.energy_per_m3_gj },
  ] : [];

  return (
    <>
      <PageHeader title="Energy & Steam-Oil Ratio" subtitle="Steam energy consumed per cycle and steam-oil ratio (SOR) - baseline settings versus the optimized recommendation."
        right={<div className="flex items-center gap-2"><SourceBadge source={baseSim?.source} />{!all && <Button busy={busy.all} onClick={() => void runAll()}>Run optimization to compare</Button>}</div>} />
      {s ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Baseline SOR" value={f2(s.sor)} tone={s.sor > 3.5 ? "bad" : "neutral"} hint="steam t per m³ oil" />
          <Stat label="Baseline cycle energy" value={f0(s.energy_gj)} unit="GJ" />
          <Stat label="Baseline cycle oil" value={f0(s.cycle_oil_m3)} unit="m³" />
          <Stat label="Baseline energy / m³" value={f2(s.energy_gj / Math.max(s.cycle_oil_m3, 1))} unit="GJ/m³" />
        </div>
      ) : <Empty>{busy.baseSim ? "Running baseline simulation…" : "No data"}</Empty>}

      {b && a && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Optimized vs baseline">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="py-2 text-left">Metric</th><th className="text-right">Before</th><th className="text-right">After</th><th className="text-right">Change</th></tr></thead>
              <tbody>
                {([["SOR", b.sor, a.sor, true], ["Cycle energy (GJ)", b.energy_gj, a.energy_gj, true], ["Energy per m³ oil (GJ)", b.energy_per_m3_gj, a.energy_per_m3_gj, true], ["Cycle oil (m³)", b.cycle_oil_m3, a.cycle_oil_m3, false]] as [string, number, number, boolean][]).map(([l, x, y, lower]) => (
                  <tr key={l} className="border-t border-ink-700"><td className="py-2 text-slate-300">{l}</td><td className="text-right tabular-nums">{f2(x)}</td><td className="text-right font-semibold tabular-nums text-white">{f2(y)}</td><td className="text-right"><Delta before={x} after={y} lowerIsBetter={lower} /></td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">Total cycle energy can rise with a larger steam slug; the relevant efficiency measures are SOR and energy per m³ of oil.</p>
          </Card>
          <Card title="SOR and energy intensity">
            <div style={{ height: 240 }} className="min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#22314f" strokeDasharray="3 3" />
                  <XAxis dataKey="metric" {...AXIS} /><YAxis {...AXIS} />
                  <Tooltip {...TOOLTIP} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Before" fill="#94a3b8" isAnimationActive animationDuration={1100} animationEasing="ease-out" /><Bar dataKey="After" fill="#f59e0b" isAnimationActive animationDuration={1100} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {baseSim && (
        <Card title="Baseline cumulative SOR over the cycle" className="mt-4">
          <LineChartBox data={baseSim.series.filter((p) => p.sor > 0)} xKey="day" xLabel="day" series={[{ key: "sor", name: "Cumulative SOR", color: "#fbbf24" }, { key: "cum_oil", name: "Cumulative oil (m³)", color: "#38bdf8", yAxis: "right" }]} />
        </Card>
      )}
    </>
  );
}
