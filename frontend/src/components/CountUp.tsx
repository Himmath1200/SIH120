import { useEffect, useRef, useState, type ReactNode } from "react";

/** Animates the first number inside a formatted string (e.g. "1,683", "76%", "3.31"); other content is shown as-is. */
export default function CountUp({ value, ms = 900 }: { value: ReactNode; ms?: number }) {
  const text = typeof value === "string" ? value : typeof value === "number" ? String(value) : null;
  const m = text?.match(/^(-?[\d,]*\.?\d+)([\s\S]*)$/);
  const target = m ? parseFloat(m[1].replace(/,/g, "")) : NaN;
  const decimals = m ? (m[1].split(".")[1]?.length ?? 0) : 0;
  const comma = m ? m[1].includes(",") : false;
  const [shown, setShown] = useState(target);
  const from = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(target); return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min((t - start) / ms, 1);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (target - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  if (!m || !Number.isFinite(target)) return <>{value}</>;
  const n = shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: comma });
  return <>{n}{m[2]}</>;
}
