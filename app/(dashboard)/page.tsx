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
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (daysLeft <= 60) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700";
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

  const [
    activeClientsResult,
    activeContractsResult,
    unpaidInvoicesResult,
    overdueInvoicesResult,
    expiringContractsResult,
    employeesResult,
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
    supabase.from("employees").select("id, first_name, last_name"),
    supabase
      .from("monthly_reports")
      .select("id, employee_id, status, submitted_at, locked_at, employees(first_name, last_name)")
      .eq("report_year", year)
      .eq("report_month", month),
    supabase
      .from("work_report_items")
      .select("id, monthly_reports!inner(employee_id, report_year, report_month)")
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
    employeesResult.error ||
    monthlyReportsResult.error ||
    workItemsResult.error ||
    upcomingInvoicesResult.error
  ) {
    throw new Error("Неуспешно зареждане на данни за администраторското табло.");
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

  const employees = (employeesResult.data ?? []).map((row: any) => ({
    id: String(row.id ?? ""),
    name: `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim() || "Без име",
  }));
  const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.name]));

  const monthlyReports = (monthlyReportsResult.data ?? []).map((row: any) => {
    const status = String(row.status ?? "draft").toLowerCase().trim();
    const submittedAt = typeof row.submitted_at === "string" && row.submitted_at.trim().length > 0;
    const lockedAt = typeof row.locked_at === "string" && row.locked_at.trim().length > 0;
    const employeeName = `${String(row.employees?.first_name ?? "")} ${String(row.employees?.last_name ?? "")}`.trim() || "Без име";
    return {
      id: String(row.id ?? ""),
      employeeId: String(row.employee_id ?? ""),
      status,
      submittedAt,
      lockedAt,
      employeeName,
    };
  });

  const taskCountByEmployee = new Map<string, number>();
  (workItemsResult.data ?? []).forEach((row: any) => {
    const employeeId = String(row.monthly_reports?.employee_id ?? "");
    if (!employeeId) return;
    taskCountByEmployee.set(employeeId, (taskCountByEmployee.get(employeeId) ?? 0) + 1);
  });

  const topEmployees: AdminTopEmployee[] = [...taskCountByEmployee.entries()]
    .map(([employeeId, count]) => ({
      id: employeeId,
      name: employeeNameById.get(employeeId) ?? "Без име",
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
  });

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const roleDetails = await getCurrentRoleContext();
        setRoleContext(roleDetails);

        if (roleDetails.role === "employee") {
          const employeeDashboard = await fetchEmployeeDashboardData(roleDetails.employeeId);
          setEmployeeData(employeeDashboard);
        } else {
          const adminDashboard = await fetchAdminDashboardData();
          setAdminData(adminDashboard);
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
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : employeeData.monthStatus === "submitted"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-zinc-200 bg-zinc-100 text-zinc-700";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Табло</h1>
        <p className="text-sm text-zinc-500">
          {isEmployeeView ? "Вашият продуктивен преглед за текущия месец." : "Оперативен преглед за екипа и бизнеса."}
        </p>
      </div>

      {isLoading && <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Зареждане...</div>}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && isEmployeeView && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="flex flex-col gap-4">
            <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex flex-col gap-0.5 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Моите задачи</p>
                  <p className="text-lg font-semibold tabular-nums text-zinc-900">{employeeData.myTasks}</p>
                </div>
                <div className="flex flex-col gap-0.5 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">В процес</p>
                  <p className="text-lg font-semibold tabular-nums text-zinc-900">{employeeData.inProgress}</p>
                </div>
                <div className="flex flex-col gap-0.5 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Завършени този месец</p>
                  <p className="text-lg font-semibold tabular-nums text-zinc-900">{employeeData.completedThisMonth}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <h2 className="text-sm font-medium text-zinc-700">Днешни / активни задачи</h2>
                <Link href="/tasks" className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700">
                  Моите задачи
                </Link>
              </div>

              {employeeData.tasks.length === 0 ? (
                <EmptyState
                  title="Няма активни задачи за текущия месец"
                  description="След добавяне на записи в отчета тук ще се появят активните задачи."
                  actionHref="/work-reports"
                  actionLabel="Добави отчет"
                  variant="compact"
                />
              ) : (
                <div className="max-h-[420px] overflow-y-auto px-3 py-3">
                  <div className="space-y-2">
                    {employeeData.tasks.slice(0, 12).map((task) => (
                      <article
                        key={task.id}
                        className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 sm:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900">{task.taskName}</p>
                          <p className="truncate text-xs text-zinc-500">{task.clientName}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                            {priorityLabel(task.priority)}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              task.isOverdue
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : task.status === "in_progress" || task.status === "started"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : task.status === "done"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-zinc-200 bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            {statusLabel(task.status, task.isOverdue)}
                          </span>
                          <span className="text-xs text-zinc-500">{formatDateRange(task.startDate, task.endDate, task.createdAt)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <h2 className="text-sm font-medium text-zinc-700">Статус на месечния отчет</h2>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${monthStatusClasses}`}>
                  {monthStatusLabel}
                </span>
                <Link
                  href="/work-reports"
                  className="inline-flex w-fit items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  Отвори отчета
                </Link>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <h2 className="text-sm font-medium text-zinc-700">Бързи действия</h2>
              </div>
              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1">
                <Link
                  href="/work-reports"
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  Добави отчет
                </Link>
                <Link
                  href="/work-reports"
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
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
          <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 sm:grid-cols-4 sm:divide-y-0">
              <Link
                href="/clients"
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-zinc-50 sm:py-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Активни клиенти</p>
                <p className="text-lg font-semibold tabular-nums text-zinc-900">{adminData.metrics.activeClients}</p>
              </Link>
              <Link
                href="/contracts"
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-zinc-50 sm:py-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Активни договори</p>
                <p className="text-lg font-semibold tabular-nums text-zinc-900">{adminData.metrics.activeContracts}</p>
              </Link>
              <Link
                href="/invoices"
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-zinc-50 sm:py-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Неплатени фактури</p>
                <p className="text-lg font-semibold tabular-nums text-zinc-900">{adminData.metrics.unpaidInvoices}</p>
              </Link>
              <Link
                href="/invoices"
                className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-zinc-50 sm:py-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Просрочени фактури</p>
                <p className="text-lg font-semibold tabular-nums text-zinc-900">{adminData.metrics.overdueInvoices}</p>
              </Link>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <h2 className="text-sm font-medium text-zinc-700">Екипен преглед</h2>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Служители с най-много задачи</p>
                  {adminData.teamOverview.topEmployees.length === 0 ? (
                    <p className="mt-1 text-sm text-zinc-600">Няма данни за текущия месец.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                      {adminData.teamOverview.topEmployees.map((employee) => (
                        <li key={employee.id} className="flex items-center justify-between gap-3">
                          <span className="truncate">{employee.name}</span>
                          <span className="font-medium tabular-nums text-zinc-900">{employee.taskCount}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Непредадени отчети</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                      {adminData.teamOverview.unsubmittedReports}
                    </p>
                  </article>
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Чакащи review</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{adminData.teamOverview.waitingReview}</p>
                  </article>
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Без активност</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                      {adminData.teamOverview.employeesWithoutActivity}
                    </p>
                  </article>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <h2 className="text-sm font-medium text-zinc-700">Наближаващи договори</h2>
                <Link href="/contracts" className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700">
                  Виж всички
                </Link>
              </div>
              {adminData.expiringContracts.length === 0 ? (
                <EmptyState
                  title="Няма договори с наближаващ край"
                  description="Тук се показват договорите с изтичане до 60 дни."
                  actionHref="/contracts/add"
                  actionLabel="Добави договор"
                  variant="compact"
                />
              ) : (
                <div className="max-h-[320px] overflow-y-auto p-3">
                  <div className="space-y-2">
                    {adminData.expiringContracts.slice(0, 8).map((contract) => (
                      <article key={contract.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">{contract.contract_name}</p>
                            <p className="truncate text-xs text-zinc-500">{contract.client_name}</p>
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(contract.days_left)}`}
                          >
                            {contract.days_left} дни
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">Край: {formatDate(contract.end_date)}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-700">Upcoming</h2>
            </div>
            <div className="grid gap-3 p-4 lg:grid-cols-3">
              <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-800">Upcoming invoices</h3>
                  <Link href="/invoices" className="text-xs text-zinc-500 hover:text-zinc-700">
                    Виж
                  </Link>
                </div>
                {adminData.upcomingInvoices.length === 0 ? (
                  <p className="text-sm text-zinc-600">Няма фактури с падеж до 30 дни.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-zinc-700">
                    {adminData.upcomingInvoices.slice(0, 6).map((invoice) => (
                      <li key={invoice.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {invoice.clientName} · #{invoice.invoiceNumber}
                        </span>
                        <span className="whitespace-nowrap text-xs text-zinc-500">{formatDate(invoice.dueDate)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-800">Pending reports</h3>
                  <Link href="/work-reports" className="text-xs text-zinc-500 hover:text-zinc-700">
                    Виж
                  </Link>
                </div>
                {adminData.pendingReports.length === 0 ? (
                  <p className="text-sm text-zinc-600">Няма отчети за review.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-zinc-700">
                    {adminData.pendingReports.map((report) => (
                      <li key={report.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{report.employeeName}</span>
                        <span className="whitespace-nowrap text-xs text-zinc-500">{report.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-800">Expiring contracts</h3>
                  <Link href="/contracts" className="text-xs text-zinc-500 hover:text-zinc-700">
                    Виж
                  </Link>
                </div>
                {adminData.expiringContracts.length === 0 ? (
                  <p className="text-sm text-zinc-600">Няма изтичащи договори.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-zinc-700">
                    {adminData.expiringContracts.slice(0, 6).map((contract) => (
                      <li key={contract.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{contract.client_name}</span>
                        <span className="whitespace-nowrap text-xs text-zinc-500">{contract.days_left} дни</span>
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
