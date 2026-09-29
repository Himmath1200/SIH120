import { useRef, type MouseEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import CountUp from "./CountUp";
import type { Source } from "../types";

export const COLORS = { amber: "#f59e0b", blue: "#38bdf8", green: "#34d399", red: "#f87171", violet: "#a78bfa", slate: "#94a3b8" };
export const AXIS = { stroke: "#64748b", fontSize: 11 };
export const TOOLTIP = { contentStyle: { background: "#0b1220", border: "1px solid #34466b", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "#cbd5e1" } };

export function Card({ title, right, children, className = "" }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`lift rounded-xl border border-ink-700 bg-ink-900/80 p-4 backdrop-blur-sm ${className}`}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h3>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-gradient text-xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 max-w-3xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const TONE = { neutral: "text-white", good: "text-emerald-400", warn: "text-amber-400", bad: "text-red-400" };
export type Tone = keyof typeof TONE;

export function Stat({ label, value, unit, tone = "neutral", hint }: { label: string; value: ReactNode; unit?: string; tone?: Tone; hint?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seed = [...label].reduce((a, c) => a + c.charCodeAt(0), 0);
  const move = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-3px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <div className={seed % 3 === 0 ? "float-a" : seed % 3 === 1 ? "float-b" : "float-c"} style={{ animationDelay: `${-(seed % 7)}s` }}>
      <div ref={ref} onMouseMove={move} onMouseLeave={leave} className="tilt lift rounded-xl border border-ink-700 bg-ink-900/80 p-4 backdrop-blur-sm">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</div>
        <div className={`mt-1 text-2xl font-bold tabular-nums ${TONE[tone]}`}>
          <CountUp value={value} />
          {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
        </div>
        {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      </div>
    </div>
  );
}

export const riskTone = (pct: number): Tone => (pct >= 60 ? "bad" : pct >= 30 ? "warn" : "good");

export function RiskBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" }) {
  const cls = level === "HIGH" ? "bg-red-500/15 text-red-300 ring-red-500/40" : level === "MEDIUM" ? "bg-amber-500/15 text-amber-300 ring-amber-500/40" : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40";
  return <span className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${cls}`}>{level}</span>;
}

export function SourceBadge({ source }: { source?: Source }) {
  if (!source) return null;
  return source === "backend" ? (
    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">API result</span>
  ) : (
    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-amber-500/30">DEMO SIMULATION MODE</span>
  );
}

export function Button({ children, onClick, busy, variant = "primary", disabled, className = "", type = "button" }: {
  children: ReactNode; onClick?: () => void; busy?: boolean; variant?: "primary" | "ghost" | "danger"; disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  const v = variant === "primary" ? "bg-amber-500 text-ink-950 hover:bg-amber-400" : variant === "danger" ? "bg-red-500/20 text-red-200 hover:bg-red-500/30" : "border border-ink-600 text-slate-200 hover:bg-ink-800";
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy}
      className={`btn-shine inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${v} ${className}`}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1, unit }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
}) {
  const set = (v: number) => onChange(Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="flex items-center gap-1">
          <input type="number" value={Number.isFinite(value) ? value : ""} min={min} max={max} step={step}
            onChange={(e) => set(parseFloat(e.target.value))}
            className="w-20 rounded border border-ink-600 bg-ink-950 px-1.5 py-0.5 text-right tabular-nums text-white" />
          {unit && <span className="w-9 text-slate-500">{unit}</span>}
        </span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(e) => set(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-amber-500" />
    </label>
  );
}

export function Delta({ before, after, lowerIsBetter = false, unit = "", digits = 1 }: { before: number; after: number; lowerIsBetter?: boolean; unit?: string; digits?: number }) {
  const d = after - before;
  const pct = before !== 0 ? (d / before) * 100 : 0;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return (
    <span className={`text-xs font-medium ${Math.abs(pct) < 0.5 ? "text-slate-400" : good ? "text-emerald-400" : "text-red-400"}`}>
      {d >= 0 ? "+" : ""}{d.toFixed(digits)}{unit} ({pct >= 0 ? "+" : ""}{pct.toFixed(0)}%)
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-48 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed border-ink-600 text-sm text-slate-500">
      <div className="w-2/3 space-y-2"><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-4/5" /><div className="skeleton h-3 w-3/5" /></div>
      <span className="float-c">{children}</span>
    </div>
  );
}

export const f0 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
export const f1 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const f2 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
