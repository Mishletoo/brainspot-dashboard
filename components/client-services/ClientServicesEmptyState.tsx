interface Props {
  onAttach: () => void;
}

export default function ClientServicesEmptyState({ onAttach }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-700 bg-[#1c212b] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-400/10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-6 w-6 text-lime-400"
        >
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">No services attached yet</p>
        <p className="mt-1 text-xs text-zinc-500">
          Attach a service to define client-specific pricing.
        </p>
      </div>
      <button
        onClick={onAttach}
        className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="h-3.5 w-3.5"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Attach Service
      </button>
    </div>
  );
}
