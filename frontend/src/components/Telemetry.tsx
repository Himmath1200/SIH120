import { useEffect, useState } from "react";
import type { Kpi } from "../types";
import { f1, f0 } from "./ui";

/** Scrolling strip of simulated "live" readings that jitter around the baseline KPIs (purely cosmetic, clearly labelled). */
export default function Telemetry({ kpi }: { kpi?: Kpi }) {
  const [t, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((x) => x + 1), 1500); return () => clearInterval(id); }, []);
  if (!kpi) return null;
  const j = (base: number, amp: number, k: number) => base * (1 + amp * Math.sin(t * 0.9 + k));
  const items = [
    ["Oil rate", `${f1(j(kpi.oil_rate_m3d, 0.04, 1))} m³/d`],
    ["Viscosity", `${f0(j(kpi.viscosity_cp, 0.02, 2))} cP`],
    ["Rod load", `${f1(j(kpi.rod_load_kn, 0.03, 3))} kN`],
    ["Rod float risk", `${f0(j(kpi.rod_floating_risk, 0.03, 4))} %`],
    ["Zone temp", `${f0(j(kpi.hot_temperature_c, 0.01, 5))} °C`],
  ];
  const row = [...items, ...items];
  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-ink-700 bg-ink-900/70 py-2 backdrop-blur-sm">
      <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-10 whitespace-nowrap px-4 text-sm hover:[animation-play-state:paused]">
        {row.map(([k, v], i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-slate-400">{k}</span><b className="tabular-nums text-white">{v}</b>
          </span>
        ))}
        <span className="text-xs text-slate-500">· simulated telemetry (synthetic)</span>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
