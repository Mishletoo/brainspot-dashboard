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
        setErrorMessage("Could not load services. Please refresh and try again.");
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
    const confirmed = window.confirm("Delete this service?");
    if (!confirmed) return;

    setErrorMessage("");
    setDeletingServiceId(serviceId);

    const { error } = await supabase.from("services").delete().eq("id", serviceId);

    if (error) {
      if (error.code === "23503") {
        setErrorMessage("This service is attached to clients and cannot be deleted.");
      } else {
        setErrorMessage("Could not delete service. Please try again.");
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
          <h1 className="text-2xl font-semibold text-zinc-900">Services</h1>
          <p className="text-sm text-zinc-500">Manage your service catalog.</p>
        </div>
        <Link
          href="/services/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add service
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading services...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && services.length === 0 && (
        <EmptyState
          title="No services yet"
          description="Define your service catalog, then attach services to clients with custom pricing."
          actionHref="/services/add"
          actionLabel="Add service"
        />
      )}

      {!isLoading && !errorMessage && services.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-zinc-100 last:border-b-0">
                  <td className="px-4 py-3 text-zinc-900">{service.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{service.description || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id)}
                      disabled={deletingServiceId === service.id}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingServiceId === service.id ? "Deleting..." : "Delete"}
                    </button>
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
