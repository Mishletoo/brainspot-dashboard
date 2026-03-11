"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

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
        setErrorMessage("Could not load clients. Please refresh and try again.");
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
      setErrorMessage("Client is required.");
      setIsSaving(false);
      return;
    }

    if (!invoiceNumber) {
      setErrorMessage("Invoice number is required.");
      setIsSaving(false);
      return;
    }

    if (amount == null) {
      setErrorMessage("Amount is required and must be a valid number.");
      setIsSaving(false);
      return;
    }

    if (!statuses.includes(status)) {
      setErrorMessage("Please select a valid status.");
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
      setErrorMessage("Could not save invoice. Please try again.");
      setIsSaving(false);
      return;
    }

    router.push("/invoices");
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Add Invoice</h1>
        <p className="mt-1 text-sm text-zinc-500">Create a new invoice by filling in the form below.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="client_id" className="text-sm font-medium text-zinc-700">
              Client
            </label>
            <select id="client_id" name="client_id" required disabled={isLoadingClients} className={inputClassName}>
              <option value="">{isLoadingClients ? "Loading clients..." : "Select a client"}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="invoice_number" className="text-sm font-medium text-zinc-700">
              Invoice number
            </label>
            <input id="invoice_number" name="invoice_number" type="text" required className={inputClassName} />
          </div>

          <div>
            <label htmlFor="amount" className="text-sm font-medium text-zinc-700">
              Amount
            </label>
            <input id="amount" name="amount" type="number" min="0" step="0.01" required className={inputClassName} />
          </div>

          <div>
            <label htmlFor="issue_date" className="text-sm font-medium text-zinc-700">
              Issue date
            </label>
            <input id="issue_date" name="issue_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="due_date" className="text-sm font-medium text-zinc-700">
              Due date
            </label>
            <input id="due_date" name="due_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="status" className="text-sm font-medium text-zinc-700">
              Status
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
            <label htmlFor="notes" className="text-sm font-medium text-zinc-700">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={4} className={`${inputClassName} resize-y`} />
          </div>
        </div>

        {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            disabled={isSaving}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isLoadingClients}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
