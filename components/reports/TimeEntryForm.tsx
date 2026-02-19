"use client";

import { useState } from "react";
import type { Client } from "@/components/clients/types";
import type { Service } from "@/components/services/types";
import type { Task } from "@/components/tasks/types";
import type { ClientService } from "@/components/client-services/types";
import type { TimeEntry } from "./types";
import EmptyStateHints from "./EmptyStateHints";

type EntryFormData = Omit<TimeEntry, "id" | "reportId" | "employeeId" | "createdAt">;

interface Props {
  clients: Client[];
  clientServices: ClientService[];
  services: Service[];
  tasks: Task[];
  onAdd: (data: EntryFormData) => void;
  disabled?: boolean;
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
  clientId?: string;
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
  "w-full appearance-none rounded-xl border border-zinc-700 bg-[#0f1116] py-2 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30 disabled:cursor-not-allowed disabled:opacity-50";
const selectErrorClass =
  "w-full appearance-none rounded-xl border border-red-500/60 bg-[#0f1116] py-2 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
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

const EMPTY: FormState = {
  clientId: "",
  clientServiceId: "",
  serviceId: "",
  taskId: "",
  hours: "",
  notes: "",
};

export default function TimeEntryForm({
  clients,
  clientServices,
  services,
  tasks,
  onAdd,
  disabled = false,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});

  const clientServicesForClient = clientServices.filter(
    (cs) => cs.clientId === form.clientId
  );

  const servicesForClient = clientServicesForClient.map((cs) => {
    const svc = services.find((s) => s.id === cs.serviceId);
    return { cs, svc };
  }).filter((x): x is { cs: ClientService; svc: Service } => x.svc !== undefined);

  const tasksForService = tasks.filter(
    (t) => t.serviceId === form.serviceId && t.isActive
  );

  const noClients = clients.length === 0;
  const noServicesForClient =
    form.clientId !== "" && clientServicesForClient.length === 0;
  const noTasksForService =
    form.serviceId !== "" && tasksForService.length === 0;

  const handleClientChange = (clientId: string) => {
    setForm({ ...EMPTY, clientId });
    setErrors({});
  };

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
    if (!form.clientId) errs.clientId = "Select a client.";
    if (!form.clientServiceId) errs.clientServiceId = "Select a service.";
    if (!form.taskId) errs.taskId = "Select a task.";
    const h = parseFloat(form.hours);
    if (!form.hours || isNaN(h) || h < 0.25) {
      errs.hours = "Enter at least 0.25 hours.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    onAdd({
      clientId: form.clientId,
      clientServiceId: form.clientServiceId,
      serviceId: form.serviceId,
      taskId: form.taskId,
      hours: parseFloat(form.hours),
      notes: form.notes.trim() || undefined,
    });
    setForm(EMPTY);
    setErrors({});
  };

  if (noClients) {
    return (
    <div className="rounded-2xl border border-zinc-800/60 bg-[#1c212b] p-4 shadow-xl">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Add Time Entry
      </p>
      <EmptyStateHints variant="no-clients" />
    </div>
  );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-[#1c212b] p-4 shadow-xl">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Add Time Entry
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Client */}
        <div>
          <label className={labelClass}>
            Client <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={form.clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              disabled={disabled}
              className={errors.clientId ? selectErrorClass : selectClass}
            >
              <option value="" disabled>
                Select client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </div>
          {errors.clientId && (
            <p className="mt-1 text-xs text-red-400">{errors.clientId}</p>
          )}
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
              disabled={disabled || !form.clientId || noServicesForClient}
              className={errors.clientServiceId ? selectErrorClass : selectClass}
            >
              <option value="" disabled>
                {!form.clientId ? "Pick client first…" : "Select service…"}
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
              disabled={disabled || !form.serviceId || noTasksForService}
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
            disabled={disabled}
            className={`w-full rounded-xl border ${
              errors.hours ? "border-red-500/60" : "border-zinc-700"
            } bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30 disabled:cursor-not-allowed disabled:opacity-50`}
          />
          {errors.hours && (
            <p className="mt-1 text-xs text-red-400">{errors.hours}</p>
          )}
        </div>
      </div>

      {/* Inline hints for missing services / tasks */}
      {noServicesForClient && (
        <div className="mt-3">
          <EmptyStateHints
            variant="no-services-for-client"
            clientId={form.clientId}
          />
        </div>
      )}
      {!noServicesForClient && noTasksForService && (
        <div className="mt-3">
          <EmptyStateHints
            variant="no-tasks-for-service"
            serviceId={form.serviceId}
          />
        </div>
      )}

      {/* Notes + Add button */}
      <div className="mt-3 flex items-end gap-3">
        <div className="flex-1">
          <label className={labelClass}>Notes (optional)</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
            placeholder="e.g. Updated keyword tracking, sync call…"
            disabled={disabled}
            className="w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="flex-shrink-0 rounded-xl bg-lime-400 px-5 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add Entry
        </button>
      </div>
    </div>
  );
}
