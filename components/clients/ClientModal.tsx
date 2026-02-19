"use client";

import { useEffect, useRef, useState } from "react";
import type { Client } from "./types";

type Mode = "add" | "edit" | "view";

interface ClientModalProps {
  mode: Mode;
  client?: Client;
  onClose: () => void;
  onSave: (data: Omit<Client, "id" | "createdAt">) => void;
}

interface FormState {
  name: string;
  company: string;
  eik: string;
  email: string;
  phone: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  email?: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  company: "",
  eik: "",
  email: "",
  phone: "",
  notes: "",
};

function clientToForm(c: Client): FormState {
  return {
    name: c.name,
    company: c.company ?? "",
    eik: c.eik ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    notes: c.notes ?? "",
  };
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const inputErrorClass =
  "w-full rounded-xl border border-red-500/60 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30";
const labelClass = "mb-1.5 block text-xs font-medium text-zinc-400";

export default function ClientModal({ mode, client, onClose, onSave }: ClientModalProps) {
  const [form, setForm] = useState<FormState>(
    client && mode !== "add" ? clientToForm(client) : EMPTY_FORM
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

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      errs.email = "Invalid email address.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      company: form.company.trim() || undefined,
      eik: form.eik.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  const isReadOnly = mode === "view";
  const title =
    mode === "add" ? "Add Client" : mode === "edit" ? "Edit Client" : "Client Details";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
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
          <div className="grid grid-cols-2 gap-4 px-6 py-5">
            {/* Name */}
            <div className="col-span-2">
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
                    onChange={set("name")}
                    placeholder="Full name"
                    className={errors.name ? inputErrorClass : inputClass}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                  )}
                </>
              )}
            </div>

            {/* Company */}
            <div>
              <label className={labelClass}>Company</label>
              {isReadOnly ? (
                <p className="text-sm text-zinc-100">{form.company || "—"}</p>
              ) : (
                <input
                  type="text"
                  value={form.company}
                  onChange={set("company")}
                  placeholder="Company name"
                  className={inputClass}
                />
              )}
            </div>

            {/* EIK */}
            <div>
              <label className={labelClass}>EIK / UIC</label>
              {isReadOnly ? (
                <p className="text-sm text-zinc-100">{form.eik || "—"}</p>
              ) : (
                <input
                  type="text"
                  value={form.eik}
                  onChange={set("eik")}
                  placeholder="123456789"
                  className={inputClass}
                />
              )}
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email</label>
              {isReadOnly ? (
                <p className="text-sm text-zinc-100">{form.email || "—"}</p>
              ) : (
                <>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="email@example.com"
                    className={errors.email ? inputErrorClass : inputClass}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                  )}
                </>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass}>Phone</label>
              {isReadOnly ? (
                <p className="text-sm text-zinc-100">{form.phone || "—"}</p>
              ) : (
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+359 88 888 8888"
                  className={inputClass}
                />
              )}
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className={labelClass}>Notes</label>
              {isReadOnly ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-100">
                  {form.notes || "—"}
                </p>
              ) : (
                <textarea
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="Additional notes…"
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
                {mode === "add" ? "Add Client" : "Save Changes"}
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
  client: Client;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ client, onClose, onConfirm }: DeleteConfirmProps) {
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
          <h2 className="text-base font-semibold text-zinc-100">Delete client</h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-200">{client.name}</span>? This action
            cannot be undone.
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
