import type { Task } from "./types";

const STORAGE_KEY = "brainspot_tasks_v1";

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // ignore storage quota / security errors
  }
}

export function createTaskRecord(
  data: Omit<Task, "id" | "createdAt">
): Task {
  return {
    ...data,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
}
