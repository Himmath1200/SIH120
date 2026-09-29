import { useApp } from "../state/AppState";
import { Button, Card, Empty, NumberField, PageHeader, SourceBadge, Stat, f0, f1, f2 } from "../components/ui";
import { LineChartBox } from "../components/charts";

export default function CssOptimization() {
  const { params, setParams, css, runCss, busy } = useApp();
  const rec = css?.recommended;
  return (
    <>
      <PageHeader title="CSS Optimization" subtitle="Searches steam volume, injection pressure and soak time (within fracture-pressure limits) for the best production / SOR trade-off."
        right={<SourceBadge source={css?.source} />} />
      <div className="grid gap-4 xl:grid-cols-4">
        <Card title="Current CSS settings" className="xl:col-span-1">
          <div className="space-y-4">
            <NumberField label="Steam volume" value={params.steam_volume} onChange={(v) => setParams({ steam_volume: v })} min={500} max={6000} step={100} unit="t" />
            <NumberField label="Injection pressure" value={params.injection_pressure} onChange={(v) => setParams({ injection_pressure: v })} min={40} max={140} step={1} unit="bar" />
            <NumberField label="Soak time" value={params.soak_time} onChange={(v) => setParams({ soak_time: v })} min={1} max={30} step={1} unit="days" />
            <NumberField label="Production cut-off" value={params.production_cutoff} onChange={(v) => setParams({ production_cutoff: v })} min={1} max={8} step={0.5} unit="m³/d" />
            <Button busy={busy.css || busy.all} onClick={() => void runCss()} className="w-full">Optimize CSS</Button>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-3">
          {css && rec ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Predicted production" value={f0(css.predicted_production_m3)} unit="m³/cycle" tone="good" hint={`${css.production_improvement_pct >= 0 ? "+" : ""}${f1(css.production_improvement_pct)}% vs current`} />
                <Stat label="Predicted SOR" value={f2(css.predicted_sor)} tone="good" hint={`current ${f2(css.baseline.sor)}`} />
                <Stat label="Energy consumption" value={f0(css.energy_consumption_gj)} unit="GJ" hint={`${f2(css.optimized.energy_per_m3_gj)} GJ/m³ oil`} />
                <Stat label="Optimization score" value={f1(css.optimization_score)} unit="/100" hint={`current ${f1(css.baseline.score)}`} />
              </div>
              <Card title="Recommended CSS settings">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="py-2 text-left">Parameter</th><th className="text-right">Current</th><th className="text-right">Recommended</th></tr></thead>
                  <tbody>
                    {[["Steam volume (t)", params.steam_volume, rec.steam_volume], ["Injection pressure (bar)", params.injection_pressure, rec.injection_pressure], ["Soak time (days)", params.soak_time, rec.soak_time]].map(([l, a, b]) => (
                      <tr key={l as string} className="border-t border-ink-700"><td className="py-2 text-slate-300">{l}</td><td className="text-right tabular-nums">{f0(a as number)}</td><td className="text-right font-bold tabular-nums text-amber-400">{f0(b as number)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <Button variant="ghost" className="mt-3" onClick={() => setParams({ ...rec })}>Apply recommended settings</Button>
              </Card>
              <Card title="Oil rate over the cycle (m³/d)">
                <LineChartBox data={css.curve} xKey="day" xLabel="days after steam injection"
                  series={[{ key: "baseline", name: "Current settings", color: "#94a3b8", dashed: true }, { key: "optimized", name: "Recommended", color: "#f59e0b" }]} />
              </Card>
            </>
          ) : <Empty>{busy.css || busy.all ? "Optimizing…" : "Press “Optimize CSS” to search for recommended settings."}</Empty>}
        </div>
      </div>
    </>
  );
}
