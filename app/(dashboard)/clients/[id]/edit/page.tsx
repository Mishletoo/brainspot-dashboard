"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "bs-input mt-1 w-full px-3 py-2 text-sm";

type Client = {
  id: string;
  name: string;
  brand: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export default function EditClientPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, brand, contact_person, email, phone, notes")
        .eq("id", id)
        .single();

      if (error || !data) {
        setErrorMessage("Неуспешно зареждане на клиента. Възможно е да не съществува.");
        setClient(null);
        setIsLoading(false);
        return;
      }

      setClient(data as Client);
      setIsLoading(false);
    };

    fetchClient();
  }, [id]);

  const toNullableText = (value: FormDataEntryValue | null) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed === "" ? null : trimmed;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const name = typeof formData.get("name") === "string" ? formData.get("name")?.toString().trim() : "";
    const brand = toNullableText(formData.get("brand"));
    const contactPerson = toNullableText(formData.get("contact_person"));
    const email = toNullableText(formData.get("email"));
    const phone = toNullableText(formData.get("phone"));
    const notes = toNullableText(formData.get("notes"));

    if (!name) {
      setErrorMessage("Фирма е задължително поле.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("clients")
      .update({
        name,
        brand,
        contact_person: contactPerson,
        email,
        phone,
        notes,
      })
      .eq("id", id);

    if (error) {
      setErrorMessage("Неуспешно обновяване на клиента. Моля, опитайте отново.");
      setIsSaving(false);
      return;
    }

    router.push(`/clients/${id}`);
  };

  const handleCancel = () => {
    router.push(`/clients/${id}`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-[var(--color-bs-muted)]">Зареждане на клиент...</p>
      </div>
    );
  }

  if (errorMessage && !client) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage}
        </div>
        <Link href="/clients" className="mt-4 inline-block text-sm text-[var(--color-bs-muted)] hover:text-[var(--color-bs-text)]">
          ← Назад към клиентите
        </Link>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl text-[var(--color-bs-text)]">
      <div className="mb-6">
        <Link href={`/clients/${id}`} className="mb-2 inline-block text-sm text-[var(--color-bs-muted)] hover:text-[var(--color-bs-text)]">
          ← Назад към клиента
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Редакция на клиент</h1>
        <p className="mt-1 text-sm text-[var(--color-bs-muted)]">
          Промени данните за бранда, фирмата и контактните детайли на клиента.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bs-surface-card rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="brand" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Бранд
            </label>
            <input
              id="brand"
              name="brand"
              type="text"
              className={inputClassName}
              defaultValue={client.brand ?? ""}
            />
          </div>

          <div>
            <label htmlFor="name" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Фирма
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className={inputClassName}
              defaultValue={client.name}
            />
          </div>

          <div>
            <label htmlFor="contact_person" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Контактно лице
            </label>
            <input
              id="contact_person"
              name="contact_person"
              type="text"
              className={inputClassName}
              defaultValue={client.contact_person ?? ""}
            />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Имейл
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={inputClassName}
              defaultValue={client.email ?? ""}
            />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Телефон
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              className={inputClassName}
              defaultValue={client.phone ?? ""}
            />
          </div>

          <div>
            <label htmlFor="notes" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Бележки
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className={`${inputClassName} resize-y`}
              defaultValue={client.notes ?? ""}
            />
          </div>
        </div>

        {errorMessage && client && <p className="mt-4 text-sm text-rose-300">{errorMessage}</p>}

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
            disabled={isSaving}
            className="bs-btn-primary px-4 py-2 text-sm font-medium"
          >
            {isSaving ? "Запазване..." : "Запази промените"}
          </button>
        </div>
      </form>
    </div>
  );
}

