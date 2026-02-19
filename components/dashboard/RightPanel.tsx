const BARS = [40, 65, 50, 80, 55, 90, 70, 85, 60, 75, 95, 68];
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const TASKS = [
  { label: "Call with Marta", done: true },
  { label: "Review SEO report", done: true },
  { label: "Update client portal", done: false },
  { label: "Team standup 3pm", done: false },
];

function MiniBarChart() {
  return (
    <div className="flex items-end gap-1 h-16">
      {BARS.map((h, i) => (
        <div
          key={`bar-${i}`}
          style={{ height: `${h}%` }}
          className={`flex-1 rounded-sm transition-all ${h === 95 ? "bg-lime-400" : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

export default function RightPanel() {
  const doneCount = TASKS.filter((t) => t.done).length;

  return (
    <div className="flex w-56 flex-shrink-0 flex-col gap-3 overflow-y-auto">

      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-b from-lime-400 to-lime-500 p-4 text-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold opacity-70 uppercase tracking-widest">Balance</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 opacity-60">
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
        <p className="text-2xl font-extrabold tracking-tight">€14 280</p>
        <p className="text-xs font-medium opacity-60 mt-0.5">Monthly revenue</p>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-60">Invoiced</p>
            <p className="text-sm font-bold">€18 500</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-60">Pending</p>
            <p className="text-sm font-bold">€4 220</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 opacity-50">
          {[0, 1, 2, 3].map((i) => (
            <div key={`dot-${i}`} className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
          ))}
          <span className="ml-1 text-xs font-mono">•••• 4821</span>
        </div>
      </div>

      {/* Chart card */}
      <div className="flex-1 rounded-2xl bg-[#1c212b] p-4 flex flex-col ring-1 ring-white/[0.04]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-zinc-200">Revenue</h3>
          <span className="text-xs text-zinc-500">2026</span>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Monthly overview</p>

        <div className="flex-1 flex flex-col justify-end">
          <MiniBarChart />
          <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
            {MONTHS.map((m, i) => (
              <span key={`month-${i}`}>{m}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-white/5 px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">Peak month</p>
            <p className="text-sm font-bold text-zinc-100">November</p>
          </div>
          <span className="text-xs font-semibold text-lime-400 bg-lime-400/10 rounded-full px-2 py-0.5">
            +12%
          </span>
        </div>
      </div>

      {/* Tasks summary card */}
      <div className="rounded-2xl bg-[#1c212b] p-4 ring-1 ring-white/[0.04]">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">Tasks Today</h3>
        <div className="space-y-2">
          {TASKS.map((t, i) => (
            <div key={`task-${i}`} className="flex items-center gap-2.5">
              <div className={`h-4 w-4 flex-shrink-0 rounded-full border flex items-center justify-center ${t.done ? "border-lime-400 bg-lime-400/10" : "border-zinc-600"}`}>
                {t.done && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-2.5 w-2.5 text-lime-400">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
              <span className={`text-xs truncate ${t.done ? "line-through text-zinc-500" : "text-zinc-300"}`}>
                {t.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-lime-400"
              style={{ width: `${(doneCount / TASKS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500">{doneCount} / {TASKS.length}</span>
        </div>
      </div>
    </div>
  );
}
