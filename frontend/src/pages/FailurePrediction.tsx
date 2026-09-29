import { useEffect } from "react";
import { failInputFromWell, paramsFromWell, useApp } from "../state/AppState";
import Gauge from "../components/Gauge";
import { Button, Card, Empty, NumberField, PageHeader, RiskBadge, SourceBadge, Stat, f0, f1, riskTone } from "../components/ui";

export default function FailurePrediction() {
  const { failInput: p, setFailInput, fail, runFailure, busy, wellId, all } = useApp();

  useEffect(() => { if (!fail && !busy.fail) void runFailure(); /* eslint-disable-next-line */ }, [wellId]);

  const load = (kind: "base" | "opt") => {
    const base = paramsFromWell(wellId);
    const src = kind === "opt" && all ? { ...base, ...all.css.recommended, ...all.srp.recommended } : base;
    const i = failInputFromWell(wellId, src);
    setFailInput(i);
    void runFailure(i);
  };

  const tone = fail ? riskTone(fail.rod_floating_risk_pct) : "neutral";
  const bar = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500", neutral: "bg-slate-500" }[tone];
  return (
    <>
      <PageHeader title="Rod Failure Prediction" subtitle="Risk of rod floating (viscous drag on the downstroke) and rod overload for the given SRP operating condition."
        right={<SourceBadge source={fail?.source} />} />
      <div className="grid gap-4 xl:grid-cols-4">
        <Card title="Inputs" className="xl:col-span-1">
          <div className="space-y-3.5">
            <NumberField label="Rod load (peak)" value={p.rod_load} onChange={(v) => setFailInput({ rod_load: v })} min={10} max={80} step={0.5} unit="kN" />
            <NumberField label="SPM" value={p.spm} onChange={(v) => setFailInput({ spm: v })} min={2} max={12} step={0.5} />
            <NumberField label="Stroke length" value={p.stroke_length} onChange={(v) => setFailInput({ stroke_length: v })} min={48} max={192} step={6} unit="in" />
            <NumberField label="VFD frequency" value={p.vfd_frequency} onChange={(v) => setFailInput({ vfd_frequency: v })} min={30} max={60} unit="Hz" />
            <NumberField label="Fluid level" value={p.fluid_level} onChange={(v) => setFailInput({ fluid_level: v })} min={20} max={450} step={10} unit="m" />
            <NumberField label="Pump load" value={p.pump_load} onChange={(v) => setFailInput({ pump_load: v })} min={2} max={40} step={0.5} unit="kN" />
            <NumberField label="Oil viscosity" value={p.oil_viscosity} onChange={(v) => setFailInput({ oil_viscosity: v })} min={20} max={5000} step={20} unit="cP" />
            <NumberField label="Reservoir temperature" value={p.reservoir_temperature} onChange={(v) => setFailInput({ reservoir_temperature: v })} min={40} max={220} unit="°C" />
            <NumberField label="Tubing pressure" value={p.tubing_pressure} onChange={(v) => setFailInput({ tubing_pressure: v })} min={1} max={15} step={0.5} unit="bar" />
            <NumberField label="Production" value={p.production} onChange={(v) => setFailInput({ production: v })} min={0} max={30} step={0.5} unit="m³/d" />
            <Button busy={busy.fail} onClick={() => void runFailure()} className="w-full">Predict failure risk</Button>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 !px-2 text-xs" onClick={() => load("base")}>Load baseline</Button>
              <Button variant="ghost" className="flex-1 !px-2 text-xs" disabled={!all} onClick={() => load("opt")}>Load optimized</Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-3">
          {fail ? (
            <>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Rod Floating Risk:</div>
                    <div className={`text-5xl font-extrabold tabular-nums ${{ good: "text-emerald-400", warn: "text-amber-400", bad: "text-red-400", neutral: "" }[tone]}`}>{f0(fail.rod_floating_risk_pct)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="mb-1 text-sm text-slate-400">Risk:</div>
                    <RiskBadge level={fail.risk_level} />
                  </div>
                </div>
                <div className="flex justify-center"><Gauge value={fail.rod_floating_risk_pct} size={260} label="Rod floating risk" /></div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink-700">
                  <div className={`h-full transition-all duration-500 ${bar}`} style={{ width: `${Math.min(fail.rod_floating_risk_pct, 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>LOW &lt;30</span><span>MEDIUM 30-60</span><span>HIGH ≥60</span></div>
              </Card>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat label="Rod overload risk" value={`${f1(fail.overload_risk_pct)}%`} tone={riskTone(fail.overload_risk_pct)} />
                <Stat label="Overall failure risk" value={`${f1(fail.overall_failure_risk_pct)}%`} tone={riskTone(fail.overall_failure_risk_pct)} />
                <Stat label="Level" value={fail.risk_level} tone={tone} />
              </div>
              <Card title="Risk drivers">
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">{fail.drivers.map((d) => <li key={d}>{d}</li>)}</ul>
                <p className="mt-3 text-xs text-slate-500">Model: {fail.model}</p>
              </Card>
            </>
          ) : <Empty>{busy.fail ? "Predicting…" : "Press “Predict failure risk”."}</Empty>}
        </div>
      </div>
    </>
  );
}
