"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

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
        setErrorMessage("Could not load client. It may not exist.");
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
      setErrorMessage("Could not update client. Please try again.");
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
        <p className="text-sm text-zinc-600">Loading client...</p>
      </div>
    );
  }

  if (errorMessage && !client) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
        <Link href="/clients" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Назад към клиентите
        </Link>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <Link href={`/clients/${id}`} className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
          ← Назад към клиента
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Редакция на клиент</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Промени данните за бранда, фирмата и контактните детайли на клиента.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="brand" className="text-sm font-medium text-zinc-700">
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
            <label htmlFor="name" className="text-sm font-medium text-zinc-700">
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
            <label htmlFor="contact_person" className="text-sm font-medium text-zinc-700">
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
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
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
            <label htmlFor="phone" className="text-sm font-medium text-zinc-700">
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
            <label htmlFor="notes" className="text-sm font-medium text-zinc-700">
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

        {errorMessage && client && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Отказ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {isSaving ? "Запазване..." : "Запази промените"}
          </button>
        </div>
      </form>
    </div>
  );
}

