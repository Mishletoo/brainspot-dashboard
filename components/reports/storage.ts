import type { MonthlyReport, ReportStatus, TimeEntry, EditRequest } from "./types";

export const DEMO_EMPLOYEE_ID = "emp_anna_demo";
export const DEMO_EMPLOYEE_NAME = "Anna";

const REPORTS_KEY = "brainspot_monthly_reports_v1";
const ENTRIES_KEY = "brainspot_time_entries_v1";
const EDIT_REQUESTS_KEY = "brainspot_edit_requests_v1";

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Monthly Reports ──────────────────────────────────────────────────────────

export function loadReports(): MonthlyReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MonthlyReport[];
  } catch {
    return [];
  }
}

export function saveReports(reports: MonthlyReport[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch {
    // ignore quota / security errors
  }
}

export function createReportRecord(
  data: Omit<MonthlyReport, "id" | "createdAt">
): MonthlyReport {
  return { ...data, id: genId(), createdAt: new Date().toISOString() };
}

// ─── Time Entries ─────────────────────────────────────────────────────────────

export function loadEntries(): TimeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TimeEntry[];
  } catch {
    return [];
  }
}

export function saveEntries(entries: TimeEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota / security errors
  }
}

export function createEntryRecord(
  data: Omit<TimeEntry, "id" | "createdAt">
): TimeEntry {
  return { ...data, id: genId(), createdAt: new Date().toISOString() };
}

// ─── Edit Requests ────────────────────────────────────────────────────────────

export function loadEditRequests(): EditRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EDIT_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EditRequest[];
  } catch {
    return [];
  }
}

export function saveEditRequests(requests: EditRequest[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EDIT_REQUESTS_KEY, JSON.stringify(requests));
  } catch {
    // ignore quota / security errors
  }
}

export function createEditRequestRecord(
  data: Omit<EditRequest, "id" | "createdAt">
): EditRequest {
  return { ...data, id: genId(), createdAt: new Date().toISOString() };
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export function setReportStatus(reportId: string, status: ReportStatus): void {
  const reports = loadReports();
  const now = new Date().toISOString();
  const updated = reports.map((r) => {
    if (r.id !== reportId) return r;
    return {
      ...r,
      status,
      ...(status === "UNLOCKED" ? { unlockedAt: now } : {}),
    };
  });
  saveReports(updated);
}

export function approveEditRequest(
  id: string,
  adminId: string,
  reason?: string
): void {
  const requests = loadEditRequests();
  const target = requests.find((r) => r.id === id);
  const now = new Date().toISOString();
  const updated = requests.map((r) =>
    r.id === id
      ? {
          ...r,
          status: "APPROVED" as const,
          adminId,
          decidedAt: now,
          ...(reason ? { reason } : {}),
        }
      : r
  );
  saveEditRequests(updated);
  if (target) {
    setReportStatus(target.reportId, "UNLOCKED");
  }
}

export function denyEditRequest(
  id: string,
  adminId: string,
  reason?: string
): void {
  const requests = loadEditRequests();
  const now = new Date().toISOString();
  const updated = requests.map((r) =>
    r.id === id
      ? {
          ...r,
          status: "DENIED" as const,
          adminId,
          decidedAt: now,
          ...(reason ? { reason } : {}),
        }
      : r
  );
  saveEditRequests(updated);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
