"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveAppRole, type AppRole } from "@/lib/roles";
import { supabase } from "@/lib/supabaseClient";
import { WorkingReviewMode, type WorkingReviewItem } from "@/components/reports/WorkingReviewMode";
import { buildReportsPdfData, type ReportsPdfSourceRow } from "@/components/reports/pdf/reportPdfDataBuilder";
import { exportReportsPdf } from "@/components/reports/pdf/exportReportsPdf";
import { MonthSelect } from "@/components/ui/MonthSelect";
import {
  buildAvailableMonthKeys,
  formatBgMonthKey,
  getCurrentMonthKey,
  isMonthlyReportLocked,
  isMonthlyReportSubmitted,
  parseMonthKey,
  type ReportMonthKey,
} from "@/lib/reportMonth";

type Employee = {
  id: string;
  name: string;
  email: string | null;
  hourlyRate: number | null;
  monthlyHours: number | null;
  grossSalary: number | null;
  bonus: number | null;
  vouchers: number | null;
  hoursPerDay: number | null;
};

type Client = {
  id: string;
  name: string;
};

type Service = {
  id: string;
  name: string;
};

type Task = {
  id: string;
  name: string;
};

type WorkItemRow = WorkingReviewItem & {
  isSubmitted: boolean;
  employeeName: string;
};

type ClientEmployeeCostRow = {
  clientId: string;
  clientName: string;
  employeeId: string;
  employeeName: string;
  hoursTotal: number;
  hourlyCost: number | null;
  totalCost: number | null;
};

function monthBounds(monthValue: string) {
  const { year, month } = parseMonthKey(monthValue);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
    year,
    month,
  };
}

function workingDaysInMonth(year: number, month: number) {
  // month is 1-based (1 = January)
  const jsMonth = month - 1;
  let count = 0;
  const date = new Date(year, jsMonth, 1);

  while (date.getMonth() === jsMonth) {
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (day >= 1 && day <= 5) {
      count += 1;
    }
    date.setDate(date.getDate() + 1);
  }

  return count;
}

function monthlyReportMatchesSelectedMonth(row: Record<string, unknown>, monthValue: string) {
  const { year, month } = monthBounds(monthValue);
  const reportYear = Number(row.report_year);
  const reportMonth = Number(row.report_month);
  return Number.isFinite(reportYear) && Number.isFinite(reportMonth) && reportYear === year && reportMonth === month;
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
}: {
  fullName: string;
  employeeEmail: string | null;
}) {
  const trimmedFullName = fullName.trim();
  if (trimmedFullName.length > 0) return trimmedFullName;
  if (employeeEmail && employeeEmail.trim().length > 0) return employeeEmail.trim();
  return "Неразпознат служител";
}

function monthLabel(monthValue: string) {
  return formatBgMonthKey(monthValue);
}

function parseHours(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function reportIsSubmitted(row: Record<string, unknown>): boolean {
  return isMonthlyReportSubmitted({
    status: typeof row.status === "string" ? row.status : null,
    submitted_at: typeof row.submitted_at === "string" ? row.submitted_at : null,
    locked_at: typeof row.locked_at === "string" ? row.locked_at : null,
  });
}

function reportIsLocked(row: Record<string, unknown>): boolean {
  return isMonthlyReportLocked({
    status: typeof row.status === "string" ? row.status : null,
    locked_at: typeof row.locked_at === "string" ? row.locked_at : null,
  });
}

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? `${value} €` : `${value.toFixed(2)} €`;
}

export default function ReportsPage() {
  const [reportMode, setReportMode] = useState<"official" | "working">("official");
  const [currentRole, setCurrentRole] = useState<AppRole>("employee");
  const [monthValue, setMonthValue] = useState<ReportMonthKey>(() => getCurrentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<ReportMonthKey[]>(() => [getCurrentMonthKey()]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<WorkItemRow[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedPdfClientId, setSelectedPdfClientId] = useState<string>("");
  const [showEmployeesInPdf, setShowEmployeesInPdf] = useState(true);
  const [showCostInPdf, setShowCostInPdf] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const canViewCompensation = currentRole === "admin";
  const canExportPdf = currentRole === "admin" || currentRole === "manager" || currentRole === "finance_admin";
  const canViewWorkingReview =
    currentRole === "admin" || currentRole === "manager" || currentRole === "finance_admin";

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setCurrentRole("employee");
        return;
      }

      const { data: employeeByAuth } = await supabase
        .from("employees")
        .select("app_role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (employeeByAuth) {
        if (isMounted) setCurrentRole(resolveAppRole(employeeByAuth.app_role));
        return;
      }

      if (!user.email) {
        if (isMounted) setCurrentRole("employee");
        return;
      }

      const { data: employeeByEmail } = await supabase
        .from("employees")
        .select("app_role")
        .ilike("email", user.email)
        .maybeSingle();

      if (isMounted) setCurrentRole(resolveAppRole(employeeByEmail?.app_role));
    }

    void loadRole();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canViewWorkingReview && reportMode === "working") {
      setReportMode("official");
    }
  }, [canViewWorkingReview, reportMode]);

  useEffect(() => {
    if (!canViewCompensation && showCostInPdf) {
      setShowCostInPdf(false);
    }
  }, [canViewCompensation, showCostInPdf]);

  useEffect(() => {
    setSelectedPdfClientId(selectedClientId);
  }, [selectedClientId]);

  useEffect(() => {
    const loadLookups = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const [
        { data: clientsData, error: clientsError },
        { data: servicesData, error: servicesError },
        { data: tasksData, error: tasksError },
      ] = await Promise.all([
        supabase.from("clients").select("id, name").order("name", { ascending: true }),
        supabase.from("services").select("id, name").order("name", { ascending: true }),
        supabase.from("tasks").select("id, name").order("name", { ascending: true }),
      ]);

      let employeeRows: Array<Record<string, unknown>> = [];
      let employeesError: unknown = null;

      if (currentRole === "admin") {
        try {
          const response = await fetch("/api/employees", { method: "GET" });
          const payload = (await response.json().catch(() => null)) as
            | { employees?: Array<Record<string, unknown>>; error?: string }
            | null;
          if (!response.ok) {
            employeesError = payload?.error ?? "Неуспешно зареждане на служителите от админ източника.";
          } else {
            employeeRows = (payload?.employees ?? []) as Array<Record<string, unknown>>;
          }
        } catch (error) {
          employeesError = error;
        }
      } else {
        const employeeSelect =
          "id, first_name, last_name, email, hourly_cost, monthly_hours, gross_salary, bonus, vouchers, hours_per_day";
        const employeeResult = await supabase
          .from("employees")
          .select(employeeSelect)
          .order("created_at", { ascending: false });
        employeesError = employeeResult.error;
        employeeRows = ((employeeResult.data ?? []) as Array<Record<string, unknown>>);
      }

      if (employeesError || clientsError || servicesError || tasksError) {
        const details = JSON.stringify(
          {
            employeesError,
            clientsError,
            servicesError,
            tasksError,
          },
          null,
          2
        );
        setErrorMessage(`Не успяхме да заредим служители, клиенти, услуги и задачи.\n\nТехнически детайли:\n${details}`);
        setEmployees([]);
        setClients([]);
        setServices([]);
        setTasks([]);
        setItems([]);
        setIsLoading(false);
        return;
      }

      setEmployees(
        employeeRows.map((row) => ({
          id: String(row.id ?? ""),
          name: resolveEmployeeDisplayName({
            fullName: `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim(),
            employeeEmail: typeof row.email === "string" ? row.email : null,
          }),
          email: typeof row.email === "string" ? row.email : null,
          hourlyRate: (() => {
            const values = [row.hourly_cost, row.hourly_rate, row.rate];
            for (const value of values) {
              const parsed = Number(value);
              if (Number.isFinite(parsed) && parsed > 0) return parsed;
            }
            return null;
          })(),
          monthlyHours: Number.isFinite(Number(row.monthly_hours)) ? Number(row.monthly_hours) : null,
          grossSalary: Number.isFinite(Number(row.gross_salary)) ? Number(row.gross_salary) : null,
          bonus: Number.isFinite(Number(row.bonus)) ? Number(row.bonus) : null,
          vouchers: Number.isFinite(Number(row.vouchers)) ? Number(row.vouchers) : null,
          hoursPerDay: Number.isFinite(Number(row.hours_per_day)) ? Number(row.hours_per_day) : null,
        }))
      );

      setClients(
        (clientsData ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id ?? ""),
          name: String(row.name ?? "Без име"),
        }))
      );

      setServices(
        (servicesData ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id ?? ""),
          name: String(row.name ?? "Без име"),
        }))
      );

      setTasks(
        (tasksData ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id ?? ""),
          name: String(row.name ?? "Без име"),
        }))
      );

      setIsLoading(false);
    };

    loadLookups();
  }, [currentRole]);

  useEffect(() => {
    const loadMonthlyData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data: reportsData, error: reportsError } = await supabase
        .from("monthly_reports")
        .select("id, employee_id, report_month, report_year, status, submitted_at, locked_at, employees(first_name, last_name, email)");

      if (reportsError) {
        const details = JSON.stringify(reportsError, null, 2);
        setErrorMessage(`Не успяхме да заредим отчетите за месеца.\n\nТехнически детайли:\n${details}`);
        setItems([]);
        setIsLoading(false);
        return;
      }

      const monthReports = (reportsData ?? [])
        .filter((row: Record<string, unknown>) => monthlyReportMatchesSelectedMonth(row, monthValue))
        .map((row: Record<string, unknown>) => row);

      if (monthReports.length === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const reportById = new Map<string, Record<string, unknown>>();
      const reportIdToEmployeeId = new Map<string, string>();
      const reportEmployeeDisplayNameById = new Map<string, string>();
      const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
      for (const row of monthReports) {
        const reportId = String(row.id ?? "");
        if (!reportId) continue;
        reportById.set(reportId, row);
        const employeeId = String(row.employee_id ?? "");
        if (employeeId) {
          reportIdToEmployeeId.set(reportId, employeeId);
        }
        const employeeRelation = toRelationObject<{ first_name?: unknown; last_name?: unknown; email?: unknown }>(
          row.employees
        );
        const employeeFromMap = employeeById.get(employeeId);
        const resolvedName = resolveEmployeeDisplayName({
          fullName:
            employeeFromMap?.name && employeeFromMap.name !== "Неразпознат служител"
              ? employeeFromMap.name
              : `${String(employeeRelation?.first_name ?? "")} ${String(employeeRelation?.last_name ?? "")}`.trim(),
          employeeEmail:
            employeeFromMap?.email ?? (typeof employeeRelation?.email === "string" ? employeeRelation.email : null),
        });
        if (employeeId) {
          reportEmployeeDisplayNameById.set(employeeId, resolvedName);
        }
      }

      if (reportById.size === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("work_report_items")
        .select(
          "id, monthly_report_id, client_id, service_id, task_id, task_description, notes, hours, start_date, created_at"
        );

      if (itemsError) {
        const details = JSON.stringify(itemsError, null, 2);
        setErrorMessage(`Не успяхме да заредим детайлите по задачи.\n\nТехнически детайли:\n${details}`);
        setItems([]);
        setIsLoading(false);
        return;
      }

      const mappedItems: WorkItemRow[] = (itemsData ?? [])
        .filter((row: Record<string, unknown>) => reportById.has(String(row.monthly_report_id ?? "")))
        .map((row: Record<string, unknown>) => {
          const monthlyReportId = String(row.monthly_report_id ?? "");
          const employeeId = reportIdToEmployeeId.get(monthlyReportId) ?? "";
          const reportRow = reportById.get(monthlyReportId) ?? {};
          const isSubmitted = reportIsSubmitted(reportRow);
          const isLocked = reportIsLocked(reportRow);
          const monthReviewStatus: WorkItemRow["monthReviewStatus"] = isLocked
            ? "locked"
            : isSubmitted
              ? "submitted"
              : "draft";
          const createdAt =
            typeof row.created_at === "string" && row.created_at.length >= 10
              ? row.created_at.slice(0, 10)
              : null;
          const startDate =
            typeof row.start_date === "string" && row.start_date.length >= 10
              ? row.start_date.slice(0, 10)
              : null;

          return {
            id: String(row.id ?? ""),
            employeeId,
            employeeName:
              reportEmployeeDisplayNameById.get(employeeId) ??
              resolveEmployeeDisplayName({
                fullName: "",
                employeeEmail: null,
              }),
            clientId: row.client_id != null ? String(row.client_id) : null,
            serviceId: row.service_id != null ? String(row.service_id) : null,
            taskId: row.task_id != null ? String(row.task_id) : null,
            taskDescription: typeof row.task_description === "string" ? row.task_description : null,
            notes: typeof row.notes === "string" ? row.notes : "",
            hours: parseHours(row.hours),
            activityDate: startDate ?? createdAt,
            monthReviewStatus,
            isSubmitted,
          };
        })
        .filter((item) => item.employeeId);

      // Ensure employees with a monthly_report but zero work items still appear in Working Review
      const employeesWithItems = new Set(mappedItems.map((item) => item.employeeId));
      const placeholderItems: WorkItemRow[] = [];
      for (const [reportId, reportRow] of reportById.entries()) {
        const employeeId = reportIdToEmployeeId.get(reportId) ?? "";
        if (!employeeId || employeesWithItems.has(employeeId)) continue;
        const isSubmitted = reportIsSubmitted(reportRow);
        const isLocked = reportIsLocked(reportRow);
        const monthReviewStatus: WorkItemRow["monthReviewStatus"] = isLocked
          ? "locked"
          : isSubmitted
            ? "submitted"
            : "draft";
        placeholderItems.push({
          id: `report-placeholder-${reportId}`,
          employeeId,
          employeeName:
            reportEmployeeDisplayNameById.get(employeeId) ??
            resolveEmployeeDisplayName({
              fullName: "",
              employeeEmail: null,
            }),
          clientId: null,
          serviceId: null,
          taskId: null,
          taskDescription: "Няма задачи в отчета",
          notes: "",
          hours: 0,
          activityDate: null,
          monthReviewStatus,
          isSubmitted,
        });
      }

      setItems([...mappedItems, ...placeholderItems]);
      setIsLoading(false);
    };

    loadMonthlyData();
  }, [monthValue, employees]);

  useEffect(() => {
    const loadAvailableMonths = async () => {
      const { data } = await supabase.from("monthly_reports").select("report_year, report_month");
      const months = buildAvailableMonthKeys(
        (data ?? []).map((row: { report_year?: number | null; report_month?: number | null }) => ({
          year: Number(row.report_year),
          month: Number(row.report_month),
        }))
      );
      setAvailableMonths(months);
      if (!months.includes(monthValue) && months.length > 0) {
        setMonthValue(months[0]);
      }
    };
    void loadAvailableMonths();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only bootstrap available months once
  }, []);

  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const servicesById = useMemo(() => new Map(services.map((s) => [s.id, s.name])), [services]);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t.name])), [tasks]);

  const workingDaysInfo = useMemo(() => {
    const { year, month } = monthBounds(monthValue);
    const workingDays = workingDaysInMonth(year, month);
    return { year, month, workingDays };
  }, [monthValue]);

  const employeeHourlyCostById = useMemo(() => {
    const costMap = new Map<string, number | null>();
    const { workingDays } = workingDaysInfo;

    for (const employee of employees) {
      const hoursPerDay = employee.hoursPerDay ?? 0;
      if (!hoursPerDay || workingDays <= 0) {
        costMap.set(employee.id, null);
        continue;
      }

      const monthlyEmployeeCost =
        (employee.grossSalary ?? 0) + (employee.bonus ?? 0) + (employee.vouchers ?? 0);
      const monthlyWorkHours = hoursPerDay * workingDays;

      if (!monthlyWorkHours) {
        costMap.set(employee.id, null);
        continue;
      }

      const derivedHourlyCost = monthlyEmployeeCost / monthlyWorkHours;
      if (!Number.isFinite(derivedHourlyCost) || derivedHourlyCost <= 0) {
        costMap.set(employee.id, null);
      } else {
        costMap.set(employee.id, derivedHourlyCost);
      }
    }

    return costMap;
  }, [employees, workingDaysInfo]);

  const workingReviewHourlyRateById = useMemo(() => {
    const rates = new Map<string, number | null>();
    for (const employee of employees) {
      rates.set(employee.id, employee.hourlyRate ?? null);
    }
    return rates;
  }, [employees]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        // Official: submitted/locked only (drafts excluded)
        const isOfficialVisible =
          item.isSubmitted || item.monthReviewStatus === "locked" || item.monthReviewStatus === "submitted";
        if (!isOfficialVisible) return false;
        // Placeholder rows (no real tasks) stay out of official aggregates
        if (item.id.startsWith("report-placeholder-")) return false;
        if (selectedEmployeeId && item.employeeId !== selectedEmployeeId) return false;
        if (selectedClientId && item.clientId !== selectedClientId) return false;
        return true;
      }),
    [items, selectedEmployeeId, selectedClientId]
  );

  const officialItemsForPdfBase = useMemo(
    () =>
      items.filter((item) => {
        const isOfficialVisible =
          item.isSubmitted || item.monthReviewStatus === "locked" || item.monthReviewStatus === "submitted";
        if (!isOfficialVisible) return false;
        if (item.id.startsWith("report-placeholder-")) return false;
        if (selectedEmployeeId && item.employeeId !== selectedEmployeeId) return false;
        return true;
      }),
    [items, selectedEmployeeId]
  );

  const filteredWorkingItems = useMemo(
    () =>
      items.filter((item) => {
        if (selectedEmployeeId && item.employeeId !== selectedEmployeeId) return false;
        if (selectedClientId && item.clientId !== selectedClientId) return false;
        return true;
      }),
    [items, selectedEmployeeId, selectedClientId]
  );

  const workingItemsForPdfBase = useMemo(
    () =>
      items.filter((item) => {
        if (item.id.startsWith("report-placeholder-")) return false;
        if (selectedEmployeeId && item.employeeId !== selectedEmployeeId) return false;
        return true;
      }),
    [items, selectedEmployeeId]
  );

  const workingReviewItems = useMemo<WorkingReviewItem[]>(
    () =>
      filteredWorkingItems.map((item) => ({
        id: item.id,
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        clientId: item.clientId,
        serviceId: item.serviceId,
        taskId: item.taskId,
        taskDescription:
          item.taskDescription?.trim() ||
          (item.taskId ? (tasksById.get(item.taskId) ?? null) : null),
        notes: item.notes,
        hours: item.hours,
        activityDate: item.activityDate,
        monthReviewStatus: item.monthReviewStatus,
      })),
    [filteredWorkingItems, tasksById]
  );

  const activeRowsForPdfExport = useMemo<WorkItemRow[]>(
    () => {
      const modeRows = reportMode === "official" ? officialItemsForPdfBase : workingItemsForPdfBase;
      if (!selectedPdfClientId) return modeRows;
      return modeRows.filter((item) => item.clientId === selectedPdfClientId);
    },
    [reportMode, officialItemsForPdfBase, workingItemsForPdfBase, selectedPdfClientId]
  );

  const activePdfSourceRows = useMemo<ReportsPdfSourceRow[]>(
    () =>
      activeRowsForPdfExport.map((item) => ({
        id: item.id,
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        clientId: item.clientId,
        serviceId: item.serviceId,
        taskId: item.taskId,
        taskDescription: item.taskDescription,
        notes: item.notes,
        hours: item.hours,
        activityDate: item.activityDate,
      })),
    [activeRowsForPdfExport]
  );

  const perEmployee = useMemo(() => {
    const summary = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        tasksCount: number;
        hoursTotal: number;
        clientNames: Set<string>;
      }
    >();

    for (const item of filteredItems) {
      const existing = summary.get(item.employeeId) ?? {
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        tasksCount: 0,
        hoursTotal: 0,
        clientNames: new Set<string>(),
      };

      existing.tasksCount += 1;
      existing.hoursTotal += item.hours;

      if (item.clientId) {
        const clientName = clientsById.get(item.clientId);
        if (clientName) {
          existing.clientNames.add(clientName);
        }
      }

      summary.set(item.employeeId, existing);
    }

    return Array.from(summary.values())
      .map((value) => ({
        ...value,
        clientNames: Array.from(value.clientNames).sort((a, b) => a.localeCompare(b, "bg-BG")),
      }))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "bg-BG"));
  }, [filteredItems, clientsById]);

  const perClient = useMemo(() => {
    const summary = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        tasksCount: number;
        hoursTotal: number;
        employeeNames: Set<string>;
      }
    >();

    for (const item of filteredItems) {
      const clientId = item.clientId ?? "none";
      const existing = summary.get(clientId) ?? {
        clientId,
        clientName: clientId === "none" ? "Без клиент" : clientsById.get(clientId) ?? "Неизвестен клиент",
        tasksCount: 0,
        hoursTotal: 0,
        employeeNames: new Set<string>(),
      };

      existing.tasksCount += 1;
      existing.hoursTotal += item.hours;
      if (item.employeeId) {
        const employeeName = item.employeeName;
        if (employeeName) {
          existing.employeeNames.add(employeeName);
        }
      }

      summary.set(clientId, existing);
    }

    return Array.from(summary.values())
      .map((value) => ({
        ...value,
        employeeNames: Array.from(value.employeeNames).sort((a, b) => a.localeCompare(b, "bg-BG")),
      }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName, "bg-BG"));
  }, [filteredItems, clientsById]);

  const costPerClientEmployee: ClientEmployeeCostRow[] = useMemo(() => {
    const summary = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        serviceId: string;
        serviceName: string;
        employeeId: string;
        employeeName: string;
        hoursTotal: number;
      }
    >();

    for (const item of filteredItems) {
      const clientKey = item.clientId ?? "none";
      const serviceKey = item.serviceId ?? "none";
      const employeeId = item.employeeId;
      if (!employeeId) continue;

      const key = `${clientKey}|${serviceKey}|${employeeId}`;
      const existing =
        summary.get(key) ??
        {
          clientId: clientKey,
          clientName: clientKey === "none" ? "Без клиент" : clientsById.get(clientKey) ?? "Неизвестен клиент",
          serviceId: serviceKey,
          serviceName: serviceKey === "none" ? "Без услуга" : servicesById.get(serviceKey) ?? "Неизвестна услуга",
          employeeId,
          employeeName: item.employeeName,
          hoursTotal: 0,
        };

      existing.hoursTotal += item.hours;
      summary.set(key, existing);
    }

    const rows: ClientEmployeeCostRow[] = [];
    for (const value of summary.values()) {
      const hourlyCost = employeeHourlyCostById.get(value.employeeId) ?? null;
      const totalCost =
        hourlyCost != null && Number.isFinite(hourlyCost) ? value.hoursTotal * hourlyCost : null;

      rows.push({
        clientId: value.clientId,
        clientName: value.clientName,
        // We extend ClientEmployeeCostRow at runtime with service fields through type widening.
        // TypeScript will accept this because of structural typing.
        // @ts-ignore
        serviceId: value.serviceId,
        // @ts-ignore
        serviceName: value.serviceName,
        employeeId: value.employeeId,
        employeeName: value.employeeName,
        hoursTotal: value.hoursTotal,
        hourlyCost,
        totalCost,
      });
    }

    return rows.sort((a, b) => {
      const clientNameCmp = a.clientName.localeCompare(b.clientName, "bg-BG");
      if (clientNameCmp !== 0) return clientNameCmp;
      const serviceNameCmp = String(
        // @ts-ignore
        a.serviceName ?? ""
      ).localeCompare(String(
        // @ts-ignore
        b.serviceName ?? ""
      ), "bg-BG");
      if (serviceNameCmp !== 0) return serviceNameCmp;
      return a.employeeName.localeCompare(b.employeeName, "bg-BG");
    });
  }, [filteredItems, clientsById, servicesById, employeeHourlyCostById]);

  const clientCostTotals = useMemo(() => {
    if (!selectedClientId) return null;

    let totalHours = 0;
    let totalCost = 0;
    let hasCost = false;

    for (const row of costPerClientEmployee) {
      totalHours += row.hoursTotal;
      if (row.totalCost != null && Number.isFinite(row.totalCost)) {
        totalCost += row.totalCost;
        hasCost = true;
      }
    }

    return {
      totalHours,
      totalCost: hasCost ? totalCost : null,
    };
  }, [selectedClientId, costPerClientEmployee]);

  const hasData = filteredItems.length > 0;

  async function handleExportPdfReport() {
    if (!canExportPdf || isExporting || activePdfSourceRows.length === 0) return;

    setIsExporting(true);
    try {
      const pdfData = buildReportsPdfData({
        mode: reportMode,
        monthLabel: monthLabel(monthValue),
        clientLabel: selectedPdfClientId
          ? clientsById.get(selectedPdfClientId) ?? "Неизвестен клиент"
          : "Всички клиенти",
        rows: activePdfSourceRows,
        servicesById,
        tasksById,
        hourlyRateByEmployeeId: workingReviewHourlyRateById,
        generatedAt: new Date(),
        showCost: canViewCompensation && showCostInPdf,
        showEmployees: showEmployeesInPdf,
      });

      await exportReportsPdf(pdfData, {
        showEmployees: showEmployeesInPdf,
        showCost: canViewCompensation && showCostInPdf,
      });
    } catch (error) {
      console.error("Failed to export reports PDF", error);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 shadow-xl md:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Справки</h1>
            <p className="text-sm text-zinc-400">
              {reportMode === "official"
                ? "Официален изглед за изпратени и заключени месечни отчети."
                : "Вътрешен управленски преглед на текущата работа, включително чернови."}
            </p>
            <div className="mt-3 inline-flex rounded-xl border border-zinc-800 bg-zinc-900 p-1">
              <button
                type="button"
                onClick={() => setReportMode("official")}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  reportMode === "official"
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                Официални отчети
              </button>
              <button
                type="button"
                onClick={() => setReportMode("working")}
                disabled={!canViewWorkingReview}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  reportMode === "working"
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Работен преглед
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <MonthSelect
                id="reports-month"
                variant="zinc"
                value={monthValue}
                months={availableMonths}
                onChange={setMonthValue}
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Служител</label>
              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="w-40 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              >
                <option value="">Всички</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Клиент</label>
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="w-40 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              >
                <option value="">Всички</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!isLoading && !errorMessage && canExportPdf && (
          <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">PDF експорт</h2>
                <p className="text-xs text-zinc-500">
                  Режим: {reportMode === "official" ? "Официални отчети" : "Работен преглед"} · Месец:{" "}
                  {monthLabel(monthValue)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPdfReport}
                disabled={isExporting || activeRowsForPdfExport.length === 0}
                className="inline-flex items-center justify-center rounded-full border border-lime-500/40 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-100 shadow-sm transition hover:border-lime-400/70 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? "Генериране..." : "Изтегли PDF"}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Клиент за PDF</label>
                <select
                  value={selectedPdfClientId}
                  onChange={(event) => setSelectedPdfClientId(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-lime-400/70"
                >
                  <option value="">Всички клиенти</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-5 text-sm text-zinc-200">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showEmployeesInPdf}
                  onChange={(event) => setShowEmployeesInPdf(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-lime-400"
                />
                Покажи служители
              </label>
              {canViewCompensation && (
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showCostInPdf}
                    onChange={(event) => setShowCostInPdf(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-lime-400"
                  />
                  Покажи себестойност
                </label>
              )}
            </div>
            {canViewCompensation && showCostInPdf && (
              <p className="mt-3 rounded-xl border border-amber-700/70 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                Внимание: PDF-ът ще включва вътрешна себестойност.
              </p>
            )}
          </section>
        )}

        {isLoading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
            Зареждане на справките...
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && reportMode === "official" && !hasData && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
            Няма данни за избраните филтри.
          </div>
        )}

        {!isLoading && !errorMessage && reportMode === "working" && !canViewWorkingReview && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
            Нямате достъп до вътрешния режим „Работен преглед“.
          </div>
        )}

        {!isLoading && !errorMessage && reportMode === "working" && canViewWorkingReview && (
          <WorkingReviewMode
            items={workingReviewItems}
            employees={employees.map((employee) => ({ id: employee.id, name: employee.name }))}
            clients={clients}
            services={services}
            tasks={tasks}
            canViewCompensation={canViewCompensation}
            employeeHourlyCostById={workingReviewHourlyRateById}
          />
        )}

        {!isLoading && !errorMessage && reportMode === "official" && hasData && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Section 1: По служители */}
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-white">По служители</h2>
                    <p className="text-xs text-zinc-500">{monthLabel(monthValue)}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p>
                      Общо задачи:{" "}
                      <span className="font-semibold text-zinc-100">
                        {perEmployee.reduce((acc, row) => acc + row.tasksCount, 0)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-950/90 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Служител</th>
                        <th className="px-3 py-2 font-medium">Клиенти</th>
                        <th className="px-3 py-2 font-medium text-right">Брой задачи</th>
                        <th className="px-3 py-2 font-medium text-right">Часове общо</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perEmployee.map((row) => (
                        <tr key={row.employeeId} className="border-b border-zinc-900 last:border-b-0">
                          <td className="px-3 py-2 align-top text-sm text-zinc-100">{row.employeeName}</td>
                          <td className="px-3 py-2 align-top text-xs text-zinc-100">
                            {row.clientNames.length === 0 ? (
                              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400">
                                —
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {row.clientNames.map((name) => (
                                  <span
                                    key={name}
                                    className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-100"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-zinc-100">{row.tasksCount}</td>
                          <td className="px-3 py-2 text-right text-sm text-zinc-100">
                            {formatHours(row.hoursTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 2: По клиенти */}
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-white">По клиенти</h2>
                    <p className="text-xs text-zinc-500">{monthLabel(monthValue)}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p>
                      Общо задачи:{" "}
                      <span className="font-semibold text-zinc-100">
                        {perClient.reduce((acc, row) => acc + row.tasksCount, 0)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-950/90 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Клиент</th>
                        <th className="px-3 py-2 font-medium">Служители</th>
                        <th className="px-3 py-2 font-medium text-right">Брой задачи</th>
                        <th className="px-3 py-2 font-medium text-right">Часове общо</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perClient.map((row) => (
                        <tr key={row.clientId} className="border-b border-zinc-900 last:border-b-0">
                          <td className="px-3 py-2 align-top text-sm text-zinc-100">{row.clientName}</td>
                          <td className="px-3 py-2 align-top text-xs text-zinc-100">
                            {row.employeeNames.length === 0 ? (
                              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400">
                                —
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {row.employeeNames.map((name) => (
                                  <span
                                    key={name}
                                    className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-100"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-zinc-100">{row.tasksCount}</td>
                          <td className="px-3 py-2 text-right text-sm text-zinc-100">
                            {formatHours(row.hoursTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Section 3: Себестойност по клиент */}
            {canViewCompensation && (
            <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">Себестойност по клиент</h2>
                  <p className="text-xs text-zinc-500">{monthLabel(monthValue)}</p>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-950/90 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Клиент</th>
                      <th className="px-3 py-2 font-medium">Услуга</th>
                      <th className="px-3 py-2 font-medium">Служител</th>
                      <th className="px-3 py-2 font-medium text-right">Часове</th>
                      <th className="px-3 py-2 font-medium text-right">Цена на час</th>
                      <th className="px-3 py-2 font-medium text-right">Себестойност</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costPerClientEmployee.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-center text-sm text-zinc-400"
                        >
                          Няма изчислена себестойност за избраните филтри.
                        </td>
                      </tr>
                    )}
                    {costPerClientEmployee.map((row: any) => (
                      <tr
                        key={`${row.clientId}|${row.serviceId ?? "none"}|${row.employeeId}`}
                        className="border-b border-zinc-900 last:border-b-0"
                      >
                        <td className="px-3 py-2 align-top text-sm text-zinc-100">
                          {row.clientName}
                        </td>
                        <td className="px-3 py-2 align-top text-sm text-zinc-100">
                          {row.serviceName ?? "Без услуга"}
                        </td>
                        <td className="px-3 py-2 align-top text-sm text-zinc-100">
                          {row.employeeName}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-zinc-100">
                          {formatHours(row.hoursTotal)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-zinc-100">
                          {row.hourlyCost == null ? "—" : formatCurrency(row.hourlyCost)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-zinc-100">
                          {row.totalCost == null ? "—" : formatCurrency(row.totalCost)}
                        </td>
                      </tr>
                    ))}
                    {selectedClientId && clientCostTotals && costPerClientEmployee.length > 0 && (
                      <tr className="border-t border-zinc-800 bg-zinc-900/80">
                        <td
                          colSpan={3}
                          className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400"
                        >
                          Общо за клиента
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-zinc-100">
                          {formatHours(clientCostTotals.totalHours)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-zinc-500">—</td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-zinc-100">
                          {clientCostTotals.totalCost == null
                            ? "—"
                            : formatCurrency(clientCostTotals.totalCost)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            )}

          </>
        )}
      </section>
    </div>
  );
}
