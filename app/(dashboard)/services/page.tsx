"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Service = {
  id: string;
  name: string;
  description: string | null;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("services")
        .select("id, name, description")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage("Неуспешно зареждане на услугите. Моля, опитайте отново.");
        setServices([]);
        setIsLoading(false);
        return;
      }

      setServices(data ?? []);
      setIsLoading(false);
    };

    fetchServices();
  }, []);

  const handleDeleteService = async (serviceId: string) => {
    const confirmed = window.confirm("Сигурни ли сте, че искате да изтриете тази услуга?");
    if (!confirmed) return;

    setErrorMessage("");
    setDeletingServiceId(serviceId);

    const { error } = await supabase.from("services").delete().eq("id", serviceId);

    if (error) {
      if (error.code === "23503") {
        setErrorMessage("Тази услуга е свързана с клиенти и не може да бъде изтрита.");
      } else {
        setErrorMessage("Неуспешно изтриване на услугата. Моля, опитайте отново.");
      }
      setDeletingServiceId(null);
      return;
    }

    setServices((prev) => prev.filter((service) => service.id !== serviceId));
    setDeletingServiceId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Услуги</h1>
          <p className="text-sm text-zinc-500">Управлявайте каталога с услуги.</p>
        </div>
        <Link
          href="/services/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Добави услуга
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Зареждане на услуги...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && services.length === 0 && (
        <EmptyState
          title="Все още няма услуги"
          description="Добавете услуги в каталога и ги свържете с клиенти с индивидуални цени."
          actionHref="/services/add"
          actionLabel="Добави услуга"
        />
      )}

      {!isLoading && !errorMessage && services.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Име</th>
                <th className="px-4 py-3 font-medium">Описание</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-zinc-100 last:border-b-0">
                  <td className="px-4 py-3 text-zinc-900">{service.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{service.description || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/services/${service.id}/edit`}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Редактирай
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(service.id)}
                        disabled={deletingServiceId === service.id}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingServiceId === service.id ? "Изтриване..." : "Изтрий"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
