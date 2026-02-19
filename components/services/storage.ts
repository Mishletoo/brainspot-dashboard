import type { Service } from "./types";

const STORAGE_KEY = "brainspot_services_v1";

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadServices(): Service[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Service[];
  } catch {
    return [];
  }
}

export function saveServices(services: Service[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
  } catch {
    // ignore storage quota / security errors
  }
}

export function createServiceRecord(
  data: Omit<Service, "id" | "createdAt">
): Service {
  return {
    ...data,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
}
