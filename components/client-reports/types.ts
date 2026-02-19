import type { Client } from "@/components/clients/types";
import type { TimeEntry } from "@/components/reports/types";

export interface ClientMonthRow {
  client: Client;
  totalHours: number;
  employeeCount: number;
  topServices: Array<{ serviceName: string; hours: number }>;
}

export interface EnrichedEntry extends TimeEntry {
  employeeName: string;
  serviceName: string;
  taskName: string;
}

export interface ClientMonthDetail {
  client: Client;
  monthKey: string;
  totalHours: number;
  employeeCount: number;
  serviceCount: number;
  taskCount: number;
  byEmployee: Array<{ employeeId: string; employeeName: string; hours: number }>;
  byService: Array<{ serviceId: string; serviceName: string; hours: number }>;
  byTask: Array<{ taskId: string; taskName: string; hours: number }>;
  entries: EnrichedEntry[];
}
