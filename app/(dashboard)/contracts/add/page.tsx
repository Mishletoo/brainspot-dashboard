"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

type ClientOption = {
  id: string;
  name: string;
};

export default function AddContractPage() {
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

  const toNullableInt = (value: FormDataEntryValue | null) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return null;

    const parsed = Number.parseInt(text, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const toContractFileValue = (formData: FormData) => {
    const urlValue = toNullableText(formData.get("contract_file_url"));
    if (urlValue) return urlValue;

    const fileValue = formData.get("contract_file_upload");
    if (fileValue instanceof File && fileValue.name) return fileValue.name;

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const clientId = typeof formData.get("client_id") === "string" ? formData.get("client_id")?.toString() : "";
    const contractName =
      typeof formData.get("contract_name") === "string" ? formData.get("contract_name")?.toString().trim() : "";
    const contractFile = toContractFileValue(formData);
    const signedDate = toNullableText(formData.get("signed_date"));
    const startDate = toNullableText(formData.get("start_date"));
    const endDate = toNullableText(formData.get("end_date"));
    const noticePeriodDays = toNullableInt(formData.get("notice_period_days"));
    const reminderDays = toNullableInt(formData.get("reminder_days"));
    const notes = toNullableText(formData.get("notes"));

    if (!clientId) {
      setErrorMessage("Client is required.");
      setIsSaving(false);
      return;
    }

    if (!contractName) {
      setErrorMessage("Contract name is required.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("contracts").insert({
      client_id: clientId,
      contract_name: contractName,
      contract_file: contractFile,
      signed_date: signedDate,
      start_date: startDate,
      end_date: endDate,
      notice_period_days: noticePeriodDays,
      reminder_days: reminderDays,
      notes,
    });

    if (error) {
      setErrorMessage("Could not save contract. Please try again.");
      setIsSaving(false);
      return;
    }

    router.push("/contracts");
  };

  const handleCancel = () => {
    router.push("/contracts");
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Add Contract</h1>
        <p className="mt-1 text-sm text-zinc-500">Create a new contract by filling in the form below.</p>
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
            <label htmlFor="contract_name" className="text-sm font-medium text-zinc-700">
              Contract name
            </label>
            <input id="contract_name" name="contract_name" type="text" required className={inputClassName} />
          </div>

          <div>
            <label htmlFor="contract_file_url" className="text-sm font-medium text-zinc-700">
              Contract file URL
            </label>
            <input id="contract_file_url" name="contract_file_url" type="url" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="contract_file_upload" className="text-sm font-medium text-zinc-700">
              Contract file upload
            </label>
            <input
              id="contract_file_upload"
              name="contract_file_upload"
              type="file"
              className={`${inputClassName} file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-700`}
            />
            <p className="mt-1 text-xs text-zinc-500">Upload is optional. If selected, the file name is saved.</p>
          </div>

          <div>
            <label htmlFor="signed_date" className="text-sm font-medium text-zinc-700">
              Signed date
            </label>
            <input id="signed_date" name="signed_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="start_date" className="text-sm font-medium text-zinc-700">
              Start date
            </label>
            <input id="start_date" name="start_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="end_date" className="text-sm font-medium text-zinc-700">
              End date
            </label>
            <input id="end_date" name="end_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="notice_period_days" className="text-sm font-medium text-zinc-700">
              Notice period days
            </label>
            <input id="notice_period_days" name="notice_period_days" type="number" min={0} className={inputClassName} />
          </div>

          <div>
            <label htmlFor="reminder_days" className="text-sm font-medium text-zinc-700">
              Reminder days
            </label>
            <input id="reminder_days" name="reminder_days" type="number" min={0} className={inputClassName} />
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
            onClick={handleCancel}
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
            {isSaving ? "Saving..." : "Save contract"}
          </button>
        </div>
      </form>
    </div>
  );
}
