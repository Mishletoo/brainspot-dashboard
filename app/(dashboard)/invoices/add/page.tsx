"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "bs-input mt-1 w-full px-3 py-2 text-sm";

const statuses = ["draft", "sent", "waiting", "paid", "overdue"] as const;

type InvoiceStatus = (typeof statuses)[number];

type ClientOption = {
  id: string;
  name: string;
};

export default function AddInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);

      const { data, error } = await supabase.from("clients").select("id, name").order("name", { ascending: true });

      if (error) {
        setErrorMessage("Неуспешно зареждане на клиентите. Моля, опитайте отново.");
        setClients([]);
        setIsLoadingClients(false);
        return;
      }

      setClients(data ?? []);
      setIsLoadingClients(false);
    };

    fetchClients();
  }, []);

  const toNullableText = (value: FormDataEntryValue | null) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed === "" ? null : trimmed;
  };

  const toRequiredText = (value: FormDataEntryValue | null) => {
    return typeof value === "string" ? value.trim() : "";
  };

  const toRequiredNumber = (value: FormDataEntryValue | null) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return null;

    const parsed = Number.parseFloat(text);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    const clientId = toRequiredText(formData.get("client_id"));
    const invoiceNumber = toRequiredText(formData.get("invoice_number"));
    const amount = toRequiredNumber(formData.get("amount"));
    const issueDate = toNullableText(formData.get("issue_date"));
    const dueDate = toNullableText(formData.get("due_date"));
    const status = toRequiredText(formData.get("status")) as InvoiceStatus;
    const notes = toNullableText(formData.get("notes"));

    if (!clientId) {
      setErrorMessage("Клиентът е задължителен.");
      setIsSaving(false);
      return;
    }

    if (!invoiceNumber) {
      setErrorMessage("Номерът на фактурата е задължителен.");
      setIsSaving(false);
      return;
    }

    if (amount == null) {
      setErrorMessage("Сумата е задължителна и трябва да е валидно число.");
      setIsSaving(false);
      return;
    }

    if (!statuses.includes(status)) {
      setErrorMessage("Моля, изберете валиден статус.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("invoices").insert({
      client_id: clientId,
      invoice_number: invoiceNumber,
      amount,
      issue_date: issueDate,
      due_date: dueDate,
      status,
      notes,
    });

    if (error) {
      setErrorMessage("Неуспешно запазване на фактурата. Моля, опитайте отново.");
      setIsSaving(false);
      return;
    }

    router.push("/invoices");
  };

  return (
    <div className="mx-auto w-full max-w-2xl text-[var(--color-bs-text)]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Добавяне на фактура</h1>
        <p className="mt-1 text-sm text-[var(--color-bs-muted)]">Създайте нова фактура, като попълните формата.</p>
      </div>

      <form onSubmit={handleSubmit} className="bs-surface-card rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="client_id" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Клиент
            </label>
            <select id="client_id" name="client_id" required disabled={isLoadingClients} className={inputClassName}>
              <option value="">{isLoadingClients ? "Зареждане на клиенти..." : "Изберете клиент"}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="invoice_number" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Номер на фактура
            </label>
            <input id="invoice_number" name="invoice_number" type="text" required className={inputClassName} />
          </div>

          <div>
            <label htmlFor="amount" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Сума
            </label>
            <input id="amount" name="amount" type="number" min="0" step="0.01" required className={inputClassName} />
          </div>

          <div>
            <label htmlFor="issue_date" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Дата на издаване
            </label>
            <input id="issue_date" name="issue_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="due_date" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Падеж
            </label>
            <input id="due_date" name="due_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="status" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Статус
            </label>
            <select id="status" name="status" required defaultValue="draft" className={inputClassName}>
              {statuses.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {statusValue}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Бележки
            </label>
            <textarea id="notes" name="notes" rows={4} className={`${inputClassName} resize-y`} />
          </div>
        </div>

        {errorMessage && <p className="mt-4 text-sm text-rose-300">{errorMessage}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            disabled={isSaving}
            className="bs-btn px-4 py-2 text-sm font-medium"
          >
            Отказ
          </button>
          <button
            type="submit"
            disabled={isSaving || isLoadingClients}
            className="bs-btn-primary px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Запазване..." : "Запази фактурата"}
          </button>
        </div>
      </form>
    </div>
  );
}
