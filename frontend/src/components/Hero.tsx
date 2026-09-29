import { Droplets, Flame, Gauge, Thermometer, Zap } from "lucide-react";

const CHIPS = [
  { icon: Flame, label: "CSS", cls: "float-a", pos: "right-[8%] top-6", tone: "text-amber-300 bg-amber-500/15" },
  { icon: Droplets, label: "Viscosity", cls: "float-b", pos: "right-[24%] top-16", tone: "text-sky-300 bg-sky-500/15" },
  { icon: Gauge, label: "SRP", cls: "float-c", pos: "right-[14%] bottom-10", tone: "text-emerald-300 bg-emerald-500/15" },
  { icon: Thermometer, label: "Heat", cls: "float-b", pos: "right-[34%] bottom-6", tone: "text-orange-300 bg-orange-500/15" },
  { icon: Zap, label: "Energy", cls: "float-a", pos: "right-[3%] bottom-24", tone: "text-violet-300 bg-violet-500/15" },
];

/** Animated banner: gradient backdrop, floating capability chips, rotating rings and looping waves. */
export default function Hero({ wellId }: { wellId: string }) {
  return (
    <div className="hero glow-pulse relative mb-4 overflow-hidden rounded-2xl border border-ink-600 p-6 sm:p-8">
      <div className="spin-slow pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-dashed border-amber-400/30" />
      <div className="spin-slow pointer-events-none absolute -right-4 -top-4 h-40 w-40 rounded-full border border-sky-400/20 [animation-direction:reverse]" />
      {CHIPS.map(({ icon: Icon, label, cls, pos, tone }, i) => (
        <div key={label} className={`${cls} pointer-events-none absolute hidden md:block ${pos}`} style={{ animationDelay: `${-i * 1.3}s` }}>
          <div className={`pop flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10 backdrop-blur ${tone}`} style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
            <Icon className="h-4 w-4" />{label}
          </div>
        </div>
      ))}
      <div className="relative max-w-xl">
        <div className="pop mb-2 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" /></span>
          SIH26120 · Well-to-Surface Digital Twin
        </div>
        <h2 className="text-2xl font-extrabold leading-tight text-white sm:text-4xl">Heavy-oil optimization,<br /><span className="text-gradient">simulated end to end.</span></h2>
        <p className="mt-2 text-sm text-slate-300">Cyclic steam stimulation and sucker-rod-pump modelling for <b className="text-white">{wellId}</b> - synthetic data, prototype physics and ML.</p>
      </div>
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-8 w-full opacity-40" viewBox="0 0 1200 40" preserveAspectRatio="none">
        <g style={{ animation: "wave 9s linear infinite" }}>
          <path d="M0 20 Q 75 0 150 20 T 300 20 T 450 20 T 600 20 T 750 20 T 900 20 T 1050 20 T 1200 20 T 1350 20 T 1500 20 T 1650 20 T 1800 20 T 1950 20 T 2100 20 T 2250 20 T 2400 20 V40 H0Z" fill="#38bdf8" fillOpacity=".35" />
        </g>
      </svg>
    </div>
  );
}
