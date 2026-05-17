"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "bs-input mt-1 w-full px-3 py-2 text-sm";

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
      setErrorMessage("Клиентът е задължителен.");
      setIsSaving(false);
      return;
    }

    if (!contractName) {
      setErrorMessage("Името на договора е задължително.");
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
      setErrorMessage("Неуспешно запазване на договора. Моля, опитайте отново.");
      setIsSaving(false);
      return;
    }

    router.push("/contracts");
  };

  const handleCancel = () => {
    router.push("/contracts");
  };

  return (
    <div className="mx-auto w-full max-w-2xl text-[var(--color-bs-text)]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Добавяне на договор</h1>
        <p className="mt-1 text-sm text-[var(--color-bs-muted)]">Създайте нов договор, като попълните формата.</p>
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
            <label htmlFor="contract_name" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Име на договор
            </label>
            <input id="contract_name" name="contract_name" type="text" required className={inputClassName} />
          </div>

          <div>
            <label htmlFor="contract_file_url" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Договор (URL)
            </label>
            <input id="contract_file_url" name="contract_file_url" type="url" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="contract_file_upload" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Качване на договор
            </label>
            <input
              id="contract_file_upload"
              name="contract_file_upload"
              type="file"
              className={`${inputClassName} file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-[var(--color-bs-text)]`}
            />
            <p className="mt-1 text-xs text-[var(--color-bs-subtle)]">
              Качването е незадължително. Ако изберете файл, ще се запази името му.
            </p>
          </div>

          <div>
            <label htmlFor="signed_date" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Дата на подписване
            </label>
            <input id="signed_date" name="signed_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="start_date" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Начална дата
            </label>
            <input id="start_date" name="start_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="end_date" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Крайна дата
            </label>
            <input id="end_date" name="end_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="notice_period_days" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Срок на предизвестие (дни)
            </label>
            <input id="notice_period_days" name="notice_period_days" type="number" min={0} className={inputClassName} />
          </div>

          <div>
            <label htmlFor="reminder_days" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Дни за напомняне
            </label>
            <input id="reminder_days" name="reminder_days" type="number" min={0} className={inputClassName} />
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
            onClick={handleCancel}
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
            {isSaving ? "Запазване..." : "Запази договора"}
          </button>
        </div>
      </form>
    </div>
  );
}
