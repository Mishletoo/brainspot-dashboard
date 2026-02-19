"use client";

interface Props {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
}

export function ClientReportsMonthPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Month
      </label>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm font-medium text-zinc-100 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/30 [color-scheme:dark]"
      />
    </div>
  );
}
