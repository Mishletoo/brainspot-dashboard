"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "bs-input mt-1 w-full px-3 py-2 text-sm";

type PricingType = "one_time" | "monthly" | "percentage";

type Service = {
  name: string;
  description: string | null;
  pricing_type: PricingType;
  percentage_value: number | null;
};

export default function EditServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const toNullableText = (value: FormDataEntryValue | null) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed === "" ? null : trimmed;
  };

  useEffect(() => {
    const fetchService = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("services")
        .select("name, description, pricing_type, percentage_value")
        .eq("id", serviceId)
        .single();

      if (error || !data) {
        setErrorMessage("Неуспешно зареждане на услугата. Моля, опитайте отново.");
        setService(null);
        setIsLoading(false);
        return;
      }

      setService({
        name: data.name ?? "",
        description: data.description ?? null,
        pricing_type: (data.pricing_type as PricingType) ?? "one_time",
        percentage_value: data.percentage_value != null ? Number(data.percentage_value) : null,
      });
      setIsLoading(false);
    };

    if (serviceId) {
      void fetchService();
    }
  }, [serviceId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const name = typeof formData.get("name") === "string" ? formData.get("name")?.toString().trim() : "";
    const description = toNullableText(formData.get("description"));
    const pricingType =
      typeof formData.get("pricing_type") === "string" ? (formData.get("pricing_type")?.toString() as PricingType) : "";
    const percentageText =
      typeof formData.get("percentage_value") === "string" ? formData.get("percentage_value")?.toString().trim() : "";

    if (!name) {
      setErrorMessage("Името е задължително.");
      setIsSaving(false);
      return;
    }

    if (!pricingType || !["one_time", "monthly", "percentage"].includes(pricingType)) {
      setErrorMessage("Типът на ценообразуване е задължителен.");
      setIsSaving(false);
      return;
    }

    let percentageValue: number | null = null;
    if (pricingType === "percentage") {
      if (!percentageText) {
        setErrorMessage("Процентната стойност е задължителна за този тип ценообразуване.");
        setIsSaving(false);
        return;
      }

      const parsedPercentage = Number(percentageText);
      if (Number.isNaN(parsedPercentage) || parsedPercentage <= 0 || parsedPercentage > 100) {
        setErrorMessage("Процентната стойност трябва да е между 0 и 100.");
        setIsSaving(false);
        return;
      }

      percentageValue = parsedPercentage;
    }

    const { error } = await supabase
      .from("services")
      .update({
        name,
        description,
        pricing_type: pricingType,
        percentage_value: percentageValue,
      })
      .eq("id", serviceId);

    if (error) {
      if (error.code === "23505") {
        setErrorMessage("Вече съществува услуга с това име.");
      } else {
        setErrorMessage("Неуспешно обновяване на услугата. Моля, опитайте отново.");
      }
      setIsSaving(false);
      return;
    }

    router.push("/services");
  };

  const handleCancel = () => {
    router.push("/services");
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="bs-surface-card rounded-xl p-6 text-sm text-[var(--color-bs-muted)]">Зареждане на услуга...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage || "Услугата не е намерена."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl text-[var(--color-bs-text)]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Редакция на услуга</h1>
        <p className="mt-1 text-sm text-[var(--color-bs-muted)]">Обновете детайлите и настройките за ценообразуване.</p>
      </div>

      <form onSubmit={handleSubmit} className="bs-surface-card rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Име
            </label>
            <input id="name" name="name" type="text" required className={inputClassName} defaultValue={service.name} />
          </div>

          <div>
            <label htmlFor="description" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className={`${inputClassName} resize-y`}
              placeholder="Незадължително кратко описание"
              defaultValue={service.description ?? ""}
            />
          </div>

          <div>
            <label htmlFor="pricing_type" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Тип ценообразуване
            </label>
            <select
              id="pricing_type"
              name="pricing_type"
              required
              className={inputClassName}
              defaultValue={service.pricing_type}
            >
              <option value="one_time">Еднократно</option>
              <option value="monthly">Месечно</option>
              <option value="percentage">Процент</option>
            </select>
          </div>

          <div>
            <label htmlFor="percentage_value" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Процентна стойност
            </label>
            <input
              id="percentage_value"
              name="percentage_value"
              type="number"
              step="0.01"
              min="0"
              max="100"
              className={inputClassName}
              placeholder="Само при тип „Процент“"
              defaultValue={service.percentage_value ?? ""}
            />
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
