interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function ServiceSearch({ value, onChange }: Props) {
  return (
    <div className="relative w-full max-w-xs">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name…"
        className="w-full rounded-xl border border-zinc-700 bg-[#1c212b] py-2 pl-9 pr-4 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30"
      />
    </div>
  );
}
