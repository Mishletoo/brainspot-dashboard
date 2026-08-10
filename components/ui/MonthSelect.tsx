"use client";

import {
  buildAvailableMonthKeys,
  formatBgMonthKey,
  getCurrentMonthKey,
  type ReportMonthKey,
} from "@/lib/reportMonth";

type MonthSelectProps = {
  id?: string;
  label?: string;
  value: ReportMonthKey;
  months: ReportMonthKey[];
  onChange: (monthKey: ReportMonthKey) => void;
  className?: string;
  /** Visual variant for pages with different surface styles */
  variant?: "dashboard" | "zinc";
};

export function MonthSelect({
  id = "month",
  label = "Месец",
  value,
  months,
  onChange,
  className = "",
  variant = "dashboard",
}: MonthSelectProps) {
  const options = months.length > 0 ? months : [value || getCurrentMonthKey()];

  const labelClass =
    variant === "zinc"
      ? "mb-1 block text-xs uppercase tracking-wide text-zinc-500"
      : "mb-1 block text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]";

  const selectClass =
    variant === "zinc"
      ? "w-full appearance-none rounded-md border border-zinc-700 bg-zinc-950 py-1.5 pl-2.5 pr-8 text-sm text-zinc-100 outline-none focus:border-zinc-500"
      : "w-full appearance-none rounded-md border border-[var(--color-bs-border-soft)] bg-[var(--color-bs-bg-elevated,#0f1116)] py-1.5 pl-2.5 pr-8 text-sm text-[var(--color-bs-text)] outline-none transition focus:border-[var(--color-bs-accent,#a3e635)]";

  const chevronClass =
    variant === "zinc"
      ? "pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
      : "pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-bs-subtle)]";

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={selectClass}
        >
          {options.map((monthKey) => (
            <option key={monthKey} value={monthKey}>
              {formatBgMonthKey(monthKey)}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={chevronClass}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

export { buildAvailableMonthKeys, formatBgMonthKey, getCurrentMonthKey };
