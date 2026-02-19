"use client";

import { useEffect, useRef, useState } from "react";
import type { Client } from "@/components/clients/types";
import type { Service } from "@/components/services/types";
import type { Task } from "@/components/tasks/types";
import type { ClientService } from "@/components/client-services/types";
import type { TimeEntry } from "./types";

type EntryFormData = Omit<TimeEntry, "id" | "reportId" | "employeeId" | "createdAt">;

interface Props {
  entry: TimeEntry;
  clients: Client[];
  clientServices: ClientService[];
  services: Service[];
  tasks: Task[];
  onClose: () => void;
  onSave: (data: EntryFormData) => void;
}

interface FormState {
  clientId: string;
  clientServiceId: string;
  serviceId: string;
  taskId: string;
  hours: string;
  notes: string;
}

interface FormErrors {
  clientServiceId?: string;
  taskId?: string;
  hours?: string;
}

const PRICING_LABELS: Record<string, string> = {
  FIXED_MONTHLY: "Fixed/mo",
  HOURLY: "Hourly",
  COMMISSION: "Commission",
  FIXED_ONE_TIME: "One-time",
};

const selectClass =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-[#0f1116] py-2 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const selectErrorClass =
  "w-full appearance-none rounded-xl border border-red-500/60 bg-[#0f1116] py-2 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const labelClass = "mb-1.5 block text-xs font-medium text-zinc-400";

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function TimeEntryModal({
  entry,
  clients,
  clientServices,
  services,
  tasks,
  onClose,
  onSave,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>({
    clientId: entry.clientId,
    clientServiceId: entry.clientServiceId,
    serviceId: entry.serviceId,
    taskId: entry.taskId,
    hours: String(entry.hours),
    notes: entry.notes ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

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

  const clientServicesForClient = clientServices.filter(
    (cs) => cs.clientId === form.clientId
  );

  const servicesForClient = clientServicesForClient
    .map((cs) => {
      const svc = services.find((s) => s.id === cs.serviceId);
      return { cs, svc };
    })
    .filter((x): x is { cs: ClientService; svc: Service } => x.svc !== undefined);

  const tasksForService = tasks.filter(
    (t) => t.serviceId === form.serviceId && t.isActive
  );

  const handleServiceChange = (clientServiceId: string) => {
    const cs = clientServices.find((x) => x.id === clientServiceId);
    setForm((f) => ({
      ...f,
      clientServiceId,
      serviceId: cs?.serviceId ?? "",
      taskId: "",
    }));
    setErrors((e) => ({ ...e, clientServiceId: undefined, taskId: undefined }));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.clientServiceId) errs.clientServiceId = "Select a service.";
    if (!form.taskId) errs.taskId = "Select a task.";
    const h = parseFloat(form.hours);
    if (!form.hours || isNaN(h) || h < 0.25) {
      errs.hours = "Enter at least 0.25 hours.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      clientId: form.clientId,
      clientServiceId: form.clientServiceId,
      serviceId: form.serviceId,
      taskId: form.taskId,
      hours: parseFloat(form.hours),
      notes: form.notes.trim() || undefined,
    });
  };

  const clientName =
    clients.find((c) => c.id === form.clientId)?.name ?? "Unknown client";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-100">Edit Time Entry</h2>
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 px-6 py-5">
            {/* Client (read-only) */}
            <div>
              <label className={labelClass}>Client</label>
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300">
                {clientName}
              </p>
            </div>

            {/* Service */}
            <div>
              <label className={labelClass}>
                Service <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.clientServiceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className={errors.clientServiceId ? selectErrorClass : selectClass}
                >
                  <option value="" disabled>
                    Select service…
                  </option>
                  {servicesForClient.map(({ cs, svc }) => (
                    <option key={cs.id} value={cs.id}>
                      {svc.name} ({PRICING_LABELS[cs.pricingType] ?? cs.pricingType})
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
              {errors.clientServiceId && (
                <p className="mt-1 text-xs text-red-400">{errors.clientServiceId}</p>
              )}
            </div>

            {/* Task */}
            <div>
              <label className={labelClass}>
                Task <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.taskId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, taskId: e.target.value }))
                  }
                  disabled={!form.serviceId}
                  className={errors.taskId ? selectErrorClass : selectClass}
                >
                  <option value="" disabled>
                    {!form.serviceId ? "Pick service first…" : "Select task…"}
                  </option>
                  {tasksForService.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
              {errors.taskId && (
                <p className="mt-1 text-xs text-red-400">{errors.taskId}</p>
              )}
            </div>

            {/* Hours */}
            <div>
              <label className={labelClass}>
                Hours <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.hours}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hours: e.target.value }))
                }
                step={0.25}
                min={0.25}
                placeholder="0.25"
                className={`w-full rounded-xl border ${errors.hours ? "border-red-500/60" : "border-zinc-700"} bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30`}
              />
              {errors.hours && (
                <p className="mt-1 text-xs text-red-400">{errors.hours}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="e.g. Updated keyword tracking…"
                className={inputClass}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
