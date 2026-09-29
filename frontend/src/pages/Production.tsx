import { useEffect } from "react";
import { useApp } from "../state/AppState";
import { Button, Card, Empty, NumberField, PageHeader, SourceBadge, Stat, f0, f1, f2 } from "../components/ui";
import { LineChartBox } from "../components/charts";

export default function Production() {
  const { prodInput: p, setProdInput, prod, runProduction, busy, wellId } = useApp();

  useEffect(() => { if (!prod && !busy.prod) void runProduction(); /* eslint-disable-next-line */ }, [wellId]);

  return (
    <>
      <PageHeader title="Production Prediction" subtitle="Predicted mean oil rate over the first 90 days after steam injection. Uses the trained ML model when the API is online; local physics in demo mode."
        right={<SourceBadge source={prod?.source} />} />
      <div className="grid gap-4 xl:grid-cols-4">
        <Card title="Inputs" className="xl:col-span-1">
          <div className="space-y-3.5">
            <NumberField label="Steam volume" value={p.steam_volume} onChange={(v) => setProdInput({ steam_volume: v })} min={500} max={6000} step={100} unit="t" />
            <NumberField label="Injection pressure" value={p.injection_pressure} onChange={(v) => setProdInput({ injection_pressure: v })} min={40} max={140} unit="bar" />
            <NumberField label="Soak time" value={p.soak_time} onChange={(v) => setProdInput({ soak_time: v })} min={1} max={30} unit="days" />
            <NumberField label="Reservoir temperature" value={p.reservoir_temperature} onChange={(v) => setProdInput({ reservoir_temperature: v })} min={35} max={50} unit="°C" />
            <NumberField label="Reservoir pressure" value={p.reservoir_pressure} onChange={(v) => setProdInput({ reservoir_pressure: v })} min={30} max={65} unit="bar" />
            <NumberField label="Oil viscosity (reservoir)" value={p.oil_viscosity} onChange={(v) => setProdInput({ oil_viscosity: v })} min={1500} max={6500} step={100} unit="cP" />
            <NumberField label="SPM" value={p.spm} onChange={(v) => setProdInput({ spm: v })} min={2} max={12} step={0.5} />
            <NumberField label="Stroke length" value={p.stroke_length} onChange={(v) => setProdInput({ stroke_length: v })} min={48} max={192} step={6} unit="in" />
            <NumberField label="VFD frequency" value={p.vfd_frequency} onChange={(v) => setProdInput({ vfd_frequency: v })} min={30} max={60} unit="Hz" />
            <Button busy={busy.prod} onClick={() => void runProduction()} className="w-full">Predict production</Button>
          </div>
        </Card>
        <div className="space-y-4 xl:col-span-3">
          {prod ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Predicted oil rate" value={f2(prod.predicted_oil_rate_m3d)} unit="m³/d" tone="good" />
                <Stat label="Predicted oil rate" value={f1(prod.predicted_oil_rate_bbl_d)} unit="bbl/d" />
                <Stat label="90-day volume" value={f0(prod.predicted_90d_volume_m3)} unit="m³" />
                <Stat label="Physics reference" value={f2(prod.physics_reference_m3d)} unit="m³/d" hint="deterministic model" />
              </div>
              <Card title="Predicted oil rate vs steam volume (m³/d)">
                <LineChartBox data={prod.sensitivity} xKey="steam_volume" xLabel="steam volume (t)"
                  series={[{ key: "predicted", name: "Predicted", color: "#f59e0b" }, { key: "physics", name: "Physics reference", color: "#94a3b8", dashed: true }]} refX={Math.round(p.steam_volume)} />
                <p className="mt-2 text-xs text-slate-500">Model: {prod.model}. Other inputs held at the values on the left.</p>
              </Card>
            </>
          ) : <Empty>{busy.prod ? "Predicting…" : "Press “Predict production”."}</Empty>}
        </div>
      </div>
    </>
  );
}
