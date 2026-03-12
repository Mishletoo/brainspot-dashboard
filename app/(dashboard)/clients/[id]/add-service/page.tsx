"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

type Service = {
  id: string;
  name: string;
};

export default function AddClientServicePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const toNullableText = (value: FormDataEntryValue | null) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed === "" ? null : trimmed;
  };

  const toNullableNumber = (value: FormDataEntryValue | null) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (text === "") return null;
    const parsed = Number(text);
    return Number.isNaN(parsed) ? null : parsed;
  };

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoadingServices(true);
      setErrorMessage("");

      const { data, error } = await supabase.from("services").select("id, name").order("name", { ascending: true });

      if (error) {
        setErrorMessage("Could not load services. Please refresh and try again.");
        setServices([]);
        setIsLoadingServices(false);
        return;
      }

      setServices(data ?? []);
      setIsLoadingServices(false);
    };

    fetchServices();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    const serviceId = typeof formData.get("service_id") === "string" ? formData.get("service_id")?.toString() : "";
    const pricingType =
      typeof formData.get("pricing_type") === "string" ? formData.get("pricing_type")?.toString() : "";

    if (!serviceId) {
      setErrorMessage("Service is required.");
      setIsSaving(false);
      return;
    }

    if (!pricingType || !["one_time", "monthly", "percentage"].includes(pricingType)) {
      setErrorMessage("Pricing type is required.");
      setIsSaving(false);
      return;
    }

    const fixedPrice = toNullableNumber(formData.get("fixed_price"));
    const monthlyPrice = toNullableNumber(formData.get("monthly_price"));
    const percentageRate = toNullableNumber(formData.get("percentage_rate"));
    const notes = toNullableText(formData.get("notes"));

    const { error } = await supabase.from("client_services").insert({
      client_id: clientId,
      service_id: serviceId,
      pricing_type: pricingType,
      fixed_price: fixedPrice,
      monthly_price: monthlyPrice,
      percentage_rate: percentageRate,
      notes,
    });

    if (error) {
      setErrorMessage("Could not attach service. Please try again.");
      setIsSaving(false);
      return;
    }

    router.push(`/clients/${clientId}`);
  };

  const handleCancel = () => {
    router.push(`/clients/${clientId}`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Attach Service</h1>
        <p className="mt-1 text-sm text-zinc-500">Choose a service and pricing details for this client.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="service_id" className="text-sm font-medium text-zinc-700">
              Service
            </label>
            <select id="service_id" name="service_id" required className={inputClassName} disabled={isLoadingServices}>
              <option value="">{isLoadingServices ? "Loading services..." : "Select a service"}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pricing_type" className="text-sm font-medium text-zinc-700">
              Pricing type
            </label>
            <select id="pricing_type" name="pricing_type" required className={inputClassName}>
              <option value="one_time">one_time</option>
              <option value="monthly">monthly</option>
              <option value="percentage">percentage</option>
            </select>
          </div>

          <div>
            <label htmlFor="fixed_price" className="text-sm font-medium text-zinc-700">
              Fixed price
            </label>
            <input id="fixed_price" name="fixed_price" type="number" step="0.01" min="0" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="monthly_price" className="text-sm font-medium text-zinc-700">
              Monthly price
            </label>
            <input id="monthly_price" name="monthly_price" type="number" step="0.01" min="0" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="percentage_rate" className="text-sm font-medium text-zinc-700">
              Percentage rate
            </label>
            <input
              id="percentage_rate"
              name="percentage_rate"
              type="number"
              step="0.0001"
              min="0"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="notes" className="text-sm font-medium text-zinc-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className={`${inputClassName} resize-y`}
              placeholder="Optional notes"
            />
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
            disabled={isSaving || isLoadingServices}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
