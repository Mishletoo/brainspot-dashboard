import type { ReactNode } from "react";

type Action = { label: string; icon: ReactNode };

const ACTIONS: Action[] = [
  {
    label: "New Client",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    label: "Add Task",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: "Schedule",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Report",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M2 20h20" />
      </svg>
    ),
  },
  {
    label: "Employees",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
      </svg>
    ),
  },
  {
    label: "More",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

function QuickActionButton({ icon, label }: Action) {
  return (
    <button className="flex flex-col items-center gap-2 group">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1c212b] text-zinc-400 ring-1 ring-white/[0.05] transition group-hover:bg-lime-400/10 group-hover:text-lime-400 group-hover:ring-lime-400/30">
        {icon}
      </div>
      <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition">{label}</span>
    </button>
  );
}

export default function QuickActions() {
  return (
    <div className="rounded-2xl bg-[#1c212b] px-5 py-4 ring-1 ring-white/[0.04]">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Quick Actions</p>
      <div className="flex items-start justify-between">
        {ACTIONS.map((action, i) => (
          <QuickActionButton key={`action-${i}`} {...action} />
        ))}
      </div>
    </div>
  );
}
