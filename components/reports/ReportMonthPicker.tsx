"use client";

import { formatMonthKey } from "./storage";

interface Props {
  /** YYYY-MM strings, sorted descending (newest first) */
  months: string[];
  selectedMonth: string;
  onChange: (month: string) => void;
}

export default function ReportMonthPicker({ months, selectedMonth, onChange }: Props) {
  return (
    <div className="relative">
      <select
        value={selectedMonth}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-zinc-700 bg-[#0f1116] py-2 pl-3 pr-8 text-sm font-medium text-zinc-100 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {formatMonthKey(m)}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
