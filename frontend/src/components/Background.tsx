/** Fixed decorative layer: slow-drifting glow orbs, a faded grid and rising steam specks. */
export default function Background() {
  const specks = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="absolute -left-32 top-10 h-96 w-96 animate-drift rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] animate-drift rounded-full bg-sky-500/10 blur-3xl [animation-delay:-8s]" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 animate-drift rounded-full bg-orange-600/10 blur-3xl [animation-delay:-15s]" />
      {specks.map((i) => (
        <span key={i} className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-amber-300/40"
          style={{ left: `${(i * 7.3 + 5) % 100}%`, animation: `speck ${14 + (i % 5) * 4}s linear ${-i * 2.3}s infinite` }} />
      ))}
      <style>{`@keyframes speck { from { transform: translateY(0); opacity: 0 } 10% { opacity: .8 } to { transform: translateY(-100vh); opacity: 0 } }`}</style>
    </div>
  );
}
