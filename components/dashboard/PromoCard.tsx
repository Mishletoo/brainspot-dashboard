const STATS = [
  { label: "Clients", value: "124", delta: "+4" },
  { label: "Open Tasks", value: "37", delta: "–3" },
  { label: "Services", value: "18", delta: "+2" },
];

export default function PromoCard() {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[#1c212b] via-[#1e2430] to-[#181f1a] p-5 overflow-hidden ring-1 ring-white/[0.04]">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime-400/10 blur-2xl" />
      <div className="pointer-events-none absolute right-10 bottom-0 h-24 w-24 rounded-full bg-lime-400/5 blur-xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/10 px-2.5 py-0.5 text-xs font-semibold text-lime-400 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
            Active Month
          </span>
          <h2 className="text-lg font-bold text-zinc-100">February Performance</h2>
          <p className="mt-1 text-sm text-zinc-400 max-w-xs">
            Your team completed{" "}
            <span className="text-zinc-200 font-medium">24 tasks</span> this month, up{" "}
            <span className="text-lime-400 font-medium">+18%</span> from January.
          </p>
        </div>
        <div className="flex-shrink-0 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-zinc-900 cursor-pointer hover:bg-lime-300 transition">
          View Full Report →
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {STATS.map((s, i) => (
          <div key={`stat-${i}`} className="rounded-xl bg-white/5 px-3 py-2.5">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-zinc-100">{s.value}</span>
              <span className={`text-xs font-medium ${s.delta.startsWith("+") ? "text-lime-400" : "text-zinc-400"}`}>
                {s.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
