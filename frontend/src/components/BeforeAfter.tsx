import type { AllResult } from "../types";
import { Card, Delta, SourceBadge, f0, f1, f2 } from "./ui";

export default function BeforeAfter({ all }: { all: AllResult }) {
  const { before: b, after: a } = all.combined;
  const rows: { label: string; b: number; a: number; fmt: (n: number) => string; unit?: string; lower?: boolean }[] = [
    { label: "Cycle oil production", b: b.cycle_oil_m3, a: a.cycle_oil_m3, fmt: f0, unit: "m³" },
    { label: "Steam-oil ratio (SOR)", b: b.sor, a: a.sor, fmt: f2, lower: true },
    { label: "Energy per m³ of oil", b: b.energy_per_m3_gj, a: a.energy_per_m3_gj, fmt: f2, unit: "GJ/m³", lower: true },
    { label: "Hot-oil viscosity", b: b.viscosity_cp, a: a.viscosity_cp, fmt: f0, unit: "cP", lower: true },
    { label: "Rod floating risk", b: b.rod_risk, a: a.rod_risk, fmt: f1, unit: "%", lower: true },
    { label: "Pump efficiency", b: b.pump_efficiency, a: a.pump_efficiency, fmt: f1, unit: "%" },
    { label: "Optimization score", b: b.score, a: a.score, fmt: f1 },
  ];
  return (
    <Card title={`Before / After - ${all.well_id}`} right={<SourceBadge source={all.source} />}>
      <p className="mb-3 text-sm text-slate-300">
        Prototype simulation indicates a potential production improvement of{" "}
        <b className="text-emerald-400">{f1(all.css.production_improvement_pct)}%</b> under the modeled scenario
        (synthetic data; not a field measurement).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr><th className="py-2 text-left">Metric</th><th className="text-right">Before</th><th className="text-right">After</th><th className="text-right">Change</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-ink-700">
                <td className="py-2 text-slate-300">{r.label}</td>
                <td className="text-right tabular-nums">{r.fmt(r.b)} <span className="text-xs text-slate-500">{r.unit}</span></td>
                <td className="text-right font-semibold tabular-nums text-white">{r.fmt(r.a)} <span className="text-xs font-normal text-slate-500">{r.unit}</span></td>
                <td className="text-right"><Delta before={r.b} after={r.a} lowerIsBetter={r.lower} digits={r.fmt === f0 ? 0 : 1} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
