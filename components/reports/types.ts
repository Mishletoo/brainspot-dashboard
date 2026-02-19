export type ReportStatus = "OPEN" | "SUBMITTED" | "UNLOCKED";
export type EditRequestStatus = "PENDING" | "APPROVED" | "DENIED";

export interface MonthlyReport {
  id: string;
  employeeId: string;
  /** "YYYY-MM" */
  monthKey: string;
  status: ReportStatus;
  submittedAt?: string;
  unlockedAt?: string;
  createdAt: string;
  metaSpend?: number;
  googleSpend?: number;
}

export interface TimeEntry {
  id: string;
  reportId: string;
  employeeId: string;
  clientId: string;
  clientServiceId: string;
  serviceId: string;
  taskId: string;
  hours: number;
  notes?: string;
  createdAt: string;
}

export interface EditRequest {
  id: string;
  reportId: string;
  employeeId: string;
  /** "YYYY-MM" — denormalized for easy display without joining to the report */
  monthKey?: string;
  status: EditRequestStatus;
  createdAt: string;
  adminId?: string;
  decidedAt?: string;
  reason?: string;
}
