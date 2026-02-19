"use client";

import { useEffect, useRef, useState } from "react";
import type { Service, PricingType } from "./types";
import { PRICING_TYPE_LABELS, PRICING_TYPES } from "./types";

type Mode = "add" | "edit" | "view";

interface ServiceModalProps {
  mode: Mode;
  service?: Service;
  /** All existing service names for duplicate-name validation */
  existingNames: string[];
  onClose: () => void;
  onSave: (data: Omit<Service, "id" | "createdAt">) => void;
}

interface FormState {
  name: string;
  description: string;
  pricingType: PricingType;
}

interface FormErrors {
  name?: string;
}

const DEFAULT_PRICING: PricingType = "FIXED_MONTHLY";

function serviceToForm(s: Service): FormState {
  return {
    name: s.name,
    description: s.description ?? "",
    pricingType: s.pricingType,
  };
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const inputErrorClass =
  "w-full rounded-xl border border-red-500/60 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const labelClass = "mb-1.5 block text-xs font-medium text-zinc-400";

const PRICING_BADGE = "inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300";

export default function ServiceModal({
  mode,
  service,
  existingNames,
  onClose,
  onSave,
}: ServiceModalProps) {
  const [form, setForm] = useState<FormState>(
    service && mode !== "add"
      ? serviceToForm(service)
      : { name: "", description: "", pricingType: DEFAULT_PRICING }
  );
  const [errors, setErrors] = useState<FormErrors>({});
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

  const validate = (): boolean => {
    const errs: FormErrors = {};
    const trimmed = form.name.trim();

    if (!trimmed) {
      errs.name = "Name is required.";
    } else {
      // Duplicate check — exclude current service's own name when editing
      const isDuplicate = existingNames.some(
        (n) =>
          n.toLowerCase() === trimmed.toLowerCase() &&
          (mode !== "edit" || n.toLowerCase() !== service?.name.toLowerCase())
      );
      if (isDuplicate) {
        errs.name = "A service with this name already exists.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      pricingType: form.pricingType,
    });
  };

  const isReadOnly = mode === "view";
  const title =
    mode === "add"
      ? "Add Service"
      : mode === "edit"
      ? "Edit Service"
      : "Service Details";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">
            {/* Name */}
            <div>
              <label className={labelClass}>
                Name{!isReadOnly && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {isReadOnly ? (
                <p className="text-sm text-zinc-100">{form.name || "—"}</p>
              ) : (
                <>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Service name"
                    className={errors.name ? inputErrorClass : inputClass}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                  )}
                </>
              )}
            </div>

            {/* Pricing Type */}
            <div>
              <label className={labelClass}>Pricing Type</label>
              {isReadOnly ? (
                <span className={PRICING_BADGE}>
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-400 flex-shrink-0" />
                  {PRICING_TYPE_LABELS[form.pricingType]}
                </span>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {PRICING_TYPES.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, pricingType: pt }))}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                        form.pricingType === pt
                          ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                      }`}
                    >
                      {PRICING_TYPE_LABELS[pt]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description</label>
              {isReadOnly ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-100">
                  {form.description || "—"}
                </p>
              ) : (
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description of this service…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30"
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
            >
              {isReadOnly ? "Close" : "Cancel"}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
              >
                {mode === "add" ? "Add Service" : "Save Changes"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation modal                                           */
/* ------------------------------------------------------------------ */

interface DeleteConfirmProps {
  service: Service;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  service,
  onClose,
  onConfirm,
}: DeleteConfirmProps) {
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

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
        <div className="px-6 py-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
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
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Delete service</h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-200">{service.name}</span>? This
            action cannot be undone.
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
