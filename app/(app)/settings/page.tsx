"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/useAuth";
import { hasDemoData, seedDemoData, clearAllDemoData } from "@/lib/seedDemoData";

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

type ConfirmVariant = "seed" | "clear";

interface ConfirmModalProps {
  variant: ConfirmVariant;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmModal({ variant, onClose, onConfirm }: ConfirmModalProps) {
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

  const isSeed = variant === "seed";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
        <div className="px-6 py-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
            {isSeed ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-5 w-5 text-zinc-400"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-5 w-5 text-zinc-400"
              >
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            )}
          </div>

          <h2 className="text-base font-semibold text-zinc-100">
            {isSeed ? "Overwrite existing data?" : "Clear all demo data?"}
          </h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            {isSeed
              ? "There is already data stored in this browser. Seeding will replace all employees, clients, services, tasks, client-services, reports, and time entries with demo records. This cannot be undone."
              : "This will permanently delete all records from this browser's localStorage, including employees, clients, services, tasks, reports, and time entries. A clean admin account will be restored so you can log back in."}
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
            {isSeed ? "Yes, overwrite" : "Yes, clear everything"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Success Toast ─────────────────────────────────────────────────────────────

function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-lime-400/20 bg-[#1c212b] px-4 py-3 shadow-2xl">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-lime-400/10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4 text-lime-400"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="text-sm font-medium text-zinc-200">{message}</span>
    </div>
  );
}

// ─── Demo Data Summary Card ────────────────────────────────────────────────────

const SUMMARY_ITEMS = [
  { label: "Employees", detail: "1 admin + 2 employees", icon: "👤" },
  { label: "Clients", detail: "3 clients", icon: "🏢" },
  { label: "Services", detail: "5 services (incl. 30 % commission)", icon: "🔧" },
  { label: "Tasks", detail: "12 tasks across services", icon: "✅" },
  { label: "Client Services", detail: "8 client–service links", icon: "🔗" },
  { label: "Time Entries", detail: "13 entries for current month", icon: "⏱" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

type ModalState = "none" | "seed-confirm" | "clear-confirm";
type Toast = { message: string } | null;

export default function SettingsPage() {
  const { auth } = useAuth();
  const router = useRouter();
  const isAdmin = auth?.role === "ADMIN";

  const [modal, setModal] = useState<ModalState>("none");
  const [toast, setToast] = useState<Toast>(null);

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function handleSeedClick() {
    if (hasDemoData()) {
      setModal("seed-confirm");
    } else {
      runSeed();
    }
  }

  function runSeed() {
    setModal("none");
    seedDemoData();
    setToast({ message: "Demo data seeded — redirecting to Client Reports…" });
    setTimeout(() => router.push("/admin/client-reports"), 1200);
  }

  function handleClearClick() {
    setModal("clear-confirm");
  }

  function runClear() {
    setModal("none");
    clearAllDemoData();
    setToast({ message: "All demo data cleared. Clean slate ready." });
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure your account and preferences here.
        </p>
      </div>

      {/* General placeholder */}
      <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-zinc-700/60 bg-[#1c212b]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-6 w-6 text-zinc-500"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">Nothing configured yet</p>
          <p className="mt-1 text-xs text-zinc-600">Settings options will appear here.</p>
        </div>
      </div>

      {/* Admin Tools — ADMIN only */}
      {isAdmin && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#1c212b]">
          {/* Section header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-4 w-4 text-lime-400"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100">Admin Tools</h2>
                <span className="rounded-md bg-lime-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime-400">
                  Admin only
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Quick-populate localStorage with realistic demo records for testing.
              </p>
            </div>
          </div>

          <div className="p-6">
            {/* What gets seeded */}
            <div className="mb-6 rounded-xl border border-zinc-800/60 bg-[#0f1116] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                What gets seeded
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SUMMARY_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-0.5 rounded-lg bg-zinc-800/50 px-3 py-2"
                  >
                    <span className="text-xs font-medium text-zinc-300">{item.label}</span>
                    <span className="text-[11px] text-zinc-500">{item.detail}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-zinc-600">
                After seeding, you will be redirected to{" "}
                <span className="font-medium text-zinc-400">/admin/client-reports</span> to
                see the totals immediately. Passwords:{" "}
                <span className="font-mono font-medium text-zinc-400">admin123</span> (Anna) ·{" "}
                <span className="font-mono font-medium text-zinc-400">demo123</span> (others).
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-start gap-3">
              {/* Seed */}
              <button
                type="button"
                onClick={handleSeedClick}
                className="group flex items-center gap-2.5 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-lime-300 active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 flex-shrink-0"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                Seed demo data
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={handleClearClick}
                className="flex items-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-800/40 px-5 py-2.5 text-sm font-semibold text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 flex-shrink-0"
                >
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                Clear all demo data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === "seed-confirm" && (
        <ConfirmModal
          variant="seed"
          onClose={() => setModal("none")}
          onConfirm={runSeed}
        />
      )}
      {modal === "clear-confirm" && (
        <ConfirmModal
          variant="clear"
          onClose={() => setModal("none")}
          onConfirm={runClear}
        />
      )}

      {/* Toast */}
      {toast && <SuccessToast message={toast.message} />}
    </div>
  );
}
