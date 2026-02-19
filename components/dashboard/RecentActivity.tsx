import type { ReactNode } from "react";

type TxRowProps = {
  icon: ReactNode;
  name: string;
  date: string;
  amount: string;
  positive: boolean;
};

function TxRow({ icon, name, date, amount, positive }: TxRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#0f1116] text-zinc-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{name}</p>
        <p className="text-xs text-zinc-500">{date}</p>
      </div>
      <span className={`text-sm font-semibold ${positive ? "text-lime-400" : "text-zinc-300"}`}>
        {positive ? "+" : "–"}{amount}
      </span>
    </div>
  );
}

const ROWS: TxRowProps[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-1a6 6 0 0 1 6-6h0" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-1a6 6 0 0 0-5-5.92" />
      </svg>
    ),
    name: "New client: Marta Ivanova",
    date: "Today, 10:24 AM",
    amount: "€1 200",
    positive: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    name: "Task completed: Website audit",
    date: "Today, 9:05 AM",
    amount: "€350",
    positive: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    name: "Service invoice: SEO Package",
    date: "Yesterday, 3:45 PM",
    amount: "€750",
    positive: false,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
      </svg>
    ),
    name: "Employee added: Georgi Petrov",
    date: "Feb 16, 2026",
    amount: "€0",
    positive: true,
  },
];

export default function RecentActivity() {
  return (
    <div className="rounded-2xl bg-[#1c212b] px-5 py-4 flex-1 ring-1 ring-white/[0.04]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">Recent Activity</h3>
        <button className="text-xs text-lime-400 hover:text-lime-300 transition">See all</button>
      </div>

      <div className="divide-y divide-white/5">
        {ROWS.map((row, i) => (
          <TxRow key={`tx-${i}`} {...row} />
        ))}
      </div>
    </div>
  );
}
