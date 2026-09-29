import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity, ArrowUp, BarChart3, Bolt, Cog, Flame, Gauge, Menu, ShieldAlert, TrendingUp, Waypoints, X, Wifi, WifiOff,
} from "lucide-react";
import { useApp } from "../state/AppState";
import { isDemoActive, switchToDemo, switchToLive, useApiStatus, useToasts, dismissToast, API_URL } from "../services/api";
import { Button } from "./ui";
import Background from "./Background";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/well-monitoring", label: "Well Monitoring", icon: Activity },
  { to: "/simulation", label: "Digital Twin", icon: Waypoints },
  { to: "/css-optimization", label: "CSS Optimization", icon: Flame },
  { to: "/srp-optimization", label: "SRP Optimization", icon: Cog },
  { to: "/production", label: "Production", icon: TrendingUp },
  { to: "/failure-prediction", label: "Failure Prediction", icon: ShieldAlert },
  { to: "/energy", label: "Energy & SOR", icon: Bolt },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export const DISCLAIMER = "This application uses synthetic data and simplified physics/ML models for academic and SIH demonstration purposes. Results are not actual Baghewala field measurements and recommendations must not be used for field operation without engineering validation.";

export function StatusPill() {
  const s = useApiStatus();
  const demo = isDemoActive(s);
  if (s.backend === "checking" && !s.forcedDemo) {
    return <span className="inline-flex items-center gap-2 rounded-full bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-slate-500/40">Connecting to API…</span>;
  }
  return demo ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/40">
      🟡 DEMO MODE
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
      🟢 API ONLINE
    </span>
  );
}

function ModeControls() {
  const s = useApiStatus();
  const demo = isDemoActive(s);
  if (!s.forcedDemo && s.backend === "online") {
    return <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={switchToDemo}><WifiOff className="h-3.5 w-3.5" />Switch to Demo Mode</Button>;
  }
  if (demo && API_URL) {
    return <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => void switchToLive()}><Wifi className="h-3.5 w-3.5" />Try live API</Button>;
  }
  return null;
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { wells, wellId, setWellId } = useApp();
  const status = useApiStatus();
  const toasts = useToasts();
  const { pathname } = useLocation();

  return (
    <div className="relative flex min-h-screen bg-ink-950 text-slate-200">
      <Background />
      {/* sidebar */}
      <aside className={`z-40 fixed inset-y-0 left-0 z-40 w-60 transform border-r border-ink-700 bg-ink-900 transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 animate-float place-items-center rounded-lg bg-amber-500 text-ink-950 shadow-lg shadow-amber-500/30"><Flame className="h-5 w-5" /></div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-white">Baghewala</div>
              <div className="text-[11px] text-slate-400">Digital Twin · SIH26120</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "active bg-amber-500/15 text-amber-300" : "text-slate-400 hover:bg-ink-800 hover:text-white"}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-ink-700 bg-ink-950/90 px-4 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <select value={wellId} onChange={(e) => setWellId(e.target.value)} aria-label="Select well"
            className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm font-semibold text-white">
            {(wells.length ? wells.map((w) => w.id) : ["WB-101", "WB-102", "WB-103", "WB-104", "WB-105"]).map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <StatusPill />
          <ModeControls />
          <div className="ml-auto hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
            Synthetic simulation
          </div>
        </header>

        {status.backend === "offline" && !status.forcedDemo && status.configured && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            Backend connection unavailable. Running in <b>DEMO SIMULATION MODE</b> with local deterministic data - retrying automatically.
          </div>
        )}
        {isDemoActive(status) && (!status.configured || status.forcedDemo) && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            <b>DEMO SIMULATION MODE</b> - results come from the built-in local simulation, not from the API.
          </div>
        )}

        <main className="relative flex-1 px-4 py-5 sm:px-6"><div key={pathname} className="route-bar" /><div key={pathname + "-p"} className="page-enter"><Outlet /></div></main>

        <footer className="border-t border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/90">
          <b className="tracking-wide">DEMO / SIMULATION ONLY.</b> {DISCLAIMER}
        </footer>
      </div>


      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"
        className="float-a fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full bg-amber-500 text-ink-950 shadow-lg shadow-amber-500/30 transition hover:scale-110">
        <ArrowUp className="h-5 w-5" />
      </button>

      {/* toasts */}
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg ${t.kind === "warn" ? "border-amber-500/40 bg-ink-900 text-amber-200" : t.kind === "ok" ? "border-emerald-500/40 bg-ink-900 text-emerald-200" : "border-ink-600 bg-ink-900 text-slate-200"}`}>
            <span>{t.text}</span>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
