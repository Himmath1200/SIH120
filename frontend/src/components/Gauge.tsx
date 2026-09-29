/** Animated semicircular gauge (0-100 %). */
export default function Gauge({ value, label, size = 200 }: { value: number; label?: string; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 60 ? "#f87171" : v >= 30 ? "#fbbf24" : "#34d399";
  const c = Math.PI * 80;
  return (
    <svg viewBox="0 0 200 120" width={size} height={size * 0.6} role="img" aria-label={`${label ?? "risk"} ${Math.round(v)}%`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#22314f" strokeWidth="14" strokeLinecap="round" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1), stroke .5s", filter: `drop-shadow(0 0 6px ${color}88)` }} />
      <g style={{ transform: `rotate(${-90 + v * 1.8}deg)`, transformOrigin: "100px 100px", transition: "transform 1s cubic-bezier(.2,.7,.2,1)" }}>
        <line x1="100" y1="100" x2="100" y2="34" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="7" fill="#e2e8f0" />
    </svg>
  );
}
