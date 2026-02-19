interface Props {
  onAdd: () => void;
}

export default function ClientEmptyState({ onAdd }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-[#1c212b]">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-6 w-6 text-zinc-500"
          >
            <circle cx="9" cy="7" r="3" />
            <path d="M3 21v-1a6 6 0 0 1 6-6h0" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            <path d="M21 21v-1a6 6 0 0 0-5-5.92" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-400">No clients yet</p>
        <p className="mt-1 text-xs text-zinc-600">Add your first client to get started.</p>
        <button
          onClick={onAdd}
          className="mt-4 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
        >
          Add Client
        </button>
      </div>
    </div>
  );
}
