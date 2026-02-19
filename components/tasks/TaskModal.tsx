"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "./types";
import type { Service } from "@/components/services/types";

type Mode = "add" | "edit" | "view";

interface TaskModalProps {
  mode: Mode;
  task?: Task;
  services: Service[];
  /** Existing tasks used for duplicate (serviceId + name) validation */
  existingTasks: Task[];
  defaultServiceId?: string;
  onClose: () => void;
  onSave: (data: Omit<Task, "id" | "createdAt">) => void;
}

interface FormState {
  serviceId: string;
  name: string;
  isActive: boolean;
}

interface FormErrors {
  serviceId?: string;
  name?: string;
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const inputErrorClass =
  "w-full rounded-xl border border-red-500/60 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const labelClass = "mb-1.5 block text-xs font-medium text-zinc-400";

export default function TaskModal({
  mode,
  task,
  services,
  existingTasks,
  defaultServiceId,
  onClose,
  onSave,
}: TaskModalProps) {
  const initialForm: FormState =
    task && mode !== "add"
      ? { serviceId: task.serviceId, name: task.name, isActive: task.isActive }
      : { serviceId: defaultServiceId ?? services[0]?.id ?? "", name: "", isActive: true };

  const [form, setForm] = useState<FormState>(initialForm);
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
    if (!form.serviceId) {
      errs.serviceId = "Please select a service.";
    }
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      errs.name = "Task name is required.";
    } else {
      const isDuplicate = existingTasks.some(
        (t) =>
          t.serviceId === form.serviceId &&
          t.name.toLowerCase() === trimmedName.toLowerCase() &&
          (mode !== "edit" || t.id !== task?.id)
      );
      if (isDuplicate) {
        errs.name = "A task with this name already exists for the selected service.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      serviceId: form.serviceId,
      name: form.name.trim(),
      isActive: form.isActive,
    });
  };

  const isReadOnly = mode === "view";
  const title =
    mode === "add" ? "Add Task" : mode === "edit" ? "Edit Task" : "Task Details";

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
            {/* Service */}
            <div>
              <label className={labelClass}>
                Service{!isReadOnly && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {isReadOnly ? (
                <p className="text-sm text-zinc-100">
                  {selectedService?.name ?? "—"}
                </p>
              ) : (
                <>
                  <div className="relative">
                    <select
                      value={form.serviceId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, serviceId: e.target.value }))
                      }
                      className={`appearance-none pr-8 ${errors.serviceId ? inputErrorClass : inputClass}`}
                    >
                      <option value="" disabled>
                        Select a service…
                      </option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                  {errors.serviceId && (
                    <p className="mt-1 text-xs text-red-400">{errors.serviceId}</p>
                  )}
                </>
              )}
            </div>

            {/* Task Name */}
            <div>
              <label className={labelClass}>
                Task Name{!isReadOnly && <span className="ml-0.5 text-red-500">*</span>}
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
                    placeholder="e.g. Monthly reporting"
                    className={errors.name ? inputErrorClass : inputClass}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                  )}
                </>
              )}
            </div>

            {/* Active toggle */}
            <div>
              <label className={labelClass}>Status</label>
              {isReadOnly ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    form.isActive
                      ? "bg-zinc-800 text-zinc-300"
                      : "bg-zinc-800/60 text-zinc-500"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${form.isActive ? "bg-lime-400" : "bg-zinc-600"}`} />
                  {form.isActive ? "Active" : "Inactive"}
                </span>
              ) : (
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isActive: e.target.checked }))
                      }
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full border border-zinc-700 bg-zinc-800 transition peer-checked:border-lime-400/50 peer-checked:bg-lime-400/20" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-zinc-500 transition peer-checked:translate-x-4 peer-checked:bg-lime-400" />
                  </div>
                  <span className="text-sm text-zinc-300">
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
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
                {mode === "add" ? "Add Task" : "Save Changes"}
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
  task: Task;
  serviceName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  task,
  serviceName,
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
          <h2 className="text-base font-semibold text-zinc-100">Delete task</h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-200">{task.name}</span>{" "}
            under{" "}
            <span className="font-medium text-zinc-200">{serviceName}</span>?
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
