/** Animated schematic of the well: nodding-donkey pumpjack, moving rod string, steam bubbles and a heated zone. */
export default function WellTwin({ spm = 6, hot = 160, risk = 0 }: { spm?: number; hot?: number; risk?: number }) {
  const period = `${(60 / Math.max(spm, 1)).toFixed(2)}s`;
  const heat = Math.min(1, Math.max(0, (hot - 40) / 220));
  const rc = risk >= 60 ? "#f87171" : risk >= 30 ? "#fbbf24" : "#34d399";
  return (
    <svg viewBox="0 0 320 260" className="h-full w-full" role="img" aria-label="Animated well schematic">
      <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e293b" /><stop offset="1" stopColor="#0f172a" /></linearGradient>
        <radialGradient id="heatz" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#f97316" stopOpacity={0.15 + heat * 0.65} /><stop offset="1" stopColor="#f97316" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="0" y="100" width="320" height="160" fill="url(#ground)" />
      <line x1="0" y1="100" x2="320" y2="100" stroke="#334155" />
      <ellipse cx="160" cy="215" rx={50 + heat * 70} ry={22 + heat * 22} fill="url(#heatz)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
      </ellipse>
      <rect x="152" y="100" width="16" height="130" fill="#0b1220" stroke="#475569" />
      <line x1="160" y1="82" x2="160" y2="215" stroke={rc} strokeWidth="3" style={{ animation: `rod ${period} ease-in-out infinite` }} />
      <rect x="153" y="212" width="14" height="16" rx="2" fill="#94a3b8" style={{ animation: `rod ${period} ease-in-out infinite` }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={125 + i * 17} cy="230" r="3.5" fill="#bae6fd"
          style={{ animation: `rise ${3 + i * 0.5}s ease-out ${-i * 0.8}s infinite`, transformBox: "fill-box", transformOrigin: "center" }} />
      ))}
      <polygon points="60,100 84,100 74,58 70,58" fill="#334155" />
      <polygon points="116,100 140,100 130,58 126,58" fill="#334155" />
      <g style={{ transformOrigin: "100px 56px", animation: `rock ${period} ease-in-out infinite` }}>
        <rect x="42" y="50" width="150" height="9" rx="4" fill="#f59e0b" />
        <path d="M188 46 q14 8 0 22 v-6" fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
        <rect x="40" y="42" width="22" height="24" rx="3" fill="#b45309" />
      </g>
      <line x1="184" y1="66" x2="160" y2="82" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" style={{ animation: "flow 1s linear infinite" }} />
      <rect x="146" y="92" width="28" height="10" rx="2" fill="#475569" />
      <text x="12" y="248" fontSize="10" fill="#94a3b8">SPM {spm.toFixed(1)} · zone {Math.round(hot)} °C</text>
    </svg>
  );
}
