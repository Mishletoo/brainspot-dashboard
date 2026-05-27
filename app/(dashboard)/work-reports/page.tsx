"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { CustomSelect, DatePicker, Toast, type SelectOption } from "@/components/ui";
import {
  WorkReportItemDetailModal,
  type WorkReportItemDetail,
  type WorkReportItemEditValues,
} from "@/components/work-reports/WorkReportItemDetailModal";
import { PersonalTasksModule } from "@/app/(dashboard)/tasks/page";
import { resolveAppRole, type AppRole } from "@/lib/roles";
import { supabase } from "@/lib/supabaseClient";

type LookupItem = { id: string; name: string };
type EmployeeOption = { id: string; name: string };
type WorkItem = {
  id: string;
  clientId: string | null;
  serviceId: string | null;
  taskId: string | null;
  taskDescription: string | null;
  hours: number;
  notes: string;
  taskStatus: string;
  status: "draft" | "sent";
  startDate: string | null;
  endDate: string | null;
  priority: string | null;
  raw: Record<string, unknown>;
};

type DraftEditState = {
  hours: string;
  notes: string;
  dateValue: { start: string; end: string };
  priority: string;
};

type MonthlyAdSpendState = {
  metaAdsSpend: string;
  googleAdsSpend: string;
};


type MonthState = {
  status: string;
  submittedAt: string | null;
  lockedAt: string | null;
  isSubmitted: boolean;
  isLocked: boolean;
  isEditable: boolean;
};

const MONTH_SUBMITTED_STATUSES = new Set(["submitted", "pending_review", "approved"]);
const MONTH_LOCKED_STATUSES = new Set(["locked", "approved", "finalized"]);

function normalizeMonthStatus(value: unknown): string {
  const normalized = String(value ?? "").toLowerCase().trim();
  return normalized || "draft";
}

function parseNullableDateTime(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function buildMonthState(row: Record<string, unknown> | null): MonthState {
  const status = normalizeMonthStatus(row?.status);
  const submittedAt = parseNullableDateTime(row?.submitted_at);
  const lockedAt = parseNullableDateTime(row?.locked_at);
  const isSubmitted = Boolean(submittedAt) || MONTH_SUBMITTED_STATUSES.has(status);
  const isLocked = Boolean(lockedAt) || MONTH_LOCKED_STATUSES.has(status);

  return {
    status,
    submittedAt,
    lockedAt,
    isSubmitted,
    isLocked,
    isEditable: !isSubmitted && !isLocked,
  };
}

function monthStatusLabel(state: MonthState): string {
  if (state.isLocked) return "Заключен";
  if (state.status === "approved") return "Одобрен";
  if (state.status === "rejected" || state.status === "edit_requested") return "Върнат за корекция";
  if (state.isSubmitted) return "Изпратен за преглед";
  return "Чернова";
}

function monthStatusBadgeClasses(state: MonthState): string {
  if (state.isLocked) return "border-rose-700/60 bg-rose-950/40 text-rose-100";
  if (state.status === "approved") return "border-emerald-700/60 bg-emerald-950/40 text-emerald-100";
  if (state.status === "rejected" || state.status === "edit_requested") return "border-amber-700/60 bg-amber-950/40 text-amber-100";
  if (state.isSubmitted) return "border-sky-700/60 bg-sky-950/40 text-sky-100";
  return "border-zinc-700/70 bg-zinc-900 text-zinc-100";
}

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "low", label: "нисък" },
  { value: "normal", label: "нормален" },
  { value: "high", label: "висок" },
  { value: "urgent", label: "спешен" },
];

const PRIORITY_VALUES = new Set(PRIORITY_OPTIONS.map((o) => o.value));

/** Normalize to allowed value or null; no fallback to "normal". */
function normalizePriority(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const v = String(value).toLowerCase().trim();
  return PRIORITY_VALUES.has(v) ? v : null;
}

function priorityLabel(priority: string | null): string {
  if (priority == null || !PRIORITY_VALUES.has(priority)) return "—";
  return PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? priority;
}

function formatDateDisplay(date: string | null): string | null {
  const iso = date?.slice(0, 10);
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** Single date or range "11.03.2026 – 15.03.2026". */
function formatDateRangeDisplay(startDate: string | null, endDate: string | null): string | null {
  const start = formatDateDisplay(startDate);
  if (!start) return null;
  if (!endDate || endDate.slice(0, 10) === startDate?.slice(0, 10)) return start;
  const end = formatDateDisplay(endDate);
  return end ? `${start} – ${end}` : start;
}

function formatDateTimeDisplay(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stopRowEvent(event: SyntheticEvent) {
  event.stopPropagation();
}

function monthBounds(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
    year,
    month,
  };
}

const GRACE_PERIOD_LAST_DAY = 5;

/**
 * Format a Date as a YYYY-MM string using local calendar fields.
 * Avoids toISOString() which can shift months across timezones near month boundaries.
 */
function toMonthValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isCurrentMonth(monthValue: string, today: Date): boolean {
  return monthValue === toMonthValue(today);
}

function isPreviousMonth(monthValue: string, today: Date): boolean {
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return monthValue === toMonthValue(prev);
}

/**
 * Grace period: employees can still edit the previous month through day 5 (inclusive)
 * of the current local-calendar month.
 */
function isWithinGracePeriod(today: Date): boolean {
  return today.getDate() <= GRACE_PERIOD_LAST_DAY;
}

/**
 * Employee editability gate. Combines submission/lock status with grace-period calendar rules.
 *
 * Returns true only if BOTH are true:
 *  - the monthly report is not already submitted/locked (monthState.isEditable)
 *  - the calendar window allows the employee to edit this month (current month always,
 *    previous month only through day 5 of current month inclusive)
 *
 * Admin behavior is intentionally NOT handled here — callers must bypass this for admins
 * to preserve existing admin-unlock semantics.
 */
function canEmployeeEditMonth(monthValue: string, today: Date, monthState: MonthState): boolean {
  if (!monthState.isEditable) return false;
  if (isCurrentMonth(monthValue, today)) return true;
  if (isPreviousMonth(monthValue, today) && isWithinGracePeriod(today)) return true;
  return false;
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) return "0";
  return `${value}`;
}

function parseHours(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type HoursParseResult = {
  value: number | null;
  error: string | null;
};

function parseHoursInput(rawValue: string): HoursParseResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { value: null, error: "Часовете са задължителни." };
  }

  const normalized = trimmed.replace(",", ".");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    return { value: null, error: "Невалиден формат за часове. Използвайте число, напр. 2, 2.5, 0.5." };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: "Невалидни часове." };
  }

  if (parsed < 0) {
    return { value: null, error: "Часовете не могат да бъдат отрицателни." };
  }

  return { value: parsed, error: null };
}

function parseMoneyInput(value: string) {
  const normalized = value.trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function monthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthValue;
  return date.toLocaleDateString("bg-BG", { month: "long", year: "numeric" });
}

const TASK_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "waiting", label: "чакаща" },
  { value: "started", label: "започната" },
  { value: "in_progress", label: "в процес" },
  { value: "done", label: "приключена" },
];

const TASK_STATUS_STYLES: Record<string, string> = {
  waiting: "border-zinc-500/30 bg-zinc-500/20 text-zinc-200",
  started: "border-sky-500/30 bg-sky-500/20 text-sky-200",
  in_progress: "border-amber-500/30 bg-amber-500/20 text-amber-200",
  done: "border-emerald-500/30 bg-emerald-500/20 text-emerald-200",
};

/** Subtle pastel row/card: border, left accent, dark bg, and a soft tint over the whole card */
const TASK_STATUS_ROW_STYLES: Record<string, string> = {
  waiting:
    "border border-zinc-500/30 border-l-4 border-l-zinc-400/60 bg-zinc-900/85 shadow-[inset_0_0_0_200px_rgba(161,161,170,0.04)]",
  started:
    "border border-sky-500/30 border-l-4 border-l-sky-400/60 bg-zinc-900/85 shadow-[inset_0_0_0_200px_rgba(56,189,248,0.05)]",
  in_progress:
    "border border-amber-500/30 border-l-4 border-l-amber-400/60 bg-zinc-900/85 shadow-[inset_0_0_0_200px_rgba(245,158,11,0.05)]",
  done:
    "border border-emerald-500/30 border-l-4 border-l-emerald-400/60 bg-zinc-900/85 shadow-[inset_0_0_0_200px_rgba(52,211,153,0.05)]",
};

function taskStatusClasses(status: string): string {
  return TASK_STATUS_STYLES[status] ?? TASK_STATUS_STYLES.waiting;
}

function taskStatusRowClasses(status: string): string {
  return TASK_STATUS_ROW_STYLES[status] ?? TASK_STATUS_ROW_STYLES.waiting;
}

/** Shared responsive grid for draft list header + rows (lg+). */
const DRAFT_LIST_GRID_CLASS =
  "lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.25fr)_4.5rem_7rem_5.75rem_7rem_4.5rem] lg:items-center lg:gap-x-2.5";
const DRAFT_LIST_HEADER_CLASS =
  "hidden lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.25fr)_4.5rem_7rem_5.75rem_7rem_4.5rem] lg:items-center lg:gap-x-2.5";

const DRAFT_COMPACT_CELL = "min-w-0 isolate overflow-hidden";
const DRAFT_META_CELL = "min-w-0 shrink-0 isolate overflow-hidden";
const DRAFT_ROW_ICON_BTN =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-900/80 text-zinc-400 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50";

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M7.5 7 8.2 19.2A1.8 1.8 0 0 0 10 21h4a1.8 1.8 0 0 0 1.8-1.8L16.5 7" />
    </svg>
  );
}

const COMPACT_HOURS_BADGE =
  "inline-flex h-7 w-[4.5rem] min-w-[4.5rem] shrink-0 items-center justify-center truncate rounded-md border border-zinc-700/80 bg-zinc-950/80 px-1.5 text-xs text-zinc-200";
const COMPACT_DATE_BADGE =
  "inline-flex h-7 w-[7rem] min-w-[7rem] max-w-[7rem] shrink-0 items-center justify-center truncate rounded-md border border-zinc-700/80 bg-zinc-950/80 px-1.5 text-xs text-zinc-200";
const COMPACT_PRIORITY_BADGE =
  "inline-flex h-7 w-[5.75rem] min-w-[5.75rem] max-w-[5.75rem] shrink-0 items-center justify-center truncate rounded-md border border-zinc-700/80 bg-zinc-950/80 px-1.5 text-xs text-zinc-200";
const COMPACT_STATUS_SELECT =
  "h-7 w-[7rem] min-w-[7rem] max-w-[7rem] shrink-0 truncate rounded-full border bg-zinc-900 px-2 text-xs font-medium text-zinc-100 outline-none transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-900";

export default function WorkReportsPage() {
  const [currentRole, setCurrentRole] = useState<AppRole>("employee");
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [monthlyReportId, setMonthlyReportId] = useState<string | null>(null);
  const [monthState, setMonthState] = useState<MonthState>(() => buildMonthState(null));
  const [rows, setRows] = useState<WorkItem[]>([]);
  const [clients, setClients] = useState<LookupItem[]>([]);
  const [services, setServices] = useState<LookupItem[]>([]);
  const [tasks, setTasks] = useState<LookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Stable per mount; used both to default the selected month and to evaluate the grace period.
  // Using local-calendar fields throughout to avoid timezone month-rollover bugs.
  const [today] = useState<Date>(() => new Date());
  const [monthValue, setMonthValue] = useState<string>(() => toMonthValue(today));
  const [formValues, setFormValues] = useState({
    clientId: "",
    serviceId: "",
    taskDescription: "",
    hours: "",
    notes: "",
    dateValue: { start: "", end: "" } as { start: string; end: string },
    priority: "normal",
  });
  const [draftClientFilter, setDraftClientFilter] = useState("");
  const [draftStatusFilter, setDraftStatusFilter] = useState("");
  const [draftEdits, setDraftEdits] = useState<Record<string, DraftEditState>>({});
  const [editingField, setEditingField] = useState<{ rowId: string; field: "hours" | "notes" | "date" | "priority" } | null>(null);
  const [savingInlineFields, setSavingInlineFields] = useState<Record<string, boolean>>({});
  const [showUnfinishedConfirm, setShowUnfinishedConfirm] = useState(false);
  const [unfinishedDraftCount, setUnfinishedDraftCount] = useState(0);
  const [ownEmployeeId, setOwnEmployeeId] = useState<string | null>(null);
  const [deleteConfirmRowId, setDeleteConfirmRowId] = useState<string | null>(null);
  const [isDeletingRow, setIsDeletingRow] = useState(false);
  const [viewRowId, setViewRowId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [spendClientId, setSpendClientId] = useState("");
  const [metaAdsServiceId, setMetaAdsServiceId] = useState<string | null>(null);
  const [googleAdsServiceId, setGoogleAdsServiceId] = useState<string | null>(null);
  const [monthlyAdSpend, setMonthlyAdSpend] = useState<MonthlyAdSpendState>({
    metaAdsSpend: "",
    googleAdsSpend: "",
  });
  const [isAdSpendLoading, setIsAdSpendLoading] = useState(false);
  const [isAdSpendSaving, setIsAdSpendSaving] = useState(false);
  const [adSpendMessage, setAdSpendMessage] = useState("");

  const validTaskStatus = (s: string) =>
    TASK_STATUS_OPTIONS.some((o) => o.value === s) ? s : "waiting";

  useEffect(() => {
    const loadLookupsAndEmployee = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const [
        authUserResult,
        employeesResult,
        clientsResult,
        servicesResult,
        tasksResult,
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("employees").select("id, first_name, last_name, email, auth_user_id, app_role").order("created_at", { ascending: false }),
        supabase.from("clients").select("id, name").order("name", { ascending: true }),
        supabase.from("services").select("id, name").order("name", { ascending: true }),
        supabase.from("tasks").select("id, name").order("name", { ascending: true }),
      ]);

      if (employeesResult.error || clientsResult.error || servicesResult.error || tasksResult.error) {
        setErrorMessage("Не успяхме да заредим началните данни.");
        setIsLoading(false);
        return;
      }

      const authUser = authUserResult.data.user;
      const allEmployees = (employeesResult.data ?? []) as Record<string, unknown>[];
      const options = allEmployees.map((row) => {
        const firstName = typeof row.first_name === "string" ? row.first_name : "";
        const lastName = typeof row.last_name === "string" ? row.last_name : "";
        const fullName = `${firstName} ${lastName}`.trim();
        return {
          id: String(row.id ?? ""),
          name: fullName || (typeof row.email === "string" ? row.email : "Без име"),
        };
      }).filter((item) => item.id);
      setEmployeeOptions(options);

      let selfRow: Record<string, unknown> | undefined;
      if (authUser?.id) {
        selfRow = allEmployees.find((row) => String(row.auth_user_id ?? "") === authUser.id);
      }
      if (!selfRow && authUser?.email) {
        selfRow = allEmployees.find((row) => String(row.email ?? "").toLowerCase() === authUser.email?.toLowerCase());
      }
      const selfEmployeeId = selfRow?.id ? String(selfRow.id) : null;
      setCurrentRole(resolveAppRole(selfRow?.app_role));
      setOwnEmployeeId(selfEmployeeId);

      if (selfEmployeeId) {
        setEmployeeId(selfEmployeeId);
      } else {
        setEmployeeId(options[0]?.id ?? null);
      }
      setClients((clientsResult.data ?? []).map((x) => ({ id: String(x.id), name: String(x.name) })));
      const mappedServices = (servicesResult.data ?? []).map((x) => ({ id: String(x.id), name: String(x.name) }));
      setServices(mappedServices);
      const metaAds = mappedServices.find((item) => item.name === "Meta Ads");
      const googleAds = mappedServices.find((item) => item.name === "Google Ads");
      setMetaAdsServiceId(metaAds?.id ?? null);
      setGoogleAdsServiceId(googleAds?.id ?? null);
      setTasks((tasksResult.data ?? []).map((x) => ({ id: String(x.id), name: String(x.name) })));
      setIsLoading(false);
    };

    loadLookupsAndEmployee();
  }, []);

  useEffect(() => {
    const loadMonthData = async () => {
      if (!employeeId) return;

      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const { year, month } = monthBounds(monthValue);
      const monthlyReportsResult = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("report_year", year)
        .eq("report_month", month)
        .maybeSingle();
      if (monthlyReportsResult.error) {
        setErrorMessage("Не успяхме да заредим monthly_reports.");
        setIsLoading(false);
        return;
      }

      let monthlyReport = (monthlyReportsResult.data as Record<string, unknown> | null) ?? null;

      if (!monthlyReport) {
        const insertPayload = {
          employee_id: employeeId,
          report_month: month,
          report_year: year,
          status: "draft",
          submitted_at: null,
          locked_at: null,
        };
        const insertResult = await supabase.from("monthly_reports").insert(insertPayload).select("*").limit(1).single();
        if (!insertResult.error && insertResult.data) {
          monthlyReport = insertResult.data as Record<string, unknown>;
        }
        if (!monthlyReport) {
          setErrorMessage("Не успяхме да създадем monthly_reports запис за този месец.");
          setIsLoading(false);
          return;
        }
      }

      const currentMonthlyReportId = String(monthlyReport.id ?? "");
      setMonthlyReportId(currentMonthlyReportId);
      const resolvedMonthState = buildMonthState(monthlyReport);
      setMonthState(resolvedMonthState);

      const itemsResult = await supabase.from("work_report_items").select("*").eq("monthly_report_id", currentMonthlyReportId);
      if (itemsResult.error) {
        setRows([]);
        setErrorMessage("Не успяхме да заредим work_report_items.");
        setIsLoading(false);
        return;
      }

      const mappedItems: WorkItem[] = ((itemsResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id ?? crypto.randomUUID()),
        clientId: row.client_id ? String(row.client_id) : null,
        serviceId: row.service_id ? String(row.service_id) : null,
        taskId: row.task_id ? String(row.task_id) : null,
        taskDescription: typeof row.task_description === "string" ? row.task_description : null,
        hours: parseHours(row.hours),
        notes: typeof row.notes === "string" ? row.notes : "",
        taskStatus: String(row.task_status ?? "waiting"),
        status: resolvedMonthState.isSubmitted || resolvedMonthState.isLocked ? "sent" : "draft",
        startDate: row.start_date && typeof row.start_date === "string" ? String(row.start_date).slice(0, 10) : null,
        endDate: row.end_date && typeof row.end_date === "string" ? String(row.end_date).slice(0, 10) : null,
        priority: row.priority && typeof row.priority === "string" ? row.priority : null,
        raw: row,
      }));

      setRows(mappedItems);
      setDraftEdits({});
      setIsLoading(false);
    };

    loadMonthData();
  }, [employeeId, monthValue]);

  useEffect(() => {
    const loadMonthlyAdSpend = async () => {
      if (!spendClientId || !monthValue || (!metaAdsServiceId && !googleAdsServiceId)) {
        setMonthlyAdSpend({ metaAdsSpend: "", googleAdsSpend: "" });
        return;
      }

      const serviceIds = [metaAdsServiceId, googleAdsServiceId].filter((id): id is string => Boolean(id));
      if (serviceIds.length === 0) return;

      setIsAdSpendLoading(true);
      setAdSpendMessage("");

      const result = await supabase
        .from("client_service_spend")
        .select("service_id, spend")
        .eq("client_id", spendClientId)
        .eq("month", monthValue)
        .in("service_id", serviceIds);

      if (result.error) {
        setAdSpendMessage("Не успяхме да заредим рекламния бюджет за този месец.");
        setMonthlyAdSpend({ metaAdsSpend: "", googleAdsSpend: "" });
        setIsAdSpendLoading(false);
        return;
      }

      let metaValue = "";
      let googleValue = "";
      for (const row of (result.data ?? []) as Array<{ service_id: string; spend: number | null }>) {
        if (metaAdsServiceId && row.service_id === metaAdsServiceId && row.spend != null) {
          metaValue = String(row.spend);
        }
        if (googleAdsServiceId && row.service_id === googleAdsServiceId && row.spend != null) {
          googleValue = String(row.spend);
        }
      }

      setMonthlyAdSpend({ metaAdsSpend: metaValue, googleAdsSpend: googleValue });
      setIsAdSpendLoading(false);
    };

    void loadMonthlyAdSpend();
  }, [googleAdsServiceId, metaAdsServiceId, monthValue, spendClientId]);

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item.name])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((item) => [item.id, item.name])), [services]);
  const taskById = useMemo(() => new Map(tasks.map((item) => [item.id, item.name])), [tasks]);
  const employeeById = useMemo(() => new Map(employeeOptions.map((item) => [item.id, item.name])), [employeeOptions]);
  const selectedEmployeeName = employeeId ? employeeById.get(employeeId) ?? "—" : "—";

  const buildItemDetail = useCallback(
    (row: WorkItem): WorkReportItemDetail => {
      const clientName = row.clientId ? clientById.get(row.clientId) ?? "—" : "—";
      const serviceName = row.serviceId ? serviceById.get(row.serviceId) ?? "—" : "—";
      const taskName = row.taskDescription?.trim() || (row.taskId ? taskById.get(row.taskId) ?? "—" : "—");
      const taskEditText =
        row.taskDescription?.trim() || (row.taskId ? taskById.get(row.taskId) ?? "" : "");
      const status = validTaskStatus(row.taskStatus);
      const updatedAtRaw = row.raw.updated_at ?? row.raw.updatedAt;
      const start = row.startDate ?? "";
      const end = row.endDate && row.endDate !== row.startDate ? row.endDate : "";
      const priority =
        row.priority != null && PRIORITY_VALUES.has(row.priority) ? row.priority : "normal";

      return {
        id: row.id,
        clientName,
        serviceName,
        taskDescription: taskName,
        notes: row.notes,
        hoursLabel: `${formatHours(row.hours)} ч`,
        dateLabel: formatDateRangeDisplay(row.startDate, row.endDate) ?? "—",
        priorityLabel: priorityLabel(row.priority),
        statusLabel: TASK_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
        statusClassName: taskStatusClasses(status),
        employeeName: selectedEmployeeName,
        createdAtLabel: formatDateTimeDisplay(row.raw.created_at),
        updatedAtLabel: formatDateTimeDisplay(updatedAtRaw),
        editValues: {
          clientId: row.clientId ?? "",
          serviceId: row.serviceId ?? "",
          taskDescription: taskEditText,
          notes: row.notes,
          hours: String(row.hours),
          dateValue: { start, end },
          priority,
          taskStatus: status,
        },
      };
    },
    [clientById, serviceById, taskById, selectedEmployeeName]
  );

  const viewRowDetail = useMemo(() => {
    if (!viewRowId) return null;
    const row = rows.find((item) => item.id === viewRowId);
    return row ? buildItemDetail(row) : null;
  }, [buildItemDetail, rows, viewRowId]);

  const employeeSelectOptions = useMemo<SelectOption[]>(
    () => employeeOptions.map((employee) => ({ value: employee.id, label: employee.name })),
    [employeeOptions]
  );
  const clientSelectOptions = useMemo<SelectOption[]>(
    () => clients.map((client) => ({ value: client.id, label: client.name })),
    [clients]
  );
  const serviceSelectOptions = useMemo<SelectOption[]>(
    () => services.map((service) => ({ value: service.id, label: service.name })),
    [services]
  );
  const prioritySelectOptions = useMemo<SelectOption[]>(
    () => PRIORITY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    []
  );
  const taskStatusSelectOptions = useMemo<SelectOption[]>(
    () => TASK_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    []
  );
  const draftStatusFilterOptions = useMemo<SelectOption[]>(
    () => [{ value: "", label: "Всички статуси" }, ...TASK_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))],
    []
  );
  const clientFilterOptions = useMemo<SelectOption[]>(
    () => [{ value: "", label: "Всички клиенти" }, ...clients.map((client) => ({ value: client.id, label: client.name }))],
    [clients]
  );
  const draftFilterSelectClasses =
    "w-full min-w-0 max-w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/40 sm:max-w-[200px]";

  const draftRows = useMemo(() => rows.filter((row) => row.status === "draft"), [rows]);
  const sentRows = useMemo(() => rows.filter((row) => row.status === "sent"), [rows]);
  const filteredDraftRows = useMemo(() => {
    return draftRows.filter((row) => {
      if (draftClientFilter && row.clientId !== draftClientFilter) return false;
      const status = validTaskStatus(row.taskStatus);
      if (draftStatusFilter && status !== draftStatusFilter) return false;
      return true;
    });
  }, [draftRows, draftClientFilter, draftStatusFilter]);
  const taskStatusSummary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const status = validTaskStatus(row.taskStatus);
          acc.total += 1;
          if (status === "waiting") acc.waiting += 1;
          if (status === "started") acc.started += 1;
          if (status === "in_progress") acc.in_progress += 1;
          if (status === "done") acc.done += 1;
          return acc;
        },
        { total: 0, waiting: 0, started: 0, in_progress: 0, done: 0 }
      ),
    [rows]
  );
  const tasksByClient = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.clientId) continue;
      counts.set(row.clientId, (counts.get(row.clientId) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([clientId, count]) => ({
        clientId,
        clientName: clientById.get(clientId) ?? "Без клиент",
        count,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.clientName.localeCompare(b.clientName, "bg-BG");
      });
  }, [rows, clientById]);

  const reloadItems = async () => {
    if (!monthlyReportId) return;
    const itemsResult = await supabase.from("work_report_items").select("*").eq("monthly_report_id", monthlyReportId);
    if (itemsResult.error) return;

    const mappedItems: WorkItem[] = ((itemsResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id ?? crypto.randomUUID()),
      clientId: row.client_id ? String(row.client_id) : null,
      serviceId: row.service_id ? String(row.service_id) : null,
      taskId: row.task_id ? String(row.task_id) : null,
      taskDescription: typeof row.task_description === "string" ? row.task_description : null,
      hours: parseHours(row.hours),
      notes: typeof row.notes === "string" ? row.notes : "",
      taskStatus: String(row.task_status ?? "waiting"),
      status: monthState.isSubmitted || monthState.isLocked ? "sent" : "draft",
      startDate: row.start_date && typeof row.start_date === "string" ? String(row.start_date).slice(0, 10) : null,
      endDate: row.end_date && typeof row.end_date === "string" ? String(row.end_date).slice(0, 10) : null,
      priority: row.priority && typeof row.priority === "string" ? row.priority : null,
      raw: row,
    }));

    setRows(mappedItems);
    setDraftEdits({});
  };

  const draftEditForRow = (row: WorkItem) => {
    const existing = draftEdits[row.id];
    if (existing) return existing;
    const start = row.startDate ?? "";
    const end = row.endDate && row.endDate !== row.startDate ? row.endDate : "";
    const priority = row.priority != null && PRIORITY_VALUES.has(row.priority) ? row.priority : "normal";
    return {
      hours: String(row.hours),
      notes: row.notes,
      dateValue: { start, end },
      priority,
    };
  };

  const handleTaskStatusChange = async (itemId: string, newTaskStatus: string) => {
    if (!canEditMonth) {
      setErrorMessage("Този месец е заключен за редакция. Можете само да преглеждате отчета.");
      return;
    }
    const result = await supabase
      .from("work_report_items")
      .update({ task_status: newTaskStatus })
      .eq("id", itemId);
    if (result.error) {
      setErrorMessage(`Не успяхме да обновим статуса. ${result.error.message}`);
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === itemId ? { ...r, taskStatus: newTaskStatus, raw: { ...r.raw, task_status: newTaskStatus } } : r))
    );
  };

  const handleDraftFieldChange = (row: WorkItem, field: "hours" | "notes", value: string) => {
    const base = draftEditForRow(row);
    setDraftEdits((prev) => ({
      ...prev,
      [row.id]: {
        ...base,
        [field]: value,
      },
    }));
  };

  const handleDraftDateChange = (row: WorkItem, value: { start: string; end: string }) => {
    const base = draftEditForRow(row);
    setDraftEdits((prev) => ({
      ...prev,
      [row.id]: {
        ...base,
        dateValue: value,
      },
    }));
  };

  const handleDraftPriorityChange = (row: WorkItem, value: string) => {
    const base = draftEditForRow(row);
    setDraftEdits((prev) => ({
      ...prev,
      [row.id]: {
        ...base,
        priority: value,
      },
    }));
  };

  const startEditingField = (row: WorkItem, field: "hours" | "notes" | "date" | "priority") => {
    if (!canEditMonth) return;
    const base = draftEditForRow(row);
    setDraftEdits((prev) => ({
      ...prev,
      [row.id]: base,
    }));
    setEditingField({ rowId: row.id, field });
  };

  const cancelEditingField = (row: WorkItem) => {
    setDraftEdits((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setEditingField((prev) => (prev?.rowId === row.id ? null : prev));
  };

  const handleSaveDraftField = async (
    row: WorkItem,
    field: "hours" | "notes" | "date" | "priority",
    priorityValue?: string
  ) => {
    if (!canEditMonth) {
      setErrorMessage("Този месец е заключен за редакция. Можете само да преглеждате отчета.");
      return;
    }
    const edit = draftEditForRow(row);
    const saveKey = `${row.id}:${field}`;
    setErrorMessage("");
    setSuccessMessage("");
    setSavingInlineFields((prev) => ({ ...prev, [saveKey]: true }));

    const payload: Record<string, string | number | null> = {};
    if (field === "hours") {
      const parsedHoursResult = parseHoursInput(edit.hours);
      if (parsedHoursResult.error || parsedHoursResult.value == null) {
        setErrorMessage(parsedHoursResult.error ?? "Невалидни часове.");
        setSavingInlineFields((prev) => ({ ...prev, [saveKey]: false }));
        return;
      }
      const parsedHours = parsedHoursResult.value;
      payload.hours = parsedHours;
    } else if (field === "notes") {
      payload.notes = edit.notes.trim() || null;
    } else if (field === "date") {
      const start = edit.dateValue.start.trim() || null;
      const end = edit.dateValue.end.trim() || null;
      const startDate = start;
      const endDate = end && end !== start ? end : null;
      payload.start_date = startDate;
      payload.end_date = endDate;
    } else if (field === "priority") {
      const valueToSave = priorityValue !== undefined ? priorityValue : edit.priority;
      payload.priority = normalizePriority(valueToSave);
    }

    const result = await supabase.from("work_report_items").update(payload).eq("id", row.id);
    if (result.error) {
      setErrorMessage(`Не успяхме да запазим промяната. ${result.error.message}`);
      setSavingInlineFields((prev) => ({ ...prev, [saveKey]: false }));
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              hours: field === "hours" ? Number(payload.hours) : r.hours,
              notes: field === "notes" ? (typeof payload.notes === "string" ? payload.notes : "") : r.notes,
              startDate:
                field === "date"
                  ? typeof payload.start_date === "string"
                    ? payload.start_date.slice(0, 10)
                    : null
                  : r.startDate,
              endDate:
                field === "date"
                  ? typeof payload.end_date === "string"
                    ? payload.end_date.slice(0, 10)
                    : null
                  : r.endDate,
              priority:
                field === "priority"
                  ? (payload.priority != null ? String(payload.priority) : null)
                  : r.priority,
              raw: { ...r.raw, ...payload },
            }
          : r
      )
    );
    cancelEditingField(row);
    setSavingInlineFields((prev) => ({ ...prev, [saveKey]: false }));
  };

  const handleAddRow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!monthlyReportId) return;
    if (!canEditMonth) {
      setErrorMessage("Този месец е заключен за редакция. Можете само да преглеждате отчета.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (!formValues.clientId || !formValues.serviceId || !formValues.taskDescription.trim() || !formValues.hours) {
      setErrorMessage("Моля, попълнете клиент, услуга, задача и часове.");
      return;
    }

    setIsSaving(true);
    const parsedHoursResult = parseHoursInput(formValues.hours);
    if (parsedHoursResult.error || parsedHoursResult.value == null) {
      setErrorMessage(parsedHoursResult.error ?? "Невалидни часове.");
      setIsSaving(false);
      return;
    }
    const parsedHours = parsedHoursResult.value;
    const start = formValues.dateValue.start.trim() || null;
    const end = formValues.dateValue.end.trim() || null;
    const startDate = start;
    const endDate = end && end !== start ? end : null;
    const payload = {
      monthly_report_id: monthlyReportId,
      client_id: formValues.clientId,
      service_id: formValues.serviceId,
      task_id: null,
      task_description: formValues.taskDescription.trim(),
      hours: parsedHours,
      notes: formValues.notes.trim() || null,
      task_status: "waiting",
      start_date: startDate,
      end_date: endDate,
      priority: formValues.priority || null,
    };

    const result = await supabase.from("work_report_items").insert(payload);
    if (result.error) {
      setErrorMessage(`Не успяхме да добавим ред. ${result.error.message}`);
      setIsSaving(false);
      return;
    }

    setFormValues({
      clientId: "",
      serviceId: "",
      taskDescription: "",
      hours: "",
      notes: "",
      dateValue: { start: "", end: "" },
      priority: "normal",
    });
    setSuccessMessage("Редът е добавен успешно.");
    await reloadItems();
    setIsSaving(false);
  };

  const handleSaveMonthlyAdSpend = async () => {
    setAdSpendMessage("");
    if (!spendClientId) {
      setAdSpendMessage("Избери клиент за рекламния бюджет.");
      return;
    }

    if (!metaAdsServiceId || !googleAdsServiceId) {
      setAdSpendMessage("Не са намерени услугите Meta Ads и Google Ads в каталога.");
      return;
    }

    const metaValue = parseMoneyInput(monthlyAdSpend.metaAdsSpend);
    const googleValue = parseMoneyInput(monthlyAdSpend.googleAdsSpend);

    if (metaValue == null || googleValue == null) {
      setAdSpendMessage("Въведи валидни суми (число >= 0).");
      return;
    }

    setIsAdSpendSaving(true);
    const payload = [
      {
        client_id: spendClientId,
        service_id: metaAdsServiceId,
        month: monthValue,
        spend: metaValue,
      },
      {
        client_id: spendClientId,
        service_id: googleAdsServiceId,
        month: monthValue,
        spend: googleValue,
      },
    ];

    const result = await supabase
      .from("client_service_spend")
      .upsert(payload, { onConflict: "client_id,service_id,month" });

    if (result.error) {
      setAdSpendMessage(`Не успяхме да запазим рекламния бюджет. ${result.error.message}`);
      setIsAdSpendSaving(false);
      return;
    }

    setAdSpendMessage("Рекламният бюджет е запазен.");
    setIsAdSpendSaving(false);
  };

  const handleSendAndLock = async () => {
    if (!monthlyReportId || draftRows.length === 0) return;
    if (!canEditMonth) {
      setErrorMessage("Този месец е заключен за редакция. Можете само да преглеждате отчета.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("monthly_reports")
      .update({ status: "submitted", submitted_at: nowIso, locked_at: nowIso })
      .eq("id", monthlyReportId);
    if (error) {
      setErrorMessage(`Не успяхме да изпратим месеца. Детайли: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setMonthState(
      buildMonthState({
        status: "submitted",
        submitted_at: nowIso,
        locked_at: nowIso,
      })
    );
    setSuccessMessage("Месецът е изпратен и заключен.");
    await reloadItems();
    setIsSaving(false);
  };

  const handleSubmitWithUnfinishedCheck = () => {
    if (!monthlyReportId || draftRows.length === 0) return;

    const unfinishedCount = draftRows.filter((row) => validTaskStatus(row.taskStatus) !== "done").length;

    if (unfinishedCount === 0) {
      void handleSendAndLock();
      return;
    }

    setUnfinishedDraftCount(unfinishedCount);
    setShowUnfinishedConfirm(true);
  };

  const handleConfirmSubmitMonth = () => {
    setShowUnfinishedConfirm(false);
    void handleSendAndLock();
  };

  /**
   * Effective month-level editability for the CURRENT viewer.
   *
   * - Admin: keeps existing behavior — can edit any month that is not submitted/locked.
   *   Grace-period rules do NOT apply to admins.
   * - Employee: must also pass canEmployeeEditMonth() — current month always editable,
   *   previous month editable only through the 5th of the current month inclusive,
   *   older months read-only.
   */
  const canEditMonth = useMemo<boolean>(() => {
    if (currentRole === "admin") return monthState.isEditable;
    return canEmployeeEditMonth(monthValue, today, monthState);
  }, [currentRole, monthValue, today, monthState]);

  /** Show the "previous-month grace period is active" hint to employees only. */
  const showGracePeriodNote = useMemo<boolean>(
    () =>
      currentRole !== "admin" &&
      isPreviousMonth(monthValue, today) &&
      isWithinGracePeriod(today) &&
      monthState.isEditable,
    [currentRole, monthValue, today, monthState]
  );

  /**
   * Show the generic read-only banner to employees when the month is uneditable for them
   * but NOT because it is already submitted/locked (that case has its own status message).
   */
  const showEmployeeGraceReadOnlyNote = useMemo<boolean>(
    () =>
      currentRole !== "admin" &&
      !canEditMonth &&
      !monthState.isSubmitted &&
      !monthState.isLocked,
    [currentRole, canEditMonth, monthState]
  );

  const canEditDraftRow = useCallback(
    (row: WorkItem) =>
      row.status === "draft" &&
      canEditMonth &&
      (currentRole === "admin" || (ownEmployeeId != null && employeeId === ownEmployeeId)),
    [canEditMonth, currentRole, ownEmployeeId, employeeId]
  );

  const canDeleteDraftRow = canEditDraftRow;

  const handleSaveModalItem = useCallback(
    async (values: WorkReportItemEditValues): Promise<{ ok: true } | { ok: false; message: string }> => {
      const row = viewRowId ? rows.find((item) => item.id === viewRowId) : null;
      if (!row || !canEditDraftRow(row)) {
        return { ok: false, message: "Редакцията не е позволена за тази задача." };
      }

      if (!values.clientId || !values.serviceId || !values.taskDescription.trim()) {
        return { ok: false, message: "Моля, попълнете клиент, услуга и задача." };
      }

      const parsedHoursResult = parseHoursInput(values.hours);
      if (parsedHoursResult.error || parsedHoursResult.value == null) {
        return { ok: false, message: parsedHoursResult.error ?? "Въведете валидни часове." };
      }
      const parsedHours = parsedHoursResult.value;

      const start = values.dateValue.start.trim() || null;
      const end = values.dateValue.end.trim() || null;
      const startDate = start;
      const endDate = end && end !== start ? end : null;
      const taskStatus = validTaskStatus(values.taskStatus);

      const payload = {
        client_id: values.clientId,
        service_id: values.serviceId,
        task_description: values.taskDescription.trim(),
        notes: values.notes.trim() || null,
        hours: parsedHours,
        start_date: startDate,
        end_date: endDate,
        priority: normalizePriority(values.priority),
        task_status: taskStatus,
      };

      const result = await supabase.from("work_report_items").update(payload).eq("id", row.id);
      if (result.error) {
        const message = `Не успяхме да запазим промените. ${result.error.message}`;
        setToast({ message, variant: "error" });
        return { ok: false, message };
      }

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                clientId: values.clientId,
                serviceId: values.serviceId,
                taskDescription: values.taskDescription.trim(),
                notes: values.notes,
                hours: parsedHours,
                startDate,
                endDate,
                priority: payload.priority != null ? String(payload.priority) : null,
                taskStatus,
                raw: { ...r.raw, ...payload },
              }
            : r
        )
      );

      setDraftEdits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });

      setToast({ message: "Промените са запазени.", variant: "success" });
      return { ok: true };
    },
    [rows, viewRowId, canEditDraftRow]
  );

  const viewRow = useMemo(
    () => (viewRowId ? rows.find((item) => item.id === viewRowId) ?? null : null),
    [rows, viewRowId]
  );
  const viewRowCanEdit = viewRow ? canEditDraftRow(viewRow) : false;

  const handleRequestDeleteDraftRow = (row: WorkItem) => {
    if (!canDeleteDraftRow(row)) return;
    setErrorMessage("");
    setDeleteConfirmRowId(row.id);
  };

  const handleConfirmDeleteDraftRow = async () => {
    if (!deleteConfirmRowId) return;

    const row = rows.find((item) => item.id === deleteConfirmRowId);
    if (!row || !canDeleteDraftRow(row)) {
      setDeleteConfirmRowId(null);
      return;
    }

    setIsDeletingRow(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await supabase.from("work_report_items").delete().eq("id", row.id);
    if (result.error) {
      setToast({ message: `Не успяхме да изтрием задачата. ${result.error.message}`, variant: "error" });
      setIsDeletingRow(false);
      return;
    }

    setRows((prev) => prev.filter((item) => item.id !== row.id));
    setDraftEdits((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    if (editingField?.rowId === row.id) {
      setEditingField(null);
    }
    if (viewRowId === row.id) {
      setViewRowId(null);
    }
    setDeleteConfirmRowId(null);
    setToast({ message: "Задачата е изтрита.", variant: "success" });
    setIsDeletingRow(false);
  };

  const handleAdminUnlockMonth = async () => {
    if (currentRole !== "admin" || !monthlyReportId) return;
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const nextStatus =
      monthState.status === "approved" || monthState.status === "finalized" || monthState.status === "locked"
        ? "edit_requested"
        : "draft";

    const { error } = await supabase
      .from("monthly_reports")
      .update({
        submitted_at: null,
        locked_at: null,
        status: nextStatus,
      })
      .eq("id", monthlyReportId);

    if (error) {
      setErrorMessage(`Не успяхме да отключим месеца. ${error.message}`);
      setIsSaving(false);
      return;
    }

    setMonthState(
      buildMonthState({
        status: nextStatus,
        submitted_at: null,
        locked_at: null,
      })
    );
    setSuccessMessage("Месецът е отключен. Записите са запазени.");
    await reloadItems();
    setIsSaving(false);
  };

  const renderRowCard = (row: WorkItem, readOnly: boolean) => {
    const clientName = row.clientId ? clientById.get(row.clientId) ?? "-" : "-";
    const serviceName = row.serviceId ? serviceById.get(row.serviceId) ?? "-" : "-";
    const taskName = row.taskDescription?.trim() || (row.taskId ? taskById.get(row.taskId) ?? "-" : "-");
    const status = validTaskStatus(row.taskStatus);
    const draftEdit = draftEditForRow(row);
    const isEditingHours = editingField?.rowId === row.id && editingField.field === "hours";
    const isEditingNotes = editingField?.rowId === row.id && editingField.field === "notes";
    const isEditingDate = editingField?.rowId === row.id && editingField.field === "date";
    const isEditingPriority = editingField?.rowId === row.id && editingField.field === "priority";
    const isHoursSaving = Boolean(savingInlineFields[`${row.id}:hours`]);
    const isNotesSaving = Boolean(savingInlineFields[`${row.id}:notes`]);
    const isDateSaving = Boolean(savingInlineFields[`${row.id}:date`]);
    const isPrioritySaving = Boolean(savingInlineFields[`${row.id}:priority`]);
    const dateLabel = formatDateRangeDisplay(row.startDate, row.endDate);

    const labelClass = "text-[11px] font-medium uppercase tracking-wider text-zinc-500";
    const metaBadgeBase =
      "inline-flex items-center rounded-md border border-zinc-600/60 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300";

    return (
      <div
        key={row.id}
        className={`min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-5 ${taskStatusRowClasses(status)}`}
      >
<div className="grid grid-cols-1 gap-3 text-zinc-300 sm:grid-cols-3 sm:gap-4">
          <div className={DRAFT_COMPACT_CELL}>
            <p className={labelClass}>Клиент</p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-100" title={clientName}>
              {clientName}
            </p>
          </div>
          <div className={DRAFT_COMPACT_CELL}>
            <p className={labelClass}>Услуга</p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-100" title={serviceName}>
              {serviceName}
            </p>
          </div>
          <div className={DRAFT_COMPACT_CELL}>
            <p className={labelClass}>Задача</p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-100" title={taskName}>
              {taskName}
            </p>
          </div>
        </div>

        {/* Row 2: Compact metadata — Hours, Date, Priority (one horizontal line, badge-style) */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={labelClass}>Часове</span>
          {readOnly ? (
            <span className={metaBadgeBase}>{formatHours(row.hours)} ч</span>
          ) : isEditingHours ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={draftEdit.hours}
                onChange={(e) => handleDraftFieldChange(row, "hours", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSaveDraftField(row, "hours");
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEditingField(row);
                  }
                }}
                disabled={isHoursSaving}
                className="w-14 rounded-md border border-zinc-600/60 bg-zinc-800/70 px-2 py-0.5 text-xs text-zinc-100 outline-none focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void handleSaveDraftField(row, "hours")}
                disabled={isHoursSaving}
                className="rounded bg-sky-500/80 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-sky-500 disabled:opacity-60"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => cancelEditingField(row)}
                className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-700/50"
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => startEditingField(row, "hours")}
              className={`${metaBadgeBase} cursor-text transition hover:border-zinc-500/60 hover:bg-zinc-700/40 hover:decoration-sky-300/70 hover:underline`}
              title="Клик за редакция"
            >
              {formatHours(row.hours)} ч
            </button>
          )}

          <span className="mx-1 text-zinc-600">·</span>
          <span className={labelClass}>Дата</span>
          {readOnly ? (
            <span className={metaBadgeBase}>{dateLabel ?? "—"}</span>
          ) : isEditingDate ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <DatePicker
                value={draftEdit.dateValue}
                onChange={(v) => handleDraftDateChange(row, v)}
                placeholder="Избери дата"
                locale="bg-BG"
              />
              <button
                type="button"
                onClick={() => void handleSaveDraftField(row, "date")}
                disabled={isDateSaving}
                className="rounded bg-sky-500/80 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-sky-500 disabled:opacity-60"
              >
                Запази
              </button>
              <button
                type="button"
                onClick={() => cancelEditingField(row)}
                className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-700/50"
              >
                Отказ
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => startEditingField(row, "date")}
              className={`${metaBadgeBase} cursor-text transition hover:border-zinc-500/60 hover:bg-zinc-700/40 hover:decoration-sky-300/70 hover:underline`}
              title="Клик за редакция"
            >
              {dateLabel ?? "Избери дата"}
            </button>
          )}

          <span className="mx-1 text-zinc-600">·</span>
          <span className={labelClass}>Приоритет</span>
          {readOnly ? (
            <span className={metaBadgeBase}>{priorityLabel(row.priority)}</span>
          ) : isEditingPriority ? (
            <span className="inline-flex items-center gap-1">
              <select
                autoFocus
                value={draftEdit.priority}
                onChange={(e) => {
                  const newPriority = e.target.value;
                  handleDraftPriorityChange(row, newPriority);
                  void handleSaveDraftField(row, "priority", newPriority);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEditingField(row);
                  }
                }}
                disabled={isPrioritySaving}
                className="rounded-md border border-zinc-600/60 bg-zinc-800/70 px-2 py-0.5 text-xs text-zinc-100 outline-none focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20 disabled:opacity-60"
              >
                <option value="">Без приоритет</option>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => startEditingField(row, "priority")}
              className={`${metaBadgeBase} cursor-text transition hover:border-zinc-500/60 hover:bg-zinc-700/40 hover:decoration-sky-300/70 hover:underline`}
              title="Клик за редакция"
            >
              {row.priority != null && PRIORITY_VALUES.has(row.priority)
                ? priorityLabel(row.priority)
                : "Избери приоритет"}
            </button>
          )}
        </div>

        {/* Row 3: Notes (full width, wrapping) */}
        <div className="mt-4 w-full border-t border-zinc-800/80 pt-4">
          <p className={labelClass}>Бележки</p>
          {readOnly ? (
            <p className="mt-0.5 min-h-[1.5rem] break-words text-sm text-zinc-300 whitespace-pre-wrap">{row.notes || "—"}</p>
          ) : (
            <>
              {isEditingNotes ? (
                <div className="mt-0.5 space-y-2">
                  <textarea
                    autoFocus
                    rows={3}
                    value={draftEdit.notes}
                    onChange={(e) => handleDraftFieldChange(row, "notes", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEditingField(row);
                      }
                    }}
                    disabled={isNotesSaving}
                    placeholder="Бележка"
                    className="min-h-[4.5rem] w-full resize-y rounded-md border border-zinc-700/60 bg-zinc-900/70 px-2 py-1.5 text-sm text-zinc-100 outline-none transition-all duration-150 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/25 disabled:opacity-60"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveDraftField(row, "notes")}
                      disabled={isNotesSaving}
                      className="rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:opacity-60"
                    >
                      Запази
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEditingField(row)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800/60"
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEditingField(row, "notes")}
                  className="mt-0.5 inline-block w-full cursor-text rounded-md px-1.5 py-1 text-left text-sm text-zinc-300 decoration-dashed underline-offset-4 transition-all duration-150 hover:bg-zinc-800/45 hover:decoration-sky-300/70 hover:text-zinc-200 hover:underline"
                  title="Клик за редакция"
                >
                  <span className="block break-words whitespace-pre-wrap text-left">{row.notes || "—"}</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Row 4: Status dropdown */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-4">
          {readOnly ? (
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${taskStatusClasses(validTaskStatus(row.taskStatus))}`}
            >
              {TASK_STATUS_OPTIONS.find((o) => o.value === validTaskStatus(row.taskStatus))?.label ?? row.taskStatus}
            </span>
          ) : (
            <label className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Статус:</span>
              <select
                value={validTaskStatus(row.taskStatus)}
                onChange={(e) => handleTaskStatusChange(row.id, e.target.value)}
                className={`rounded-full border bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-100 outline-none transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-900 ${taskStatusClasses(validTaskStatus(row.taskStatus))}`}
              >
                {TASK_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900 text-zinc-100">
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {readOnly && (
            <span className="rounded-full border border-emerald-700/60 bg-emerald-900/30 px-2.5 py-1 text-xs text-emerald-300">
              само за преглед
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderDraftCompactRow = (row: WorkItem) => {
    const clientName = row.clientId ? clientById.get(row.clientId) ?? "-" : "-";
    const serviceName = row.serviceId ? serviceById.get(row.serviceId) ?? "-" : "-";
    const taskName = row.taskDescription?.trim() || (row.taskId ? taskById.get(row.taskId) ?? "-" : "-");
    const status = validTaskStatus(row.taskStatus);
    const draftEdit = draftEditForRow(row);
    // readOnly applies to grace-period-expired months for employees and to non-own drafts.
    // It collapses inline edit triggers into static badges and disables the status select.
    const readOnly = !canEditDraftRow(row);
    const isEditingHours = !readOnly && editingField?.rowId === row.id && editingField.field === "hours";
    const isEditingDate = !readOnly && editingField?.rowId === row.id && editingField.field === "date";
    const isEditingPriority = !readOnly && editingField?.rowId === row.id && editingField.field === "priority";
    const isEditingNotes = !readOnly && editingField?.rowId === row.id && editingField.field === "notes";
    const isHoursSaving = Boolean(savingInlineFields[`${row.id}:hours`]);
    const isDateSaving = Boolean(savingInlineFields[`${row.id}:date`]);
    const isPrioritySaving = Boolean(savingInlineFields[`${row.id}:priority`]);
    const isNotesSaving = Boolean(savingInlineFields[`${row.id}:notes`]);
    const dateLabel = formatDateRangeDisplay(row.startDate, row.endDate);
    const mobileLabelClass = "text-[10px] font-medium uppercase tracking-wide text-zinc-500 lg:hidden";
    const openRowDetail = () => setViewRowId(row.id);

    return (
      <div key={row.id} className="group min-w-0">
        <div
          role="button"
          tabIndex={0}
          onClick={openRowDetail}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openRowDetail();
            }
          }}
          className={`min-w-0 cursor-pointer overflow-hidden rounded-xl border px-3 py-3 transition-colors duration-150 hover:border-zinc-600 hover:bg-zinc-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50 lg:min-h-[3.75rem] lg:py-2.5 ${taskStatusRowClasses(
            status
          )}`}
        >
          <div className={`flex flex-col gap-3 ${DRAFT_LIST_GRID_CLASS}`}>
            <div className={DRAFT_COMPACT_CELL}>
              <p className={mobileLabelClass}>Клиент</p>
              <p className="truncate text-sm text-zinc-100" title={clientName}>
                {clientName}
              </p>
            </div>

            <div className={DRAFT_COMPACT_CELL}>
              <p className={mobileLabelClass}>Услуга</p>
              <p className="truncate text-sm text-zinc-200" title={serviceName}>
                {serviceName}
              </p>
            </div>

            <div className={DRAFT_COMPACT_CELL}>
              <p className={mobileLabelClass}>Задача</p>
              <p className="truncate text-sm font-medium text-zinc-100" title={taskName}>
                {taskName}
              </p>
              {readOnly ? (
                <p
                  className="block w-full truncate text-left text-xs text-zinc-400"
                  title={row.notes || "Без бележки"}
                >
                  {row.notes || "Без бележки"}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    stopRowEvent(event);
                    startEditingField(row, "notes");
                  }}
                  className="block w-full truncate text-left text-xs text-zinc-400 hover:text-zinc-200 hover:underline"
                  title={row.notes || "Редактирай бележка"}
                >
                  {row.notes || "Без бележки"}
                </button>
              )}
            </div>

                        <div className={DRAFT_META_CELL} onClick={stopRowEvent}>
              <p className={mobileLabelClass}>Часове</p>
              {isEditingHours ? (
                <span className="inline-flex items-center gap-1" onClick={stopRowEvent} onKeyDown={stopRowEvent}>
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={draftEdit.hours}
                    onChange={(e) => handleDraftFieldChange(row, "hours", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleSaveDraftField(row, "hours");
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEditingField(row);
                      }
                    }}
                    disabled={isHoursSaving}
                    className="w-[4.25rem] rounded-md border border-zinc-600/70 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={(event) => { stopRowEvent(event); void handleSaveDraftField(row, "hours"); }}
                    disabled={isHoursSaving}
                    className="rounded bg-sky-500/80 px-1.5 py-1 text-[10px] font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                  >
                    ✓
                  </button>
                </span>
              ) : readOnly ? (
                <span className={COMPACT_HOURS_BADGE} title="Само за преглед">
                  {formatHours(row.hours)} ч
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(event) => { stopRowEvent(event); startEditingField(row, "hours"); }}
                  className={`${COMPACT_HOURS_BADGE} cursor-text hover:border-zinc-500/80 hover:bg-zinc-900`}
                  title="Клик за редакция"
                >
                  {formatHours(row.hours)} ч
                </button>
              )}
            </div>

            <div className={DRAFT_META_CELL} onClick={stopRowEvent}>
              <p className={mobileLabelClass}>Дата</p>
              {isEditingDate ? (
                <div className="min-w-0 max-w-full space-y-1.5" onClick={stopRowEvent}>
                  <div className="min-w-0 max-w-[6.75rem]">
                    <DatePicker
                      value={draftEdit.dateValue}
                      onChange={(v) => handleDraftDateChange(row, v)}
                      placeholder="Избери дата"
                      locale="bg-BG"
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => { stopRowEvent(event); void handleSaveDraftField(row, "date"); }}
                      disabled={isDateSaving}
                      className="rounded bg-sky-500/80 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                    >
                      Запази
                    </button>
                    <button
                      type="button"
                      onClick={(event) => { stopRowEvent(event); cancelEditingField(row); }}
                      className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-700/50"
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              ) : readOnly ? (
                <span className={COMPACT_DATE_BADGE} title={dateLabel ?? "—"}>
                  {dateLabel ?? "—"}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(event) => { stopRowEvent(event); startEditingField(row, "date"); }}
                  className={`${COMPACT_DATE_BADGE} cursor-text hover:border-zinc-500/80 hover:bg-zinc-900`}
                  title={dateLabel ?? "Клик за редакция"}
                >
                  {dateLabel ?? "Избери"}
                </button>
              )}
            </div>

            <div className={DRAFT_META_CELL} onClick={stopRowEvent}>
              <p className={mobileLabelClass}>Приоритет</p>
              {isEditingPriority ? (
                <select
                  autoFocus
                  value={draftEdit.priority}
                  onClick={stopRowEvent}
                  onChange={(e) => {
                    stopRowEvent(e);
                    const newPriority = e.target.value;
                    handleDraftPriorityChange(row, newPriority);
                    void handleSaveDraftField(row, "priority", newPriority);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEditingField(row);
                    }
                  }}
                  disabled={isPrioritySaving}
                  className={`${COMPACT_PRIORITY_BADGE} bg-zinc-900 outline-none focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20 disabled:opacity-60`}
                >
                  <option value="">Без приоритет</option>
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : readOnly ? (
                <span className={COMPACT_PRIORITY_BADGE} title={priorityLabel(row.priority)}>
                  {row.priority != null && PRIORITY_VALUES.has(row.priority)
                    ? priorityLabel(row.priority)
                    : "—"}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(event) => { stopRowEvent(event); startEditingField(row, "priority"); }}
                  className={`${COMPACT_PRIORITY_BADGE} cursor-text hover:border-zinc-500/80 hover:bg-zinc-900`}
                  title="Клик за редакция"
                >
                  {row.priority != null && PRIORITY_VALUES.has(row.priority)
                    ? priorityLabel(row.priority)
                    : "Избери"}
                </button>
              )}
            </div>

            <div className={DRAFT_META_CELL} onClick={stopRowEvent}>
              <p className={mobileLabelClass}>Статус</p>
              <select
                value={status}
                onClick={stopRowEvent}
                onChange={(e) => { stopRowEvent(e); handleTaskStatusChange(row.id, e.target.value); }}
                disabled={readOnly}
                className={`${COMPACT_STATUS_SELECT} ${taskStatusClasses(status)} disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {TASK_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900 text-zinc-100">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${DRAFT_META_CELL} flex items-center justify-end gap-0.5`} onClick={stopRowEvent}>
              <button
                type="button"
                onClick={() => setViewRowId(row.id)}
                className={DRAFT_ROW_ICON_BTN}
                title="Преглед на задача"
                aria-label="Преглед на задача"
              >
                <EyeIcon />
              </button>
              {canDeleteDraftRow(row) ? (
                <button
                  type="button"
                  onClick={() => handleRequestDeleteDraftRow(row)}
                  disabled={isDeletingRow}
                  className={`${DRAFT_ROW_ICON_BTN} hover:border-rose-800/50 hover:bg-rose-950/40 hover:text-rose-300`}
                  title="Изтрий задача"
                  aria-label="Изтрий задача"
                >
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {isEditingNotes && (
          <div className="mt-2 min-w-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/90 p-3">
            <textarea
              autoFocus
              rows={3}
              value={draftEdit.notes}
              onChange={(e) => handleDraftFieldChange(row, "notes", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEditingField(row);
                }
              }}
              disabled={isNotesSaving}
              placeholder="Бележка"
              className="w-full min-w-0 resize-y rounded-md border border-zinc-700/70 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 outline-none transition-colors focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/20 disabled:opacity-60"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void handleSaveDraftField(row, "notes")}
                disabled={isNotesSaving}
                className="rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white transition hover:bg-sky-400 disabled:opacity-60"
              >
                Запази
              </button>
              <button
                type="button"
                onClick={(event) => { stopRowEvent(event); cancelEditingField(row); }}
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800/60"
              >
                Отказ
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4 overflow-x-hidden">
      <section className="min-w-0 overflow-x-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 shadow-xl md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-white">Отчет за месец</h1>
            <p className="text-sm text-zinc-400">Привет!👋 ☕ Не забравяй – отчетите не се пишат сами… за съжаление 😄</p>
          </div>

          <div className={`grid w-full gap-3 md:w-auto ${currentRole === "admin" ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <label htmlFor="month" className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
                Месец
              </label>
              <input
                id="month"
                type="month"
                value={monthValue}
                onChange={(event) => setMonthValue(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500 md:min-w-[170px]"
              />
            </div>
            {currentRole === "admin" && employeeSelectOptions.length > 1 && (
              <div className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                <label htmlFor="employee" className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
                  Служител
                </label>
                <CustomSelect
                  id="employee"
                  value={employeeId ?? ""}
                  onChange={(nextEmployeeId) => setEmployeeId(nextEmployeeId || null)}
                  options={employeeSelectOptions}
                  className="w-full min-w-0 max-w-full"
                />
              </div>
            )}
            {(currentRole !== "admin" || employeeSelectOptions.length <= 1) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                <p className="truncate text-sm text-zinc-100">Служител: {selectedEmployeeName}</p>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">Зареждане на отчета...</div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">{errorMessage}</div>
        )}

        {!isLoading && !errorMessage && (showGracePeriodNote || showEmployeeGraceReadOnlyNote) && (
          <div className="mb-3 space-y-2">
            {showGracePeriodNote && (
              <div
                className="rounded-2xl border border-sky-700/70 bg-sky-950/40 px-4 py-3 text-sm text-sky-100"
                role="status"
              >
                Можете да довършите отчета за предходния месец до 5-то число.
              </div>
            )}
            {showEmployeeGraceReadOnlyNote && (
              <div
                className="rounded-2xl border border-amber-700/70 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
                role="status"
              >
                Този месец е заключен за редакция. Можете само да преглеждате отчета.
              </div>
            )}
          </div>
        )}

        {!isLoading && !errorMessage && (
          <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-3">
            <div className="min-w-0 space-y-3 xl:col-span-2">
              <article className="overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="text-base font-semibold text-white">Рекламен бюджет за месеца</h2>
                <p className="mt-1 text-sm text-zinc-500">{monthLabel(monthValue)}</p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="relative overflow-visible flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Клиент</span>
                    <CustomSelect
                      value={spendClientId}
                      onChange={(nextClientId) => {
                        setSpendClientId(nextClientId);
                        setFormValues((prev) => ({ ...prev, clientId: nextClientId }));
                        setAdSpendMessage("");
                      }}
                      options={[{ value: "", label: "Избери клиент" }, ...clientSelectOptions]}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Meta Ads разход</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={monthlyAdSpend.metaAdsSpend}
                      onChange={(event) =>
                        setMonthlyAdSpend((prev) => ({ ...prev, metaAdsSpend: event.target.value }))
                      }
                      disabled={isAdSpendLoading || !spendClientId}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-60"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Google Ads разход</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={monthlyAdSpend.googleAdsSpend}
                      onChange={(event) =>
                        setMonthlyAdSpend((prev) => ({ ...prev, googleAdsSpend: event.target.value }))
                      }
                      disabled={isAdSpendLoading || !spendClientId}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-60"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveMonthlyAdSpend}
                    disabled={isAdSpendSaving || isAdSpendLoading || !spendClientId}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-60"
                  >
                    {isAdSpendSaving ? "Запазване..." : "Запази бюджет"}
                  </button>
                  {adSpendMessage && <p className="text-sm text-zinc-300">{adSpendMessage}</p>}
                </div>
              </article>

              <article className="overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="text-base font-semibold text-white">Добави ред</h2>
                {!monthState.isEditable && (
                  <p className="mt-2 rounded-lg border border-amber-700/70 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
                    Този месец е със статус „{monthStatusLabel(monthState)}“ и не може да се редактира.
                  </p>
                )}
                <form onSubmit={handleAddRow} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <fieldset disabled={!canEditMonth || isSaving} className="contents">
                  <label className="relative overflow-visible flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Клиент</span>
                    <CustomSelect
                      value={formValues.clientId}
                      onChange={(nextClientId) => {
                        setFormValues((prev) => ({ ...prev, clientId: nextClientId }));
                        setSpendClientId(nextClientId);
                        setAdSpendMessage("");
                      }}
                      options={[{ value: "", label: "Избери клиент" }, ...clientSelectOptions]}
                      disabled={!canEditMonth || isSaving}
                    />
                  </label>

                  <label className="relative overflow-visible flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Услуга</span>
                    <CustomSelect
                      value={formValues.serviceId}
                      onChange={(nextServiceId) => setFormValues((prev) => ({ ...prev, serviceId: nextServiceId }))}
                      options={[{ value: "", label: "Избери услуга" }, ...serviceSelectOptions]}
                      disabled={!canEditMonth || isSaving}
                    />
                  </label>

                  <label className="relative overflow-visible flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Задача</span>
                    <input
                      type="text"
                      value={formValues.taskDescription}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, taskDescription: event.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                      placeholder="Опишете конкретната задача"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Часове</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formValues.hours}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, hours: event.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Дата</span>
                    <DatePicker
                      value={formValues.dateValue}
                      onChange={(v) => setFormValues((prev) => ({ ...prev, dateValue: v }))}
                      placeholder="Избери дата"
                      locale="bg-BG"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Приоритет</span>
                    <CustomSelect
                      value={formValues.priority}
                      onChange={(nextPriority) => setFormValues((prev) => ({ ...prev, priority: nextPriority }))}
                      options={prioritySelectOptions}
                      disabled={!canEditMonth || isSaving}
                    />
                  </label>

                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-sm text-zinc-400">Коментар</span>
                    <textarea
                      rows={3}
                      value={formValues.notes}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                      placeholder="Бележка към реда"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isSaving || !canEditMonth}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-60"
                    >
                      Добави ред
                    </button>
                  </div>
                  </fieldset>
                </form>
              </article>

              {successMessage && (
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </div>
              )}

              <article className="min-w-0 overflow-x-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-base font-semibold text-white">Чернова (неизпратено)</h3>
                <p className="mt-1 text-sm text-zinc-500">Текущ месец: {monthLabel(monthValue)}</p>
                <div className="mt-3 flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/95 p-2 sm:flex-row sm:flex-wrap">
                  <label className="relative flex min-w-0 flex-1 flex-col gap-1 overflow-visible sm:min-w-[140px] sm:max-w-[220px]">
                    <span className="text-xs text-zinc-500">Клиент</span>
                    <CustomSelect
                      value={draftClientFilter}
                      onChange={(next) => setDraftClientFilter(next)}
                      options={clientFilterOptions}
                      className="w-full min-w-0 max-w-full"
                      buttonClassName={`${draftFilterSelectClasses} justify-between`}
                    />
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[140px] sm:max-w-[220px]">
                    <span className="text-xs text-zinc-500">Статус</span>
                    <select
                      value={draftStatusFilter}
                      onChange={(event) => setDraftStatusFilter(event.target.value)}
                      className={draftFilterSelectClasses}
                    >
                      {draftStatusFilterOptions.map((option) => (
                        <option key={option.value || "all-statuses"} value={option.value} className="bg-zinc-900 text-zinc-100">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 min-w-0 overflow-x-hidden rounded-xl border border-zinc-800 bg-zinc-950/70 p-2">
                  {filteredDraftRows.length === 0 && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                      {draftRows.length === 0
                        ? "Няма чернови за този месец."
                        : "Няма редове за избраните филтри."}
                    </div>
                  )}
                  {filteredDraftRows.length > 0 && (
                    <div className="space-y-2">
                      <div
                        className={`rounded-md border border-zinc-800 bg-zinc-900/95 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 ${DRAFT_LIST_HEADER_CLASS}`}
                      >
                        <span>Клиент</span>
                        <span>Услуга</span>
                        <span>Задача</span>
                        <span>Часове</span>
                        <span>Дата</span>
                        <span>Приоритет</span>
                        <span>Статус</span>
                        <span className="text-right">Действия</span>
                      </div>
                      <div className="space-y-2">
                        {filteredDraftRows.map((row) => renderDraftCompactRow(row))}
                      </div>
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-base font-semibold text-white">Изпратено (само за преглед)</h3>
                <div className="mt-3 space-y-3">
                  {sentRows.length === 0 && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                      Няма изпратени редове за този месец.
                    </div>
                  )}
                  {sentRows.map((row) => renderRowCard(row, true))}
                </div>
              </article>
            </div>

            <aside className="min-w-0 space-y-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Обобщение</h2>

                {/* Section 1: Tasks this month */}
                <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                        Задачи този месец
                      </p>
                      <p className="text-[11px] text-zinc-500">{monthLabel(monthValue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">Общо</p>
                      <p className="text-xl font-semibold text-white">{taskStatusSummary.total}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {TASK_STATUS_OPTIONS.map((option) => {
                      const count = taskStatusSummary[option.value as "waiting" | "started" | "in_progress" | "done"];
                      const dotClasses =
                        option.value === "waiting"
                          ? "border-zinc-400 bg-zinc-500/70"
                          : option.value === "started"
                          ? "border-sky-400 bg-sky-500/70"
                          : option.value === "in_progress"
                          ? "border-amber-400 bg-amber-500/70"
                          : "border-emerald-400 bg-emerald-500/70";

                      return (
                        <div
                          key={option.value}
                          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <span className={`h-2.5 w-2.5 rounded-full border ${dotClasses}`} />
                            {option.label}
                          </span>
                          <span className="text-sm font-semibold text-zinc-100">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: By client */}
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">По клиент</p>
                    <p className="text-[11px] text-zinc-500">
                      {tasksByClient.length}{" "}
                      {tasksByClient.length === 1 ? "клиент" : "клиента"}
                    </p>
                  </div>

                  {tasksByClient.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">Няма задачи за този месец.</p>
                  ) : (
                    <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                      {tasksByClient.map((item) => (
                        <li
                          key={item.clientId}
                          className="flex items-center justify-between gap-2 rounded-lg bg-zinc-900/70 px-2 py-1.5"
                        >
                          <span className="truncate text-xs text-zinc-300">{item.clientName}</span>
                          <span className="ml-2 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-100">
                            {item.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Статус:</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${monthStatusBadgeClasses(monthState)}`}>
                      {monthStatusLabel(monthState)}
                    </span>
                  </div>
                  {currentRole === "admin" && (monthState.isSubmitted || monthState.isLocked) && (
                    <button
                      type="button"
                      onClick={() => void handleAdminUnlockMonth()}
                      disabled={isSaving}
                      className="rounded-lg border border-amber-600/70 bg-amber-950/40 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-900/40 disabled:opacity-60"
                    >
                      Отключи месеца
                    </button>
                  )}
                </div>
                {currentRole === "admin" && (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Подаден: {monthState.submittedAt ?? "—"} · Заключен: {monthState.lockedAt ?? "—"}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmitWithUnfinishedCheck}
                disabled={isSaving || draftRows.length === 0 || !canEditMonth}
                className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                Изпрати и заключи месеца
              </button>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <PersonalTasksModule mode="embedded" />
              </div>
            </aside>
          </div>
        )}
      </section>


      <WorkReportItemDetailModal
        isOpen={viewRowId != null && viewRowDetail != null}
        onClose={() => setViewRowId(null)}
        item={viewRowDetail}
        canEdit={viewRowCanEdit}
        clientOptions={clientSelectOptions}
        serviceOptions={serviceSelectOptions}
        priorityOptions={prioritySelectOptions}
        statusOptions={taskStatusSelectOptions}
        statusClassNameFor={taskStatusClasses}
        onSave={handleSaveModalItem}
      />

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}

      {deleteConfirmRowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
<div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Изтриване на задача</h2>
            <p className="mt-3 text-sm text-zinc-300">Сигурни ли сте, че искате да изтриете тази задача?</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmRowId(null)}
                disabled={isDeletingRow}
                className="inline-flex justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteDraftRow()}
                disabled={isDeletingRow}
                className="inline-flex justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeletingRow ? "Изтриване..." : "Изтрий"}
              </button>
            </div>
          </div>
        </div>
      )}

            {showUnfinishedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Има незавършени задачи</h2>
            <p className="mt-3 text-sm text-zinc-300">
              Имате {unfinishedDraftCount}{" "}
              {unfinishedDraftCount === 1 ? "задача, която не е със статус „приключена“." : "задачи, които не са със статус „приключена“."}
              {" "}Сигурни ли сте, че искате да изпратите и заключите месеца?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowUnfinishedConfirm(false)}
                className="inline-flex justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
              >
                Върни се
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitMonth}
                className="inline-flex justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                Все пак изпрати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
