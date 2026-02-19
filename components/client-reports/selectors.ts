import type { MonthlyReport, TimeEntry } from "@/components/reports/types";
import type { Client } from "@/components/clients/types";
import type { Employee } from "@/components/employees/types";
import type { Service } from "@/components/services/types";
import type { Task } from "@/components/tasks/types";
import type { ClientMonthRow, ClientMonthDetail } from "./types";

function buildReportMonthMap(reports: MonthlyReport[]): Map<string, string> {
  const map = new Map<string, string>();
  reports.forEach((r) => map.set(r.id, r.monthKey));
  return map;
}

function buildNameMap<T extends { id: string }>(
  items: T[],
  getName: (item: T) => string
): Map<string, string> {
  const map = new Map<string, string>();
  items.forEach((item) => map.set(item.id, getName(item)));
  return map;
}

export function buildClientMonthRows(
  monthKey: string,
  clients: Client[],
  reports: MonthlyReport[],
  entries: TimeEntry[],
  services: Service[]
): ClientMonthRow[] {
  const reportMonthMap = buildReportMonthMap(reports);
  const serviceNameMap = buildNameMap(services, (s) => s.name);

  const filtered = entries.filter(
    (e) => reportMonthMap.get(e.reportId) === monthKey
  );

  const rows: ClientMonthRow[] = clients.map((client) => {
    const clientEntries = filtered.filter((e) => e.clientId === client.id);
    const totalHours = clientEntries.reduce((sum, e) => sum + e.hours, 0);
    const employeeCount = new Set(clientEntries.map((e) => e.employeeId)).size;

    const serviceHoursMap = new Map<string, number>();
    clientEntries.forEach((e) => {
      serviceHoursMap.set(
        e.serviceId,
        (serviceHoursMap.get(e.serviceId) ?? 0) + e.hours
      );
    });

    const topServices = [...serviceHoursMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id, hours]) => ({
        serviceName: serviceNameMap.get(id) ?? "Unknown",
        hours,
      }));

    return { client, totalHours, employeeCount, topServices };
  });

  return rows.sort((a, b) => b.totalHours - a.totalHours);
}

export function buildClientMonthDetail(
  clientId: string,
  monthKey: string,
  clients: Client[],
  reports: MonthlyReport[],
  entries: TimeEntry[],
  employees: Employee[],
  services: Service[],
  tasks: Task[]
): ClientMonthDetail | null {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;

  const reportMonthMap = buildReportMonthMap(reports);
  const employeeNameMap = buildNameMap(employees, (e) => e.fullName);
  const serviceNameMap = buildNameMap(services, (s) => s.name);
  const taskNameMap = buildNameMap(tasks, (t) => t.name);

  const filtered = entries.filter(
    (e) =>
      e.clientId === clientId && reportMonthMap.get(e.reportId) === monthKey
  );

  const totalHours = filtered.reduce((sum, e) => sum + e.hours, 0);
  const employeeCount = new Set(filtered.map((e) => e.employeeId)).size;
  const serviceCount = new Set(filtered.map((e) => e.serviceId)).size;
  const taskCount = new Set(filtered.map((e) => e.taskId)).size;

  const empHoursMap = new Map<string, number>();
  filtered.forEach((e) => {
    empHoursMap.set(e.employeeId, (empHoursMap.get(e.employeeId) ?? 0) + e.hours);
  });
  const byEmployee = [...empHoursMap.entries()]
    .map(([id, hours]) => ({
      employeeId: id,
      employeeName: employeeNameMap.get(id) ?? "Unknown",
      hours,
    }))
    .sort((a, b) => b.hours - a.hours);

  const svcHoursMap = new Map<string, number>();
  filtered.forEach((e) => {
    svcHoursMap.set(e.serviceId, (svcHoursMap.get(e.serviceId) ?? 0) + e.hours);
  });
  const byService = [...svcHoursMap.entries()]
    .map(([id, hours]) => ({
      serviceId: id,
      serviceName: serviceNameMap.get(id) ?? "Unknown",
      hours,
    }))
    .sort((a, b) => b.hours - a.hours);

  const taskHoursMap = new Map<string, number>();
  filtered.forEach((e) => {
    taskHoursMap.set(e.taskId, (taskHoursMap.get(e.taskId) ?? 0) + e.hours);
  });
  const byTask = [...taskHoursMap.entries()]
    .map(([id, hours]) => ({
      taskId: id,
      taskName: taskNameMap.get(id) ?? "Unknown",
      hours,
    }))
    .sort((a, b) => b.hours - a.hours);

  const enrichedEntries = filtered
    .map((e) => ({
      ...e,
      employeeName: employeeNameMap.get(e.employeeId) ?? "Unknown",
      serviceName: serviceNameMap.get(e.serviceId) ?? "Unknown",
      taskName: taskNameMap.get(e.taskId) ?? "Unknown",
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    client,
    monthKey,
    totalHours,
    employeeCount,
    serviceCount,
    taskCount,
    byEmployee,
    byService,
    byTask,
    entries: enrichedEntries,
  };
}
