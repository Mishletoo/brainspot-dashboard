"use client";

import { useEffect, useMemo, useState } from "react";
import type { Client } from "@/components/clients/types";
import {
  createClientRecord,
  loadClients,
  saveClients,
} from "@/components/clients/storage";
import ClientEmptyState from "@/components/clients/ClientEmptyState";
import ClientModal, {
  DeleteConfirmModal,
} from "@/components/clients/ClientModal";
import ClientSearch from "@/components/clients/ClientSearch";
import ClientTable from "@/components/clients/ClientTable";

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; client: Client }
  | { type: "view"; client: Client }
  | { type: "delete"; client: Client };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  useEffect(() => {
    setClients(loadClients());
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false)
    );
  }, [clients, search]);

  const persist = (updated: Client[]) => {
    setClients(updated);
    saveClients(updated);
  };

  const handleSave = (data: Omit<Client, "id" | "createdAt">) => {
    if (modal.type === "add") {
      persist([...clients, createClientRecord(data)]);
    } else if (modal.type === "edit") {
      persist(
        clients.map((c) =>
          c.id === modal.client.id ? { ...modal.client, ...data } : c
        )
      );
    }
    setModal({ type: "none" });
  };

  const handleDelete = () => {
    if (modal.type !== "delete") return;
    persist(clients.filter((c) => c.id !== modal.client.id));
    setModal({ type: "none" });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
      {/* Page header */}
      <div className="flex items-start justify-between px-1 pt-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Clients</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Manage your client records.
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
          Add Client
        </button>
      </div>

      {/* Search — only show when there are clients */}
      {clients.length > 0 && (
        <div className="px-1">
          <ClientSearch value={search} onChange={setSearch} />
        </div>
      )}

      {/* Main content */}
      {clients.length === 0 ? (
        <ClientEmptyState onAdd={() => setModal({ type: "add" })} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-[#1c212b]">
          <p className="text-sm text-zinc-500">No clients match your search.</p>
        </div>
      ) : (
        <ClientTable
          clients={filtered}
          onView={(c) => setModal({ type: "view", client: c })}
          onEdit={(c) => setModal({ type: "edit", client: c })}
          onDelete={(c) => setModal({ type: "delete", client: c })}
        />
      )}

      {/* Modals */}
      {(modal.type === "add" ||
        modal.type === "edit" ||
        modal.type === "view") && (
        <ClientModal
          mode={modal.type}
          client={modal.type !== "add" ? modal.client : undefined}
          onClose={() => setModal({ type: "none" })}
          onSave={handleSave}
        />
      )}

      {modal.type === "delete" && (
        <DeleteConfirmModal
          client={modal.client}
          onClose={() => setModal({ type: "none" })}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
