import type { ClientService } from "./types";

const STORAGE_KEY = "brainspot_client_services_v1";

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadClientServices(): ClientService[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClientService[];
  } catch {
    return [];
  }
}

export function saveClientServices(records: ClientService[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage quota / security errors
  }
}

export function createClientServiceRecord(
  data: Omit<ClientService, "id" | "createdAt">
): ClientService {
  return {
    ...data,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
}
