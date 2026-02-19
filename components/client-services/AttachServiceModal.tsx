"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientService, PricingType } from "./types";
import type { Service } from "@/components/services/types";
import { PRICING_TYPE_LABELS, PRICING_TYPES } from "@/components/services/types";
import { formatEUR } from "@/lib/money";

type Mode = "add" | "edit" | "view";

interface Props {
  mode: Mode;
  clientId: string;
  record?: ClientService;
  services: Service[];
  /** serviceIds already attached to this client (for duplicate guard) */
  attachedServiceIds: string[];
  onClose: () => void;
  onSave: (data: Omit<ClientService, "id" | "createdAt">) => void;
}

interface FormState {
  serviceId: string;
  pricingType: PricingType;
  monthlyFixedPrice: string;
  hourlyRate: string;
  oneTimePrice: string;
  commissionRatePct: string;
}

interface FormErrors {
  serviceId?: string;
  price?: string;
}

const EMPTY_FORM: FormState = {
  serviceId: "",
  pricingType: "FIXED_MONTHLY",
  monthlyFixedPrice: "",
  hourlyRate: "",
  oneTimePrice: "",
  commissionRatePct: "30",
};

function recordToForm(r: ClientService): FormState {
  return {
    serviceId: r.serviceId,
    pricingType: r.pricingType,
    monthlyFixedPrice: r.monthlyFixedPrice?.toString() ?? "",
    hourlyRate: r.hourlyRate?.toString() ?? "",
    oneTimePrice: r.oneTimePrice?.toString() ?? "",
    commissionRatePct: (r.commissionRatePct ?? 30).toString(),
  };
}

const PRICING_BADGE = "inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300";

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const inputErrorClass =
  "w-full rounded-xl border border-red-500/60 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const labelClass = "mb-1.5 block text-xs font-medium text-zinc-400";

export default function AttachServiceModal({
  mode,
  clientId,
  record,
  services,
  attachedServiceIds,
  onClose,
  onSave,
}: Props) {
  const getInitialForm = (): FormState => {
    if (record && mode !== "add") return recordToForm(record);
    return EMPTY_FORM;
  };

  const [form, setForm] = useState<FormState>(getInitialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  // When service selection changes in add mode, default pricing type to that service's type
  const handleServiceChange = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    setForm((f) => ({
      ...f,
      serviceId,
      pricingType: svc ? svc.pricingType : f.pricingType,
      monthlyFixedPrice: "",
      hourlyRate: "",
      oneTimePrice: "",
      commissionRatePct: "30",
    }));
    setErrors({});
  };

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

    if (!form.serviceId) {
      errs.serviceId = "Please select a service.";
    } else {
      // Duplicate guard: skip own id when editing
      const isDuplicate = attachedServiceIds.includes(form.serviceId) &&
        (mode !== "edit" || form.serviceId !== record?.serviceId);
      if (isDuplicate) {
        errs.serviceId = "This service is already attached to the client.";
      }
    }

    if (form.pricingType === "FIXED_MONTHLY") {
      const v = parseFloat(form.monthlyFixedPrice);
      if (isNaN(v) || v < 0) errs.price = "Enter a valid monthly price.";
    } else if (form.pricingType === "HOURLY") {
      const v = parseFloat(form.hourlyRate);
      if (isNaN(v) || v < 0) errs.price = "Enter a valid hourly rate.";
    } else if (form.pricingType === "FIXED_ONE_TIME") {
      const v = parseFloat(form.oneTimePrice);
      if (isNaN(v) || v < 0) errs.price = "Enter a valid one-time price.";
    }
    // COMMISSION: commissionRatePct defaults to 30 — no required validation

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const base: Omit<ClientService, "id" | "createdAt"> = {
      clientId,
      serviceId: form.serviceId,
      pricingType: form.pricingType,
    };

    if (form.pricingType === "FIXED_MONTHLY") {
      base.monthlyFixedPrice = parseFloat(form.monthlyFixedPrice);
    } else if (form.pricingType === "HOURLY") {
      base.hourlyRate = parseFloat(form.hourlyRate);
    } else if (form.pricingType === "FIXED_ONE_TIME") {
      base.oneTimePrice = parseFloat(form.oneTimePrice);
    } else if (form.pricingType === "COMMISSION") {
      base.commissionRatePct = parseFloat(form.commissionRatePct) || 30;
    }

    onSave(base);
  };

  const isReadOnly = mode === "view";
  const title =
    mode === "add"
      ? "Attach Service"
      : mode === "edit"
      ? "Edit Attached Service"
      : "Attached Service Details";

  // Services not yet attached (for the dropdown in add mode, allow all; duplicates are caught in validation)
  const availableServices = services;

  const selectedService = services.find((s) => s.id === form.serviceId);

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
            {/* Service selector */}
            <div>
              <label className={labelClass}>
                Service{!isReadOnly && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {isReadOnly ? (
                <p className="text-sm text-zinc-100">{selectedService?.name ?? "—"}</p>
              ) : (
                <>
                  <select
                    value={form.serviceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className={`${errors.serviceId ? inputErrorClass : inputClass} appearance-none`}
                    disabled={mode === "edit"}
                  >
                    <option value="" disabled>
                      Select a service…
                    </option>
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.serviceId && (
                    <p className="mt-1 text-xs text-red-400">{errors.serviceId}</p>
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
                      onClick={() => {
                        setForm((f) => ({ ...f, pricingType: pt }));
                        setErrors((e) => ({ ...e, price: undefined }));
                      }}
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

            {/* Pricing inputs */}
            {form.pricingType === "FIXED_MONTHLY" && (
              <div>
                <label className={labelClass}>
                  Monthly Price (€){!isReadOnly && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                {isReadOnly ? (
                  <p className="text-sm text-zinc-100">
                    {form.monthlyFixedPrice ? `${formatEUR(parseFloat(form.monthlyFixedPrice))}/mo` : "—"}
                  </p>
                ) : (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monthlyFixedPrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, monthlyFixedPrice: e.target.value }))
                      }
                      placeholder="0.00"
                      className={errors.price ? inputErrorClass : inputClass}
                    />
                    {errors.price && (
                      <p className="mt-1 text-xs text-red-400">{errors.price}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {form.pricingType === "HOURLY" && (
              <div>
                <label className={labelClass}>
                  Hourly Rate (€){!isReadOnly && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                {isReadOnly ? (
                  <p className="text-sm text-zinc-100">
                    {form.hourlyRate ? `${formatEUR(parseFloat(form.hourlyRate))}/hr` : "—"}
                  </p>
                ) : (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.hourlyRate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, hourlyRate: e.target.value }))
                      }
                      placeholder="0.00"
                      className={errors.price ? inputErrorClass : inputClass}
                    />
                    {errors.price && (
                      <p className="mt-1 text-xs text-red-400">{errors.price}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {form.pricingType === "FIXED_ONE_TIME" && (
              <div>
                <label className={labelClass}>
                  One-Time Price (€){!isReadOnly && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                {isReadOnly ? (
                  <p className="text-sm text-zinc-100">
                    {form.oneTimePrice ? formatEUR(parseFloat(form.oneTimePrice)) : "—"}
                  </p>
                ) : (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.oneTimePrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, oneTimePrice: e.target.value }))
                      }
                      placeholder="0.00"
                      className={errors.price ? inputErrorClass : inputClass}
                    />
                    {errors.price && (
                      <p className="mt-1 text-xs text-red-400">{errors.price}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {form.pricingType === "COMMISSION" && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>Commission Rate (%)</label>
                  {isReadOnly ? (
                    <p className="text-sm text-zinc-100">{form.commissionRatePct ?? 30}%</p>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.commissionRatePct}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, commissionRatePct: e.target.value }))
                      }
                      placeholder="30"
                      className={inputClass}
                    />
                  )}
                </div>
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-3 py-2.5">
                  <p className="text-xs text-zinc-500">
                    Ad spend amounts will be entered in monthly reports. Only the commission rate is
                    configured here.
                  </p>
                </div>
              </div>
            )}
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
                {mode === "add" ? "Attach Service" : "Save Changes"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Remove confirmation modal                                           */
/* ------------------------------------------------------------------ */

interface RemoveConfirmProps {
  serviceName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function RemoveConfirmModal({ serviceName, onClose, onConfirm }: RemoveConfirmProps) {
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
          <h2 className="text-base font-semibold text-zinc-100">Remove service</h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Are you sure you want to remove{" "}
            <span className="font-medium text-zinc-200">{serviceName}</span> from this client?
            This action cannot be undone.
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
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
