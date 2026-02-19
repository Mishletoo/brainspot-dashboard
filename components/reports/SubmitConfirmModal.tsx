"use client";

import { useEffect, useRef } from "react";

interface Props {
  monthLabel: string;
  totalHours: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SubmitConfirmModal({
  monthLabel,
  totalHours,
  onClose,
  onConfirm,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const displayHours =
    totalHours % 1 === 0 ? totalHours.toFixed(0) : totalHours.toFixed(2);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
        <div className="px-6 py-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-lime-400/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5 text-lime-400"
            >
              <path d="M9 12l2 2 4-4" />
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-zinc-100">
            Submit report?
          </h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            You are about to submit your report for{" "}
            <span className="font-medium text-zinc-200">{monthLabel}</span>{" "}
            with{" "}
            <span className="font-medium text-zinc-200">
              {displayHours} hours
            </span>{" "}
            logged. Once submitted, you won&apos;t be able to edit entries unless
            an admin unlocks the report.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
