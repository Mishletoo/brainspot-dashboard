"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { resolveAppRole, type AppRole } from "@/lib/roles";

type ExpiringContract = {
  id: string;
  contract_name: string;
  end_date: string;
  client_name: string;
  days_left: number;
};

type SummaryMetrics = {
  activeClients: number;
  activeContracts: number;
  unpaidInvoices: number;
  overdueInvoices: number;
};

type EmployeeTaskRow = {
  id: string;
  clientName: string;
  taskName: string;
  priority: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  isOverdue: boolean;
};

type EmployeeDashboardData = {
  myTasks: number;
  inProgress: number;
  completedThisMonth: number;
  workedHoursThisMonth: number;
  tasks: EmployeeTaskRow[];
  monthStatus: "draft" | "submitted" | "locked";
};

type AdminTopEmployee = {
  id: string;
  name: string;
  taskCount: number;
};

type UpcomingInvoice = {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  amount: number;
  clientName: string;
  status: string;
};

type PendingReport = {
  id: string;
  employeeName: string;
  status: string;
};

type TeamWorkloadRow = {
  employeeId: string;
  employeeName: string;
  position: string | null;
  totalTasks: number;
  totalWorkedHours: number;
  monthlyTargetHours: number | null;
  remainingHours: number | null;
  activeClients: number;
};

type ClientCostEmployeeDetail = {
  employeeId: string;
  employeeName: string;
  hours: number;
  hourlyRate: number | null;
  cost: number | null;
};

type ClientCostRow = {
  clientId: string;
  clientName: string;
  totalWorkedHours: number;
  totalEmployeeCost: number | null;
  totalTasks: number;
  employeesInvolved: string[];
  employeeDetails: ClientCostEmployeeDetail[];
};

type TeamOverviewData = {
  topEmployees: AdminTopEmployee[];
  unsubmittedReports: number;
  waitingReview: number;
  employeesWithoutActivity: number;
};

type AdminDashboardData = {
  metrics: SummaryMetrics;
  expiringContracts: ExpiringContract[];
  teamOverview: TeamOverviewData;
  upcomingInvoices: UpcomingInvoice[];
  pendingReports: PendingReport[];
  teamWorkload: TeamWorkloadRow[];
  clientCostBoard: ClientCostRow[];
};

type RoleContext = {
  role: AppRole;
  employeeId: string | null;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}.${month}.${year}`;
}

function getStatusClasses(daysLeft: number) {
  if (daysLeft <= 30) {
    return "bs-status-danger";
  }

  if (daysLeft <= 60) {
    return "bs-status-warning";
  }

  return "bs-status-neutral";
}

function monthBounds(date = new Date()) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatCurrencyEUR(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeNumeric(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeNullableNumeric(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function toRelationObject<T extends Record<string, unknown>>(value: unknown): T | null {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object") return first as T;
    return null;
  }
  if (value && typeof value === "object") return value as T;
  return null;
}

function resolveEmployeeDisplayName({
  fullName,
  employeeEmail,
  hasEmployeeRecord,
}: {
  fullName: string;
  employeeEmail: string | null;
  hasEmployeeRecord: boolean;
}) {
  const trimmedFullName = fullName.trim();
  if (trimmedFullName.length > 0) return trimmedFullName;
  if (employeeEmail && employeeEmail.trim().length > 0) return employeeEmail.trim();
  if (hasEmployeeRecord) return "Служител";
  return "Неразпознат служител";
}

function formatDateRange(startDate: string | null, endDate: string | null, createdAt: string | null) {
  const toBulgarian = (isoValue: string | null) => {
    if (!isoValue) return null;
    const base = isoValue.slice(0, 10);
    if (!base) return null;
    const [year, month, day] = base.split("-");
    if (!year || !month || !day) return null;
    return `${day}.${month}.${year}`;
  };

  const start = toBulgarian(startDate);
  const end = toBulgarian(endDate);

  if (start && end && start !== end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;

  const created = toBulgarian(createdAt);
  return created ?? "-";
}

function statusLabel(status: string, isOverdue: boolean) {
  if (isOverdue) return "Просрочена";
  if (status === "done") return "Приключена";
  if (status === "in_progress") return "В процес";
  if (status === "started") return "Започната";
  return "Чакаща";
}

function priorityLabel(priority: string | null) {
  if (priority === "urgent") return "Спешен";
  if (priority === "high") return "Висок";
  if (priority === "normal") return "Нормален";
  if (priority === "low") return "Нисък";
  return "—";
}

function monthlyReportStatusDisplayLabel(status: string) {
  const normalized = status.toLowerCase().trim();
  if (normalized === "draft") return "Чернова";
  if (normalized === "submitted") return "Изпратен";
  if (normalized === "pending_review") return "Чака преглед";
  if (normalized === "approved") return "Одобрен";
  if (normalized === "locked") return "Заключен";
  if (normalized === "finalized") return "Финализиран";
  return status;
}

function monthStatusFromRow(row: Record<string, unknown> | null): "draft" | "submitted" | "locked" {
  if (!row) return "draft";
  const status = String(row.status ?? "").toLowerCase().trim();
  const submittedAt = typeof row.submitted_at === "string" && row.submitted_at.trim().length > 0;
  const lockedAt = typeof row.locked_at === "string" && row.locked_at.trim().length > 0;
  const isLocked = lockedAt || ["locked", "approved", "finalized"].includes(status);
  if (isLocked) return "locked";
  const isSubmitted = submittedAt || ["submitted", "pending_review", "approved"].includes(status);
  return isSubmitted ? "submitted" : "draft";
}

async function getCurrentRoleContext(): Promise<RoleContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { role: "employee", employeeId: null };

  const { data: employeeByAuth } = await supabase
    .from("employees")
    .select("id, app_role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employeeByAuth) {
    return {
      role: resolveAppRole(employeeByAuth.app_role),
      employeeId: String(employeeByAuth.id ?? ""),
    };
  }

  if (!user.email) return { role: "employee", employeeId: null };

  const { data: employeeByEmail } = await supabase
    .from("employees")
    .select("id, app_role")
    .ilike("email", user.email)
    .maybeSingle();

  return {
    role: resolveAppRole(employeeByEmail?.app_role),
    employeeId: employeeByEmail?.id ? String(employeeByEmail.id) : null,
  };
}

async function fetchEmployeeDashboardData(employeeId: string | null): Promise<EmployeeDashboardData> {
  const baseData: EmployeeDashboardData = {
    myTasks: 0,
    inProgress: 0,
    completedThisMonth: 0,
    workedHoursThisMonth: 0,
    tasks: [],
    monthStatus: "draft",
  };

  if (!employeeId) return baseData;

  const { year, month } = monthBounds();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ data: monthRow, error: monthError }, { data: rows, error: rowsError }] = await Promise.all([
    supabase
      .from("monthly_reports")
      .select("id, status, submitted_at, locked_at")
      .eq("employee_id", employeeId)
      .eq("report_year", year)
      .eq("report_month", month)
      .maybeSingle(),
    supabase
      .from("work_report_items")
      .select(
        "id, hours, task_status, priority, start_date, end_date, created_at, clients(name), tasks(name), monthly_reports!inner(employee_id, report_month, report_year)"
      )
      .eq("monthly_reports.employee_id", employeeId)
      .eq("monthly_reports.report_year", year)
      .eq("monthly_reports.report_month", month)
      .order("created_at", { ascending: false }),
  ]);

  if (monthError || rowsError) {
    throw new Error("Неуспешно зареждане на данни за служителското табло.");
  }

  const normalizedRows: EmployeeTaskRow[] = (rows ?? []).map((row: any) => {
    const endDate = typeof row.end_date === "string" ? row.end_date : null;
    const status = String(row.task_status ?? "waiting");
    const isDone = status === "done";
    const end = endDate ? new Date(endDate.slice(0, 10)) : null;
    if (end) end.setHours(0, 0, 0, 0);
    const isOverdue = Boolean(end && end.getTime() < today.getTime() && !isDone);

    return {
      id: String(row.id ?? ""),
      clientName: String(row.clients?.name ?? "—"),
      taskName: String(row.tasks?.name ?? "—"),
      priority: row.priority ? String(row.priority) : null,
      status,
      startDate: typeof row.start_date === "string" ? row.start_date : null,
      endDate,
      createdAt: typeof row.created_at === "string" ? row.created_at : null,
      isOverdue,
    };
  });

  const sortWeight = (task: EmployeeTaskRow) => {
    if (task.isOverdue) return 0;
    if (task.status === "waiting") return 1;
    if (task.status === "in_progress") return 2;
    if (task.status === "started") return 3;
    if (task.status === "done") return 4;
    return 5;
  };

  normalizedRows.sort((a, b) => {
    const byWeight = sortWeight(a) - sortWeight(b);
    if (byWeight !== 0) return byWeight;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

  const inProgress = normalizedRows.filter((row) => row.status === "in_progress" || row.status === "started").length;
  const completedThisMonth = normalizedRows.filter((row) => row.status === "done").length;
  const workedHoursThisMonth = (rows ?? []).reduce((acc: number, row: any) => acc + Number(row.hours ?? 0), 0);

  return {
    myTasks: normalizedRows.length,
    inProgress,
    completedThisMonth,
    workedHoursThisMonth,
    tasks: normalizedRows,
    monthStatus: monthStatusFromRow((monthRow ?? null) as Record<string, unknown> | null),
  };
}

async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const { year, month } = monthBounds();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split("T")[0];

  const contractLimit = new Date(today);
  contractLimit.setDate(contractLimit.getDate() + 60);
  const contractLimitString = contractLimit.toISOString().split("T")[0];

  const invoiceLimit = new Date(today);
  invoiceLimit.setDate(invoiceLimit.getDate() + 30);
  const invoiceLimitString = invoiceLimit.toISOString().split("T")[0];

  const adminEmployeesPromise = fetch("/api/employees", { method: "GET" });

  const [
    activeClientsResult,
    activeContractsResult,
    unpaidInvoicesResult,
    overdueInvoicesResult,
    expiringContractsResult,
    monthlyReportsResult,
    workItemsResult,
    upcomingInvoicesResult,
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .or(`end_date.is.null,end_date.gte.${todayString}`),
    supabase.from("invoices").select("*", { count: "exact", head: true }).neq("status", "paid"),
    supabase.from("invoices").select("*", { count: "exact", head: true }).neq("status", "paid").lt("due_date", todayString),
    supabase
      .from("contracts")
      .select("id, contract_name, end_date, clients(name)")
      .not("end_date", "is", null)
      .gte("end_date", todayString)
      .lte("end_date", contractLimitString)
      .order("end_date", { ascending: true }),
    supabase
      .from("monthly_reports")
      .select("id, employee_id, status, submitted_at, locked_at, employees(first_name, last_name, email, auth_user_id)")
      .eq("report_year", year)
      .eq("report_month", month),
    supabase
      .from("work_report_items")
      .select("id, monthly_report_id, hours, client_id, clients(name), monthly_reports!inner(employee_id, report_year, report_month)")
      .eq("monthly_reports.report_year", year)
      .eq("monthly_reports.report_month", month),
    supabase
      .from("invoices")
      .select("id, invoice_number, due_date, amount, status, clients(name)")
      .neq("status", "paid")
      .gte("due_date", todayString)
      .lte("due_date", invoiceLimitString)
      .order("due_date", { ascending: true }),
  ]);

  if (
    activeClientsResult.error ||
    activeContractsResult.error ||
    unpaidInvoicesResult.error ||
    overdueInvoicesResult.error ||
    expiringContractsResult.error ||
    monthlyReportsResult.error ||
    workItemsResult.error ||
    upcomingInvoicesResult.error
  ) {
    throw new Error("Неуспешно зареждане на данни за администраторското табло.");
  }

  const adminEmployeesResponse = await adminEmployeesPromise;
  const adminEmployeesPayload = (await adminEmployeesResponse.json().catch(() => null)) as
    | {
        employees?: Array<{
          id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          position?: string | null;
          monthly_hours?: number | null;
          hourly_cost?: number | null;
        }>;
        error?: string;
      }
    | null;

  if (!adminEmployeesResponse.ok) {
    throw new Error(adminEmployeesPayload?.error ?? "Неуспешно зареждане на служителите за админ таблото.");
  }

  const metrics: SummaryMetrics = {
    activeClients: activeClientsResult.count ?? 0,
    activeContracts: activeContractsResult.count ?? 0,
    unpaidInvoices: unpaidInvoicesResult.count ?? 0,
    overdueInvoices: overdueInvoicesResult.count ?? 0,
  };

  const expiringContracts: ExpiringContract[] = (expiringContractsResult.data ?? []).map((item: any) => {
    const endDate = new Date(item.end_date);
    endDate.setHours(0, 0, 0, 0);
    const millisecondsDiff = endDate.getTime() - today.getTime();
    const daysLeft = Math.round(millisecondsDiff / (1000 * 60 * 60 * 24));

    return {
      id: String(item.id ?? ""),
      contract_name: String(item.contract_name ?? ""),
      end_date: String(item.end_date ?? ""),
      client_name: String(item.clients?.name ?? "-"),
      days_left: daysLeft,
    };
  });

  const employees = (adminEmployeesPayload?.employees ?? []).map((row: any) => {
    const id = String(row.id ?? "");
    const fullName = `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim();
    const employeeEmail = typeof row.email === "string" ? row.email : null;
    const position = typeof row.position === "string" && row.position.trim().length > 0 ? row.position.trim() : null;
    return {
      id,
      displayName: resolveEmployeeDisplayName({ fullName, employeeEmail, hasEmployeeRecord: true }),
      position,
      monthlyTargetHours: normalizeNullableNumeric(row.monthly_hours),
      hourlyRate: normalizeNullableNumeric(row.hourly_cost),
      employeeEmail,
    };
  });
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  const monthlyReports = (monthlyReportsResult.data ?? []).map((row: any) => {
    const employeeRelation = toRelationObject<{ first_name?: unknown; last_name?: unknown; email?: unknown }>(row.employees);
    const employeeId = String(row.employee_id ?? "");
    const employeeFromMap = employeeById.get(employeeId);
    const status = String(row.status ?? "draft").toLowerCase().trim();
    const submittedAt = typeof row.submitted_at === "string" && row.submitted_at.trim().length > 0;
    const lockedAt = typeof row.locked_at === "string" && row.locked_at.trim().length > 0;
    const employeeName = resolveEmployeeDisplayName({
      fullName:
        employeeFromMap?.displayName && employeeFromMap.displayName !== "Служител"
          ? employeeFromMap.displayName
          : `${String(employeeRelation?.first_name ?? "")} ${String(employeeRelation?.last_name ?? "")}`.trim(),
      employeeEmail:
        employeeFromMap?.employeeEmail ?? (typeof employeeRelation?.email === "string" ? employeeRelation.email : null),
      hasEmployeeRecord: Boolean(employeeFromMap),
    });
    return {
      id: String(row.id ?? ""),
      employeeId,
      status,
      submittedAt,
      lockedAt,
      employeeName,
    };
  });
  const employeeDisplayNameById = new Map<string, string>();
  monthlyReports.forEach((report) => {
    if (!report.employeeId) return;
    employeeDisplayNameById.set(report.employeeId, report.employeeName);
  });
  employees.forEach((employee) => {
    if (!employee.id) return;
    if (!employeeDisplayNameById.has(employee.id)) {
      employeeDisplayNameById.set(employee.id, employee.displayName);
    }
  });
  const monthlyReportEmployeeIdById = new Map(
    monthlyReports
      .filter((report) => report.id && report.employeeId)
      .map((report) => [report.id, report.employeeId]),
  );

  const taskCountByEmployee = new Map<string, number>();
  (workItemsResult.data ?? []).forEach((row: any) => {
    const monthlyReportRelation = toRelationObject<{ employee_id?: unknown }>(row.monthly_reports);
    const employeeIdFromRelation = String(monthlyReportRelation?.employee_id ?? "");
    const employeeIdFromReportLookup = monthlyReportEmployeeIdById.get(String(row.monthly_report_id ?? "")) ?? "";
    const employeeId = employeeIdFromRelation || employeeIdFromReportLookup;
    if (!employeeId) return;
    taskCountByEmployee.set(employeeId, (taskCountByEmployee.get(employeeId) ?? 0) + 1);
  });

  const topEmployees: AdminTopEmployee[] = [...taskCountByEmployee.entries()]
    .map(([employeeId, count]) => ({
      id: employeeId,
      name:
        employeeDisplayNameById.get(employeeId) ??
        resolveEmployeeDisplayName({
          fullName: "",
          employeeEmail: null,
          hasEmployeeRecord: false,
        }),
      taskCount: count,
    }))
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 5);

  const unsubmittedReports = monthlyReports.filter((report) => {
    const isSubmitted = report.submittedAt || ["submitted", "pending_review", "approved"].includes(report.status);
    const isLocked = report.lockedAt || ["locked", "approved", "finalized"].includes(report.status);
    return !isSubmitted && !isLocked;
  }).length;

  const waitingReview = monthlyReports.filter((report) => {
    const isSubmitted = report.submittedAt || ["submitted", "pending_review", "approved"].includes(report.status);
    const isLocked = report.lockedAt || ["locked", "approved", "finalized"].includes(report.status);
    return isSubmitted && !isLocked;
  }).length;

  const activeEmployees = new Set([...taskCountByEmployee.keys()]);
  const employeesWithoutActivity = employees.filter((employee) => !activeEmployees.has(employee.id)).length;

  const upcomingInvoices: UpcomingInvoice[] = (upcomingInvoicesResult.data ?? []).map((row: any) => ({
    id: String(row.id ?? ""),
    invoiceNumber: String(row.invoice_number ?? "—"),
    dueDate: String(row.due_date ?? ""),
    amount: Number(row.amount ?? 0),
    clientName: String(row.clients?.name ?? "—"),
    status: String(row.status ?? "draft"),
  }));

  const pendingReports: PendingReport[] = monthlyReports
    .filter((report) => {
      const isSubmitted = report.submittedAt || ["submitted", "pending_review", "approved"].includes(report.status);
      const isLocked = report.lockedAt || ["locked", "approved", "finalized"].includes(report.status);
      return isSubmitted && !isLocked;
    })
    .map((report) => ({
      id: report.id,
      employeeName: report.employeeName,
      status: report.status,
    }))
    .slice(0, 8);

  const workloadByEmployeeId = new Map<
    string,
    {
      employeeId: string;
      employeeName: string;
      position: string | null;
      totalTasks: number;
      totalWorkedHours: number;
      monthlyTargetHours: number | null;
      activeClientIds: Set<string>;
    }
  >();

  for (const employee of employees) {
    workloadByEmployeeId.set(employee.id, {
      employeeId: employee.id,
      employeeName: employee.displayName,
      position: employee.position,
      totalTasks: 0,
      totalWorkedHours: 0,
      monthlyTargetHours: employee.monthlyTargetHours,
      activeClientIds: new Set<string>(),
    });
  }

  const clientCostById = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      totalWorkedHours: number;
      totalTasks: number;
      totalEmployeeCost: number;
      hasKnownEmployeeCost: boolean;
      employeeNames: Set<string>;
      employeeDetailsById: Map<string, ClientCostEmployeeDetail>;
    }
  >();

  (workItemsResult.data ?? []).forEach((row: any) => {
    const monthlyReportRelation = toRelationObject<{ employee_id?: unknown }>(row.monthly_reports);
    const employeeIdFromRelation = String(monthlyReportRelation?.employee_id ?? "");
    const employeeIdFromReportLookup = monthlyReportEmployeeIdById.get(String(row.monthly_report_id ?? "")) ?? "";
    const employeeId = employeeIdFromRelation || employeeIdFromReportLookup;
    if (!employeeId) return;

    const employee = employeeById.get(employeeId);
    const employeeName =
      employeeDisplayNameById.get(employeeId) ??
      resolveEmployeeDisplayName({
        fullName: "",
        employeeEmail: null,
        hasEmployeeRecord: false,
      });
    const hourlyRate = employee?.hourlyRate ?? null;
    const hours = normalizeNumeric(row.hours);
    const cost = hourlyRate != null ? hours * hourlyRate : null;

    const employeeWorkload =
      workloadByEmployeeId.get(employeeId) ??
      {
        employeeId,
        employeeName,
        position: null,
        totalTasks: 0,
        totalWorkedHours: 0,
        monthlyTargetHours: null,
        activeClientIds: new Set<string>(),
      };
    employeeWorkload.totalTasks += 1;
    employeeWorkload.totalWorkedHours += hours;
    const clientId = typeof row.client_id === "string" ? row.client_id : row.client_id != null ? String(row.client_id) : "";
    if (clientId) {
      employeeWorkload.activeClientIds.add(clientId);
    }
    workloadByEmployeeId.set(employeeId, employeeWorkload);

    const normalizedClientId = clientId || "none";
    const clientRelation = toRelationObject<{ name?: unknown }>(row.clients);
    const clientName =
      normalizedClientId === "none"
        ? "Без клиент"
        : typeof clientRelation?.name === "string" && clientRelation.name.trim().length > 0
          ? clientRelation.name.trim()
          : "Неизвестен клиент";

    const existingClientCost =
      clientCostById.get(normalizedClientId) ??
      {
        clientId: normalizedClientId,
        clientName,
        totalWorkedHours: 0,
        totalTasks: 0,
        totalEmployeeCost: 0,
        hasKnownEmployeeCost: false,
        employeeNames: new Set<string>(),
        employeeDetailsById: new Map<string, ClientCostEmployeeDetail>(),
      };

    existingClientCost.totalWorkedHours += hours;
    existingClientCost.totalTasks += 1;
    existingClientCost.employeeNames.add(employeeName);
    if (cost != null) {
      existingClientCost.totalEmployeeCost += cost;
      existingClientCost.hasKnownEmployeeCost = true;
    }

    const employeeDetail =
      existingClientCost.employeeDetailsById.get(employeeId) ??
      {
        employeeId,
        employeeName,
        hours: 0,
        hourlyRate,
        cost: null,
      };
    employeeDetail.hours += hours;
    if (employeeDetail.hourlyRate == null && hourlyRate != null) {
      employeeDetail.hourlyRate = hourlyRate;
    }
    if (employeeDetail.hourlyRate != null) {
      employeeDetail.cost = employeeDetail.hours * employeeDetail.hourlyRate;
    }
    existingClientCost.employeeDetailsById.set(employeeId, employeeDetail);
    clientCostById.set(normalizedClientId, existingClientCost);
  });

  const teamWorkload: TeamWorkloadRow[] = Array.from(workloadByEmployeeId.values())
    .map((row) => {
      const remainingHours =
        row.monthlyTargetHours != null ? row.monthlyTargetHours - row.totalWorkedHours : null;
      return {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        position: row.position,
        totalTasks: row.totalTasks,
        totalWorkedHours: row.totalWorkedHours,
        monthlyTargetHours: row.monthlyTargetHours,
        remainingHours,
        activeClients: row.activeClientIds.size,
      };
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "bg-BG"));

  const clientCostBoard: ClientCostRow[] = Array.from(clientCostById.values())
    .map((row) => ({
      clientId: row.clientId,
      clientName: row.clientName,
      totalWorkedHours: row.totalWorkedHours,
      totalEmployeeCost: row.hasKnownEmployeeCost ? row.totalEmployeeCost : null,
      totalTasks: row.totalTasks,
      employeesInvolved: Array.from(row.employeeNames).sort((a, b) => a.localeCompare(b, "bg-BG")),
      employeeDetails: Array.from(row.employeeDetailsById.values())
        .map((detail) => ({
          ...detail,
          cost: detail.hourlyRate != null ? detail.hours * detail.hourlyRate : null,
        }))
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "bg-BG")),
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName, "bg-BG"));

  return {
    metrics,
    expiringContracts,
    teamOverview: {
      topEmployees,
      unsubmittedReports,
      waitingReview,
      employeesWithoutActivity,
    },
    upcomingInvoices,
    pendingReports,
    teamWorkload,
    clientCostBoard,
  };
}

export default function Home() {
  const [roleContext, setRoleContext] = useState<RoleContext>({
    role: "employee",
    employeeId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [employeeData, setEmployeeData] = useState<EmployeeDashboardData>({
    myTasks: 0,
    inProgress: 0,
    completedThisMonth: 0,
    workedHoursThisMonth: 0,
    tasks: [],
    monthStatus: "draft",
  });
  const [adminData, setAdminData] = useState<AdminDashboardData>({
    metrics: {
      activeClients: 0,
      activeContracts: 0,
      unpaidInvoices: 0,
      overdueInvoices: 0,
    },
    expiringContracts: [],
    teamOverview: {
      topEmployees: [],
      unsubmittedReports: 0,
      waitingReview: 0,
      employeesWithoutActivity: 0,
    },
    upcomingInvoices: [],
    pendingReports: [],
    teamWorkload: [],
    clientCostBoard: [],
  });
  const [expandedClientRows, setExpandedClientRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const roleDetails = await getCurrentRoleContext();
        setRoleContext(roleDetails);

        if (roleDetails.role === "employee") {
          setExpandedClientRows({});
          const employeeDashboard = await fetchEmployeeDashboardData(roleDetails.employeeId);
          setEmployeeData(employeeDashboard);
        } else {
          const adminDashboard = await fetchAdminDashboardData();
          setAdminData(adminDashboard);
          setExpandedClientRows({});
        }
      } catch {
        setErrorMessage("Неуспешно зареждане на данните за таблото. Моля, опитайте отново.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const isEmployeeView = roleContext.role === "employee";

  const monthStatusLabel =
    employeeData.monthStatus === "locked"
      ? "Заключен"
      : employeeData.monthStatus === "submitted"
        ? "Изпратен"
        : "Чернова";

  const monthStatusClasses =
    employeeData.monthStatus === "locked"
      ? "bs-status-danger"
      : employeeData.monthStatus === "submitted"
        ? "bs-status-info"
        : "bs-status-neutral";

  const toggleClientRow = (clientId: string) => {
    setExpandedClientRows((previous) => ({
      ...previous,
      [clientId]: !previous[clientId],
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Табло</h1>
        <p className="text-sm text-[var(--color-bs-muted)]">
          {isEmployeeView ? "Вашият продуктивен преглед за текущия месец." : "Оперативен преглед за екипа и бизнеса."}
        </p>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-[var(--color-bs-border-soft)] bg-white/5 p-4 text-sm text-[var(--color-bs-muted)] shadow-[0_12px_26px_-22px_rgba(0,0,0,0.9)]">
          Зареждане...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && isEmployeeView && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="flex flex-col gap-4">
            <section className="bs-surface-card overflow-hidden rounded-xl">
              <div className="grid grid-cols-1 divide-y divide-[var(--color-bs-border-soft)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex flex-col gap-0.5 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-bs-subtle)]">Моите задачи</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">{employeeData.myTasks}</p>
                </div>
                <div className="flex flex-col gap-0.5 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-bs-subtle)]">В процес</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">{employeeData.inProgress}</p>
                </div>
                <div className="flex flex-col gap-0.5 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-bs-subtle)]">
                    Завършени този месец
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">{employeeData.completedThisMonth}</p>
                </div>
              </div>
            </section>

            <section className="bs-surface-card overflow-hidden rounded-xl">
              <div className="flex items-center justify-between border-b border-[var(--color-bs-border-soft)] bg-white/5 px-4 py-3">
                <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Днешни / активни задачи</h2>
                <Link
                  href="/tasks"
                  className="text-xs font-medium text-[var(--color-bs-muted)] transition-colors hover:text-[var(--color-bs-text)]"
                >
                  Моите задачи
                </Link>
              </div>

              {employeeData.tasks.length === 0 ? (
                <EmptyState
                  title="Няма активни задачи за текущия месец"
                  description="След добавяне на записи в отчета тук ще се появят активните задачи."
                  actionHref="/work-reports"
                  actionLabel="Добави отчет"
                  variant="compact-dark"
                />
              ) : (
                <div className="max-h-[420px] overflow-y-auto px-3 py-3">
                  <div className="space-y-2">
                    {employeeData.tasks.slice(0, 12).map((task) => (
                      <article
                        key={task.id}
                        className="grid gap-2 rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3 text-sm text-[var(--color-bs-muted)] sm:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-bs-text)]">{task.taskName}</p>
                          <p className="truncate text-xs text-[var(--color-bs-subtle)]">{task.clientName}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="bs-pill px-2 py-0.5 text-xs">
                            {priorityLabel(task.priority)}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              task.isOverdue
                                ? "bs-status-danger"
                                : task.status === "in_progress" || task.status === "started"
                                  ? "bs-status-warning"
                                  : task.status === "done"
                                    ? "bs-status-success"
                                    : "bs-status-neutral"
                            }`}
                          >
                            {statusLabel(task.status, task.isOverdue)}
                          </span>
                          <span className="text-xs text-[var(--color-bs-subtle)]">
                            {formatDateRange(task.startDate, task.endDate, task.createdAt)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <section className="bs-surface-card overflow-hidden rounded-xl">
              <div className="border-b border-[var(--color-bs-border-soft)] bg-white/5 px-4 py-3">
                <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Статус на месечния отчет</h2>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${monthStatusClasses}`}>
                  {monthStatusLabel}
                </span>
                <Link
                  href="/work-reports"
                  className="bs-btn inline-flex w-fit items-center px-3 py-1.5 text-sm font-medium"
                >
                  Отвори отчета
                </Link>
              </div>
            </section>

            <section className="bs-surface-card overflow-hidden rounded-xl">
              <div className="border-b border-[var(--color-bs-border-soft)] bg-white/5 px-4 py-3">
                <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Бързи действия</h2>
              </div>
              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1">
                <Link
                  href="/work-reports"
                  className="bs-btn-primary px-3 py-2 text-center text-sm font-medium"
                >
                  Добави отчет
                </Link>
                <Link
                  href="/work-reports"
                  className="bs-btn px-3 py-2 text-center text-sm font-medium"
                >
                  Отчети за работа
                </Link>
              </div>
            </section>
          </div>
        </div>
      )}

      {!isLoading && !errorMessage && !isEmployeeView && (
        <div className="flex flex-col gap-4">
          <section className="bs-surface-card overflow-hidden rounded-xl">
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-bs-border-soft)] sm:grid-cols-4 sm:divide-y-0">
              <Link
                href="/clients"
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-white/5 sm:py-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-bs-subtle)]">Активни клиенти</p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">{adminData.metrics.activeClients}</p>
              </Link>
              <Link
                href="/contracts"
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-white/5 sm:py-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-bs-subtle)]">
                  Активни договори
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">{adminData.metrics.activeContracts}</p>
              </Link>
              <Link
                href="/invoices"
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-white/5 sm:py-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-bs-subtle)]">
                  Неплатени фактури
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">{adminData.metrics.unpaidInvoices}</p>
              </Link>
              <Link
                href="/invoices"
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-white/5 sm:py-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-bs-subtle)]">
                  Просрочени фактури
                </p>
                <p className="text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">{adminData.metrics.overdueInvoices}</p>
              </Link>
            </div>
          </section>

          <section className="bs-surface-card overflow-hidden rounded-xl">
            <div className="border-b border-[var(--color-bs-border-soft)] bg-white/5 px-4 py-3">
              <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Натовареност на екипа</h2>
            </div>
            {adminData.teamWorkload.length === 0 ? (
              <EmptyState
                title="Няма данни за натовареност за текущия месец"
                description="След добавяне на работни записи ще видите оперативните метрики по служители."
                actionHref="/work-reports"
                actionLabel="Отвори отчети"
                variant="compact-dark"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--color-bs-border-soft)] text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">
                    <tr>
                      <th className="px-4 py-2.5">Служител</th>
                      <th className="px-4 py-2.5 text-right">Часове</th>
                      <th className="px-4 py-2.5 text-right">Target</th>
                      <th className="px-4 py-2.5 text-right">Remaining</th>
                      <th className="px-4 py-2.5 text-right">Задачи</th>
                      <th className="px-4 py-2.5 text-right">Клиенти</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-bs-border-soft)]">
                    {adminData.teamWorkload.map((row) => (
                      <tr key={row.employeeId} className="bg-white/[0.03]">
                        <td className="px-4 py-3 align-top">
                          <p className="text-sm font-medium text-[var(--color-bs-text)]">{row.employeeName}</p>
                          <p className="text-xs text-[var(--color-bs-subtle)]">{row.position ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-bs-muted)]">
                          {formatHours(row.totalWorkedHours)}h
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-bs-muted)]">
                          {row.monthlyTargetHours != null ? `${formatHours(row.monthlyTargetHours)}h` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-bs-muted)]">
                          {row.remainingHours != null ? `${formatHours(row.remainingHours)}h` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-bs-muted)]">{row.totalTasks}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-bs-muted)]">{row.activeClients}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bs-surface-card overflow-hidden rounded-xl">
            <div className="border-b border-[var(--color-bs-border-soft)] bg-white/5 px-4 py-3">
              <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Разход по клиенти</h2>
            </div>
            {adminData.clientCostBoard.length === 0 ? (
              <EmptyState
                title="Няма данни за клиентски разход за текущия месец"
                description="След добавяне на работни записи ще се визуализира себестойността по клиенти."
                actionHref="/work-reports"
                actionLabel="Отвори отчети"
                variant="compact-dark"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--color-bs-border-soft)] text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">
                    <tr>
                      <th className="px-4 py-2.5">Клиент</th>
                      <th className="px-4 py-2.5 text-right">Часове</th>
                      <th className="px-4 py-2.5 text-right">Employee Cost</th>
                      <th className="px-4 py-2.5 text-right">Задачи</th>
                      <th className="px-4 py-2.5">Служители</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-bs-border-soft)]">
                    {adminData.clientCostBoard.map((row) => {
                      const isExpanded = Boolean(expandedClientRows[row.clientId]);
                      return [
                        <tr key={row.clientId} className="bg-white/[0.03]">
                            <td className="px-4 py-3 align-top">
                              <button
                                type="button"
                                onClick={() => toggleClientRow(row.clientId)}
                                className="inline-flex items-center gap-2 text-left text-sm font-medium text-[var(--color-bs-text)] transition-colors hover:text-white"
                              >
                                <span className="text-xs text-[var(--color-bs-subtle)]">{isExpanded ? "▾" : "▸"}</span>
                                <span>{row.clientName}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-[var(--color-bs-muted)]">
                              {formatHours(row.totalWorkedHours)}h
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-[var(--color-bs-muted)]">
                              {row.totalEmployeeCost != null ? formatCurrencyEUR(row.totalEmployeeCost) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-[var(--color-bs-muted)]">{row.totalTasks}</td>
                            <td className="px-4 py-3 text-xs text-[var(--color-bs-subtle)]">
                              {row.employeesInvolved.length > 0 ? row.employeesInvolved.join(", ") : "—"}
                            </td>
                        </tr>,
                        isExpanded ? (
                          <tr key={`${row.clientId}-details`} className="bg-white/[0.02]">
                            <td colSpan={5} className="px-4 pb-3 pt-1">
                              <div className="overflow-x-auto rounded-lg border border-[var(--color-bs-border-soft)] bg-white/[0.03]">
                                <table className="min-w-full divide-y divide-[var(--color-bs-border-soft)] text-sm">
                                  <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">
                                    <tr>
                                      <th className="px-3 py-2">Служител</th>
                                      <th className="px-3 py-2 text-right">Часове</th>
                                      <th className="px-3 py-2 text-right">Rate</th>
                                      <th className="px-3 py-2 text-right">Cost</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--color-bs-border-soft)]">
                                    {row.employeeDetails.map((detail) => (
                                      <tr key={`${row.clientId}-${detail.employeeId}`}>
                                        <td className="px-3 py-2 text-[var(--color-bs-text)]">{detail.employeeName}</td>
                                        <td className="px-3 py-2 text-right tabular-nums text-[var(--color-bs-muted)]">
                                          {formatHours(detail.hours)}h
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-[var(--color-bs-muted)]">
                                          {detail.hourlyRate != null ? `${formatCurrencyEUR(detail.hourlyRate)}/h` : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-[var(--color-bs-muted)]">
                                          {detail.cost != null ? formatCurrencyEUR(detail.cost) : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        ) : null,
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="bs-surface-card overflow-hidden rounded-xl">
              <div className="border-b border-[var(--color-bs-border-soft)] bg-white/5 px-4 py-3">
                <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Екипен преглед</h2>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">Служители с най-много задачи</p>
                  {adminData.teamOverview.topEmployees.length === 0 ? (
                    <p className="mt-1 text-sm text-[var(--color-bs-muted)]">Няма данни за текущия месец.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-[var(--color-bs-muted)]">
                      {adminData.teamOverview.topEmployees.map((employee) => (
                        <li key={employee.id} className="flex items-center justify-between gap-3">
                          <span className="truncate">{employee.name}</span>
                          <span className="font-medium tabular-nums text-[var(--color-bs-text)]">{employee.taskCount}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <article className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">Непредадени отчети</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">
                      {adminData.teamOverview.unsubmittedReports}
                    </p>
                  </article>
                  <article className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">Чакащи преглед</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">
                      {adminData.teamOverview.waitingReview}
                    </p>
                  </article>
                  <article className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">Без активност</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-bs-text)]">
                      {adminData.teamOverview.employeesWithoutActivity}
                    </p>
                  </article>
                </div>
              </div>
            </div>

            <div className="bs-surface-card overflow-hidden rounded-xl">
              <div className="flex items-center justify-between border-b border-[var(--color-bs-border-soft)] bg-white/5 px-4 py-3">
                <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Наближаващи договори</h2>
                <Link
                  href="/contracts"
                  className="text-xs font-medium text-[var(--color-bs-muted)] transition-colors hover:text-[var(--color-bs-text)]"
                >
                  Виж всички
                </Link>
              </div>
              {adminData.expiringContracts.length === 0 ? (
                <EmptyState
                  title="Няма договори с наближаващ край"
                  description="Тук се показват договорите с изтичане до 60 дни."
                  actionHref="/contracts/add"
                  actionLabel="Добави договор"
                  variant="compact-dark"
                />
              ) : (
                <div className="max-h-[320px] overflow-y-auto p-3">
                  <div className="space-y-2">
                    {adminData.expiringContracts.slice(0, 8).map((contract) => (
                      <article key={contract.id} className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--color-bs-text)]">{contract.contract_name}</p>
                            <p className="truncate text-xs text-[var(--color-bs-subtle)]">{contract.client_name}</p>
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(contract.days_left)}`}
                          >
                            {contract.days_left} дни
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--color-bs-subtle)]">Край: {formatDate(contract.end_date)}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bs-surface-card overflow-hidden rounded-xl">
            <div className="border-b border-[var(--color-bs-border-soft)] bg-white/5 px-4 py-3">
              <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Предстоящи</h2>
            </div>
            <div className="grid gap-3 p-4 lg:grid-cols-3">
              <article className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--color-bs-text)]">Предстоящи фактури</h3>
                  <Link href="/invoices" className="text-xs text-[var(--color-bs-muted)] transition-colors hover:text-[var(--color-bs-text)]">
                    Виж
                  </Link>
                </div>
                {adminData.upcomingInvoices.length === 0 ? (
                  <p className="text-sm text-[var(--color-bs-muted)]">Няма фактури с падеж до 30 дни.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-[var(--color-bs-muted)]">
                    {adminData.upcomingInvoices.slice(0, 6).map((invoice) => (
                      <li key={invoice.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {invoice.clientName} · #{invoice.invoiceNumber}
                        </span>
                        <span className="whitespace-nowrap text-xs text-[var(--color-bs-subtle)]">{formatDate(invoice.dueDate)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--color-bs-text)]">Чакащи отчети</h3>
                  <Link
                    href="/work-reports"
                    className="text-xs text-[var(--color-bs-muted)] transition-colors hover:text-[var(--color-bs-text)]"
                  >
                    Виж
                  </Link>
                </div>
                {adminData.pendingReports.length === 0 ? (
                  <p className="text-sm text-[var(--color-bs-muted)]">Няма отчети в очакване на преглед.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-[var(--color-bs-muted)]">
                    {adminData.pendingReports.map((report) => (
                      <li key={report.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{report.employeeName}</span>
                        <span className="whitespace-nowrap text-xs text-[var(--color-bs-subtle)]">
                          {monthlyReportStatusDisplayLabel(report.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--color-bs-text)]">Изтичащи договори</h3>
                  <Link
                    href="/contracts"
                    className="text-xs text-[var(--color-bs-muted)] transition-colors hover:text-[var(--color-bs-text)]"
                  >
                    Виж
                  </Link>
                </div>
                {adminData.expiringContracts.length === 0 ? (
                  <p className="text-sm text-[var(--color-bs-muted)]">Няма изтичащи договори.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-[var(--color-bs-muted)]">
                    {adminData.expiringContracts.slice(0, 6).map((contract) => (
                      <li key={contract.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{contract.client_name}</span>
                        <span className="whitespace-nowrap text-xs text-[var(--color-bs-subtle)]">{contract.days_left} дни</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
