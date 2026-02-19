import type { Client } from "./types";

const STORAGE_KEY = "brainspot_clients_v1";

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadClients(): Client[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Client[];
  } catch {
    return [];
  }
}

export function saveClients(clients: Client[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch {
    // ignore storage quota / security errors
  }
}

export function createClientRecord(
  data: Omit<Client, "id" | "createdAt">
): Client {
  return {
    ...data,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
}
