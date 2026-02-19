"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Client } from "@/components/clients/types";
import { loadClients } from "@/components/clients/storage";
import type { Service } from "@/components/services/types";
import { loadServices } from "@/components/services/storage";
import type { ClientService } from "@/components/client-services/types";
import {
  createClientServiceRecord,
  loadClientServices,
  saveClientServices,
} from "@/components/client-services/storage";
import AttachServiceModal, {
  RemoveConfirmModal,
} from "@/components/client-services/AttachServiceModal";
import ClientServicesTable from "@/components/client-services/ClientServicesTable";
import ClientServicesEmptyState from "@/components/client-services/ClientServicesEmptyState";

type Tab = "overview" | "services";

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; record: ClientService }
  | { type: "view"; record: ClientService }
  | { type: "remove"; record: ClientService };

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-100">{value || "—"}</dd>
    </div>
  );
}

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [services, setServices] = useState<Service[]>([]);
  const [clientServices, setClientServices] = useState<ClientService[]>([]);
  const [tab, setTab] = useState<Tab>("services");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  useEffect(() => {
    const allClients = loadClients();
    const found = allClients.find((c) => c.id === clientId) ?? null;
    setClient(found);
    setServices(loadServices());
    const all = loadClientServices();
    setClientServices(all.filter((r) => r.clientId === clientId));
  }, [clientId]);

  const persistClientServices = (updated: ClientService[]) => {
    setClientServices(updated);
    const all = loadClientServices();
    const others = all.filter((r) => r.clientId !== clientId);
    saveClientServices([...others, ...updated]);
  };

  const handleSave = (data: Omit<ClientService, "id" | "createdAt">) => {
    if (modal.type === "add") {
      const newRecord = createClientServiceRecord(data);
      persistClientServices([...clientServices, newRecord]);
    } else if (modal.type === "edit") {
      persistClientServices(
        clientServices.map((r) =>
          r.id === modal.record.id ? { ...modal.record, ...data } : r
        )
      );
    }
    setModal({ type: "none" });
  };

  const handleRemove = () => {
    if (modal.type !== "remove") return;
    persistClientServices(clientServices.filter((r) => r.id !== modal.record.id));
    setModal({ type: "none" });
  };

  // Loading state
  if (client === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  // Not found
  if (client === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-zinc-400">Client not found.</p>
        <Link
          href="/clients"
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
        >
          Back to Clients
        </Link>
      </div>
    );
  }

  const attachedServiceIds = clientServices.map((r) => r.serviceId);

  const removeServiceName =
    modal.type === "remove"
      ? (services.find((s) => s.id === modal.record.serviceId)?.name ?? "this service")
      : "";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
      {/* Header */}
      <div className="flex items-start justify-between px-1 pt-2">
        <div className="flex items-start gap-3">
          <Link
            href="/clients"
            className="mt-0.5 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-3.5 w-3.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Clients
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Client Profile</h1>
            <p className="mt-0.5 text-sm text-zinc-500">{client.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 px-1">
        {(["overview", "services"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? "border-b-2 border-lime-400 text-lime-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="rounded-2xl border border-zinc-800 bg-[#1c212b] px-6 py-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="col-span-2">
              <DetailRow label="Full Name" value={client.name} />
            </div>
            <DetailRow label="Company" value={client.company} />
            <DetailRow label="EIK / UIC" value={client.eik} />
            <DetailRow label="Email" value={client.email} />
            <DetailRow label="Phone" value={client.phone} />
            <div className="col-span-2">
              <dt className="text-xs font-medium text-zinc-500">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-100">
                {client.notes || "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Services tab */}
      {tab === "services" && (
        <div className="flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-zinc-500">
              {clientServices.length === 0
                ? "No services attached yet."
                : `${clientServices.length} service${clientServices.length !== 1 ? "s" : ""} attached.`}
            </p>
            {clientServices.length > 0 && (
              <button
                onClick={() => setModal({ type: "add" })}
                className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
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
                Attach Service
              </button>
            )}
          </div>

          {clientServices.length === 0 ? (
            <ClientServicesEmptyState onAttach={() => setModal({ type: "add" })} />
          ) : (
            <ClientServicesTable
              records={clientServices}
              services={services}
              onView={(r) => setModal({ type: "view", record: r })}
              onEdit={(r) => setModal({ type: "edit", record: r })}
              onRemove={(r) => setModal({ type: "remove", record: r })}
            />
          )}
        </div>
      )}

      {/* Modals */}
      {(modal.type === "add" || modal.type === "edit" || modal.type === "view") && (
        <AttachServiceModal
          mode={modal.type}
          clientId={clientId}
          record={modal.type !== "add" ? modal.record : undefined}
          services={services}
          attachedServiceIds={attachedServiceIds}
          onClose={() => setModal({ type: "none" })}
          onSave={handleSave}
        />
      )}

      {modal.type === "remove" && (
        <RemoveConfirmModal
          serviceName={removeServiceName}
          onClose={() => setModal({ type: "none" })}
          onConfirm={handleRemove}
        />
      )}
    </div>
  );
}
