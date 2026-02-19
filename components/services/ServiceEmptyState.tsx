interface Props {
  onAdd: () => void;
}

export default function ServiceEmptyState({ onAdd }: Props) {
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
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-400">No services yet</p>
        <p className="mt-1 text-xs text-zinc-600">Add your first service to get started.</p>
        <button
          onClick={onAdd}
          className="mt-4 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
        >
          Add Service
        </button>
      </div>
    </div>
  );
}
