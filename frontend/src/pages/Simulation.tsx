import { useEffect } from "react";
import { useApp } from "../state/AppState";
import { Button, Card, Empty, NumberField, PageHeader, SourceBadge, Stat, f0, f1, f2, riskTone } from "../components/ui";
import { LineChartBox } from "../components/charts";

export default function Simulation() {
  const { params, setParams, sim, runSim, busy, wellId } = useApp();
  const auto = params.injection_temperature == null;

  useEffect(() => { if (!sim && !busy.sim) void runSim(); /* eslint-disable-next-line */ }, [wellId]);

  const s = sim?.summary;
  return (
    <>
      <PageHeader title="Digital Twin Simulation"
        subtitle="Deterministic well-to-surface model of one CSS cycle: reservoir heating → viscosity → inflow → SRP loads → SOR and failure risk."
        right={<SourceBadge source={sim?.source} />} />
      <div className="grid gap-4 xl:grid-cols-4">
        <Card title="Inputs" className="xl:col-span-1">
          <div className="space-y-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={auto} onChange={(e) => setParams({ injection_temperature: e.target.checked ? null : 300 })} className="accent-amber-500" />
                Steam temperature = saturation at injection pressure
              </label>
              {!auto && <NumberField label="Steam temperature" value={params.injection_temperature ?? 300} onChange={(v) => setParams({ injection_temperature: v })} min={150} max={340} step={5} unit="°C" />}
            </div>
            <NumberField label="Steam volume" value={params.steam_volume} onChange={(v) => setParams({ steam_volume: v })} min={500} max={6000} step={100} unit="t" />
            <NumberField label="Injection pressure" value={params.injection_pressure} onChange={(v) => setParams({ injection_pressure: v })} min={40} max={140} step={1} unit="bar" />
            <NumberField label="Soak time" value={params.soak_time} onChange={(v) => setParams({ soak_time: v })} min={1} max={30} step={1} unit="days" />
            <NumberField label="SPM" value={params.spm} onChange={(v) => setParams({ spm: v })} min={2} max={12} step={0.5} />
            <NumberField label="Stroke length" value={params.stroke_length} onChange={(v) => setParams({ stroke_length: v })} min={48} max={192} step={6} unit="in" />
            <NumberField label="VFD frequency" value={params.vfd_frequency} onChange={(v) => setParams({ vfd_frequency: v })} min={30} max={60} step={1} unit="Hz" />
            <Button busy={busy.sim} onClick={() => void runSim()} className="w-full">Run simulation</Button>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-3">
          {s ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Cycle oil" value={f0(s.cycle_oil_m3)} unit="m³" hint={`${f0(s.cycle_days)} days`} />
                <Stat label="SOR" value={f2(s.sor)} tone={s.sor > 3.5 ? "bad" : "good"} />
                <Stat label="Hot-oil viscosity" value={f0(s.hot_viscosity_cp)} unit="cP" hint={`${f0(sim!.injection_temperature_c)} °C steam`} />
                <Stat label="Peak failure risk" value={`${f0(s.peak_failure_risk)}%`} tone={riskTone(s.peak_failure_risk)} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Near-wellbore temperature (°C)"><LineChartBox data={sim!.series} xKey="day" xLabel="day" series={[{ key: "temperature", name: "Temperature", color: "#34d399" }]} height={220} /></Card>
                <Card title="Oil viscosity (cP, log)"><LineChartBox data={sim!.series} xKey="day" xLabel="day" logY series={[{ key: "viscosity", name: "Viscosity", color: "#f87171" }]} height={220} /></Card>
                <Card title="Near-well pressure (bar)"><LineChartBox data={sim!.series} xKey="day" xLabel="day" series={[{ key: "pressure", name: "Pressure", color: "#38bdf8" }]} height={220} /></Card>
                <Card title="Oil production (m³/d)"><LineChartBox data={sim!.series} xKey="day" xLabel="day" series={[{ key: "production", name: "Production", color: "#f59e0b" }]} height={220} /></Card>
                <Card title="Pump & rod load (kN)"><LineChartBox data={sim!.series} xKey="day" xLabel="day" series={[{ key: "rod_load", name: "Rod load", color: "#a78bfa" }, { key: "pump_load", name: "Pump load", color: "#94a3b8" }]} height={220} /></Card>
                <Card title="Cumulative SOR & failure risk (%)"><LineChartBox data={sim!.series.filter((p) => p.sor > 0)} xKey="day" xLabel="day" series={[{ key: "sor", name: "SOR", color: "#fbbf24" }, { key: "failure_risk", name: "Failure risk %", color: "#f87171", yAxis: "right" }]} height={220} /></Card>
              </div>
              <p className="text-xs text-slate-500">Cycle ends when oil rate falls below the {f1(params.production_cutoff)} m³/d cut-off. Average pump efficiency {f1(s.avg_pump_efficiency)}%, max rod load {f1(s.max_rod_load_kn)} kN.</p>
            </>
          ) : <Empty>{busy.sim ? "Running simulation…" : "Press “Run simulation”."}</Empty>}
        </div>
      </div>
    </>
  );
}
