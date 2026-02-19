"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/components/services/types";
import {
  createServiceRecord,
  loadServices,
  saveServices,
} from "@/components/services/storage";
import ServiceEmptyState from "@/components/services/ServiceEmptyState";
import ServiceModal, {
  DeleteConfirmModal,
} from "@/components/services/ServiceModal";
import ServiceSearch from "@/components/services/ServiceSearch";
import ServiceTable from "@/components/services/ServiceTable";

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; service: Service }
  | { type: "view"; service: Service }
  | { type: "delete"; service: Service };

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  useEffect(() => {
    setServices(loadServices());
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, search]);

  const persist = (updated: Service[]) => {
    setServices(updated);
    saveServices(updated);
  };

  /** All current names — used for duplicate validation in the modal */
  const existingNames = useMemo(() => services.map((s) => s.name), [services]);

  const handleSave = (data: Omit<Service, "id" | "createdAt">) => {
    if (modal.type === "add") {
      persist([...services, createServiceRecord(data)]);
    } else if (modal.type === "edit") {
      persist(
        services.map((s) =>
          s.id === modal.service.id ? { ...modal.service, ...data } : s
        )
      );
    }
    setModal({ type: "none" });
  };

  const handleDelete = () => {
    if (modal.type !== "delete") return;
    persist(services.filter((s) => s.id !== modal.service.id));
    setModal({ type: "none" });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
      {/* Page header */}
      <div className="flex items-start justify-between px-1 pt-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Services</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Manage the services you offer to clients.
          </p>
        </div>
        <button
          onClick={() => setModal({ type: "add" })}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className="h-3.5 w-3.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Service
        </button>
      </div>

      {/* Search — only shown when services exist */}
      {services.length > 0 && (
        <div className="px-1">
          <ServiceSearch value={search} onChange={setSearch} />
        </div>
      )}

      {/* Main content */}
      {services.length === 0 ? (
        <ServiceEmptyState onAdd={() => setModal({ type: "add" })} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-[#1c212b]">
          <p className="text-sm text-zinc-500">No services match your search.</p>
        </div>
      ) : (
        <ServiceTable
          services={filtered}
          onView={(s) => setModal({ type: "view", service: s })}
          onEdit={(s) => setModal({ type: "edit", service: s })}
          onDelete={(s) => setModal({ type: "delete", service: s })}
          onViewTasks={(s) => router.push(`/tasks?serviceId=${s.id}`)}
        />
      )}

      {/* Modals */}
      {(modal.type === "add" ||
        modal.type === "edit" ||
        modal.type === "view") && (
        <ServiceModal
          mode={modal.type}
          service={modal.type !== "add" ? modal.service : undefined}
          existingNames={existingNames}
          onClose={() => setModal({ type: "none" })}
          onSave={handleSave}
        />
      )}

      {modal.type === "delete" && (
        <DeleteConfirmModal
          service={modal.service}
          onClose={() => setModal({ type: "none" })}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
