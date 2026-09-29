import { useApp } from "../state/AppState";
import { Button, Card, Empty, NumberField, PageHeader, RiskBadge, SourceBadge, Stat, f0, f1, riskTone } from "../components/ui";
import { LineChartBox } from "../components/charts";

export default function SrpOptimization() {
  const { params, setParams, srp, runSrp, busy } = useApp();
  const b = srp?.baseline, o = srp?.optimized, rec = srp?.recommended;
  return (
    <>
      <PageHeader title="SRP Optimization" subtitle="Chooses stroke length, SPM and VFD frequency that maximise oil rate while keeping rod-floating risk and rod load within limits."
        right={<SourceBadge source={srp?.source} />} />
      <div className="grid gap-4 xl:grid-cols-4">
        <Card title="Current SRP settings" className="xl:col-span-1">
          <div className="space-y-4">
            <NumberField label="Stroke length" value={params.stroke_length} onChange={(v) => setParams({ stroke_length: v })} min={48} max={192} step={6} unit="in" />
            <NumberField label="SPM" value={params.spm} onChange={(v) => setParams({ spm: v })} min={2} max={12} step={0.5} />
            <NumberField label="VFD frequency" value={params.vfd_frequency} onChange={(v) => setParams({ vfd_frequency: v })} min={30} max={60} step={1} unit="Hz" />
            <NumberField label="Fluid level above pump" value={params.fluid_level} onChange={(v) => setParams({ fluid_level: v })} min={20} max={450} step={10} unit="m" />
            <NumberField label="Oil viscosity at pump" value={params.oil_viscosity} onChange={(v) => setParams({ oil_viscosity: v })} min={50} max={5000} step={50} unit="cP" />
            <Button busy={busy.srp || busy.all} onClick={() => void runSrp()} className="w-full">Optimize SRP</Button>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-3">
          {srp && b && o && rec ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Recommended stroke" value={f0(rec.stroke_length)} unit="in" tone="good" hint={`current ${f0(b.stroke_length)}`} />
                <Stat label="Recommended SPM" value={f1(rec.spm)} tone="good" hint={`current ${f1(b.spm)}`} />
                <Stat label="Recommended VFD" value={f0(rec.vfd_frequency)} unit="Hz" tone="good" hint={`current ${f0(b.vfd_frequency)} Hz`} />
                <Stat label="Pump efficiency" value={f1(o.pump_efficiency)} unit="%" hint={`current ${f1(b.pump_efficiency)}%`} />
                <Stat label="Peak rod load" value={f1(o.rod_load)} unit="kN" hint={`current ${f1(b.rod_load)} kN`} />
                <Stat label="Rod failure risk" value={`${f0(o.rod_failure_risk)}%`} tone={riskTone(o.rod_failure_risk)} hint={`current ${f0(b.rod_failure_risk)}%`} />
                <Stat label="Rod floating risk" value={`${f0(o.rod_floating_risk)}%`} tone={riskTone(o.rod_floating_risk)} hint={o.risk_level} />
                <Stat label="Production" value={f1(o.production_m3d)} unit="m³/d" hint={`current ${f1(b.production_m3d)} m³/d`} />
              </div>
              <Card title="Current vs recommended" right={<RiskBadge level={o.risk_level} />}>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="py-2 text-left">Metric</th><th className="text-right">Current</th><th className="text-right">Recommended</th></tr></thead>
                  <tbody>
                    {([["Rod floating risk (%)", b.rod_floating_risk, o.rod_floating_risk], ["Overall failure risk (%)", b.rod_failure_risk, o.rod_failure_risk], ["Peak rod load (kN)", b.rod_load, o.rod_load], ["Minimum rod load (kN)", b.min_rod_load, o.min_rod_load], ["Pump load (kN)", b.pump_load, o.pump_load], ["Power (kWh/day)", b.kwh_per_day, o.kwh_per_day], ["System efficiency (%)", b.system_efficiency, o.system_efficiency]] as [string, number, number][]).map(([l, x, y]) => (
                      <tr key={l} className="border-t border-ink-700"><td className="py-2 text-slate-300">{l}</td><td className="text-right tabular-nums">{f1(x)}</td><td className="text-right font-semibold tabular-nums text-white">{f1(y)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <Button variant="ghost" className="mt-3" onClick={() => setParams({ ...rec })}>Apply recommended settings</Button>
              </Card>
              <Card title={`Sensitivity to SPM at ${f0(rec.stroke_length)} in stroke`}>
                <LineChartBox data={srp.sweep} xKey="spm" xLabel="SPM"
                  series={[{ key: "risk", name: "Failure risk %", color: "#f87171" }, { key: "rod_load", name: "Rod load kN", color: "#a78bfa" }, { key: "production", name: "Oil m³/d", color: "#f59e0b" }]} />
              </Card>
            </>
          ) : <Empty>{busy.srp || busy.all ? "Optimizing…" : "Press “Optimize SRP” to compute recommended pump settings."}</Empty>}
        </div>
      </div>
    </>
  );
}
