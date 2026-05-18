"use client";

import { useEffect } from "react";

export type ToastVariant = "success" | "error";

export type ToastProps = {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  durationMs?: number;
};

export function Toast({ message, variant = "success", onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, message, onDismiss]);

  const variantClasses =
    variant === "error"
      ? "border-rose-800/70 bg-rose-950/90 text-rose-100"
      : "border-emerald-800/70 bg-emerald-950/90 text-emerald-100";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl ${variantClasses}`}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 leading-snug">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-1 text-xs opacity-70 transition-opacity hover:opacity-100"
          aria-label="Затвори"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
