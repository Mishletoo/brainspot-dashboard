import type { Service } from "@/components/services/types";

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  serviceFilter: string;
  onServiceFilterChange: (val: string) => void;
  services: Service[];
}

export default function TaskSearch({
  search,
  onSearchChange,
  serviceFilter,
  onServiceFilterChange,
  services,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1">
      {/* Search input */}
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
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by task or service…"
          className="w-full rounded-xl border border-zinc-700 bg-[#1c212b] py-2 pl-9 pr-4 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30"
        />
      </div>

      {/* Service filter dropdown */}
      <div className="relative">
        <select
          value={serviceFilter}
          onChange={(e) => onServiceFilterChange(e.target.value)}
          className="appearance-none rounded-xl border border-zinc-700 bg-[#1c212b] py-2 pl-3 pr-8 text-sm text-zinc-200 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30"
        >
          <option value="">All Services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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
    </div>
  );
}
