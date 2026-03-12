"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { supabase } from "@/lib/supabaseClient";

type LookupItem = { id: string; name: string };

type WorkItem = {
  id: string;
  clientId: string | null;
  serviceId: string | null;
  taskId: string | null;
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

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function parseHours(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(row: Record<string, unknown>): "draft" | "sent" {
  const statusText = String(row.status ?? row.task_status ?? row.report_status ?? "").toLowerCase();
  if (["sent", "submitted", "locked", "final"].includes(statusText)) return "sent";
  if (Boolean(row.is_submitted) || Boolean(row.submitted) || Boolean(row.is_locked) || Boolean(row.locked)) return "sent";
  return "draft";
}

function monthMatchesRow(row: Record<string, unknown>, monthValue: string) {
  const { startIso, endIso, year, month } = monthBounds(monthValue);

  const dateKeys = ["report_month", "month_start", "report_date", "created_at"];
  for (const key of dateKeys) {
    const value = row[key];
    if (typeof value === "string" && value.length >= 10) {
      const dateValue = value.slice(0, 10);
      if (dateValue >= startIso && dateValue <= endIso) return true;
    }
  }

  const rowYear = Number(row.report_year ?? row.year);
  const rowMonth = Number(row.report_month_number ?? row.month);
  if (Number.isFinite(rowYear) && Number.isFinite(rowMonth)) {
    return rowYear === year && rowMonth === month;
  }

  return false;
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

export default function WorkReportsPage() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [monthlyReportId, setMonthlyReportId] = useState<string | null>(null);
  const [rows, setRows] = useState<WorkItem[]>([]);
  const [clients, setClients] = useState<LookupItem[]>([]);
  const [services, setServices] = useState<LookupItem[]>([]);
  const [tasks, setTasks] = useState<LookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [monthValue, setMonthValue] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  });
  const [formValues, setFormValues] = useState({
    clientId: "",
    serviceId: "",
    taskId: "",
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

  const validTaskStatus = (s: string) =>
    TASK_STATUS_OPTIONS.some((o) => o.value === s) ? s : "waiting";

  useEffect(() => {
    const loadLookupsAndEmployee = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const [employeeResult, clientsResult, servicesResult, tasksResult] = await Promise.all([
        supabase.from("employees").select("id").limit(1),
        supabase.from("clients").select("id, name").order("name", { ascending: true }),
        supabase.from("services").select("id, name").order("name", { ascending: true }),
        supabase.from("tasks").select("id, name").order("name", { ascending: true }),
      ]);

      if (employeeResult.error || clientsResult.error || servicesResult.error || tasksResult.error) {
        setErrorMessage("Не успяхме да заредим началните данни.");
        setIsLoading(false);
        return;
      }

      const employee = (employeeResult.data ?? [])[0];
      setEmployeeId(employee?.id ? String(employee.id) : null);
      setClients((clientsResult.data ?? []).map((x) => ({ id: String(x.id), name: String(x.name) })));
      setServices((servicesResult.data ?? []).map((x) => ({ id: String(x.id), name: String(x.name) })));
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

      const monthlyReportsResult = await supabase.from("monthly_reports").select("*");
      if (monthlyReportsResult.error) {
        setErrorMessage("Не успяхме да заредим monthly_reports.");
        setIsLoading(false);
        return;
      }

      const allMonthlyReports = (monthlyReportsResult.data ?? []) as Record<string, unknown>[];
      let monthlyReport =
        allMonthlyReports.find((row) => String(row.employee_id ?? "") === employeeId && monthMatchesRow(row, monthValue)) ?? null;

      if (!monthlyReport) {
        const { year, month } = monthBounds(monthValue);
        const insertPayload = { employee_id: employeeId, report_month: month, report_year: year, status: "draft" };
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
        hours: parseHours(row.hours),
        notes: typeof row.notes === "string" ? row.notes : "",
        taskStatus: String(row.task_status ?? row.status ?? "draft"),
        status: normalizeStatus(row),
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

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item.name])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((item) => [item.id, item.name])), [services]);
  const taskById = useMemo(() => new Map(tasks.map((item) => [item.id, item.name])), [tasks]);

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
      hours: parseHours(row.hours),
      notes: typeof row.notes === "string" ? row.notes : "",
      taskStatus: String(row.task_status ?? row.status ?? "waiting"),
      status: normalizeStatus(row),
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
    const edit = draftEditForRow(row);
    const saveKey = `${row.id}:${field}`;
    setErrorMessage("");
    setSuccessMessage("");
    setSavingInlineFields((prev) => ({ ...prev, [saveKey]: true }));

    const payload: Record<string, string | number | null> = {};
    if (field === "hours") {
      const parsedHours = Number(edit.hours);
      if (!Number.isFinite(parsedHours) || parsedHours < 0) {
        setErrorMessage("Невалидни часове. Въведете число >= 0.");
        setSavingInlineFields((prev) => ({ ...prev, [saveKey]: false }));
        return;
      }
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

    setErrorMessage("");
    setSuccessMessage("");

    if (!formValues.clientId || !formValues.serviceId || !formValues.taskId || !formValues.hours) {
      setErrorMessage("Моля, попълнете клиент, услуга, задача и часове.");
      return;
    }

    setIsSaving(true);
    const hoursValue = Number(formValues.hours);
    const start = formValues.dateValue.start.trim() || null;
    const end = formValues.dateValue.end.trim() || null;
    const startDate = start;
    const endDate = end && end !== start ? end : null;
    const payload = {
      monthly_report_id: monthlyReportId,
      client_id: formValues.clientId,
      service_id: formValues.serviceId,
      task_id: formValues.taskId,
      hours: Number.isFinite(hoursValue) ? hoursValue : 0,
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
      taskId: "",
      hours: "",
      notes: "",
      dateValue: { start: "", end: "" },
      priority: "normal",
    });
    setSuccessMessage("Редът е добавен успешно.");
    await reloadItems();
    setIsSaving(false);
  };

  const handleSendAndLock = async () => {
    if (!monthlyReportId || draftRows.length === 0) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    for (const row of draftRows) {
      const payload: Record<string, unknown> = {};
      const keys = new Set(Object.keys(row.raw));

      if (keys.has("status")) payload.status = "sent";
      if (keys.has("task_status")) payload.task_status = "sent";
      if (keys.has("report_status")) payload.report_status = "sent";
      if (keys.has("is_submitted")) payload.is_submitted = true;
      if (keys.has("submitted")) payload.submitted = true;
      if (keys.has("is_locked")) payload.is_locked = true;
      if (keys.has("locked")) payload.locked = true;

      if (Object.keys(payload).length === 0) {
        payload.status = "sent";
      }

      const updateResult = await supabase.from("work_report_items").update(payload).eq("id", row.id);
      if (updateResult.error) {
        setErrorMessage("Не успяхме да изпратим редовете за месеца.");
        setIsSaving(false);
        return;
      }
    }

    const reportPayloadVariants: Record<string, unknown>[] = [
      { status: "sent", is_locked: true, locked: true, is_submitted: true, submitted: true },
      { report_status: "sent", is_locked: true, locked: true },
      { status: "sent" },
    ];

    for (const payload of reportPayloadVariants) {
      const result = await supabase.from("monthly_reports").update(payload).eq("id", monthlyReportId);
      if (!result.error) break;
    }

    setSuccessMessage("Месецът е изпратен и заключен.");
    await reloadItems();
    setIsSaving(false);
  };

  const renderRowCard = (row: WorkItem, readOnly: boolean) => {
    const clientName = row.clientId ? clientById.get(row.clientId) ?? "-" : "-";
    const serviceName = row.serviceId ? serviceById.get(row.serviceId) ?? "-" : "-";
    const taskName = row.taskId ? taskById.get(row.taskId) ?? "-" : "-";
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
        className={`rounded-2xl border p-5 ${taskStatusRowClasses(status)}`}
      >
        {/* Row 1: Primary content — Client, Service, Task (wrap naturally, never truncate) */}
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-zinc-300">
          <div className="min-w-0 flex-1 basis-0">
            <p className={labelClass}>Клиент</p>
            <p className="mt-0.5 text-sm font-medium leading-relaxed text-zinc-100 break-words">{clientName}</p>
          </div>
          <div className="min-w-0 flex-1 basis-0">
            <p className={labelClass}>Услуга</p>
            <p className="mt-0.5 text-sm font-medium leading-relaxed text-zinc-100 break-words">{serviceName}</p>
          </div>
          <div className="min-w-0 flex-1 basis-0">
            <p className={labelClass}>Задача</p>
            <p className="mt-0.5 text-sm font-medium leading-relaxed text-zinc-100 break-words">{taskName}</p>
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
                type="number"
                min="0"
                step="0.25"
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
                className={`rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-900 ${taskStatusClasses(validTaskStatus(row.taskStatus))}`}
              >
                {TASK_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {readOnly && (
            <span className="rounded-full border border-emerald-700/60 bg-emerald-900/30 px-2.5 py-1 text-xs text-emerald-300">
              read-only
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 shadow-xl md:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Отчет за месец</h1>
            <p className="text-sm text-zinc-400">Привет!👋 ☕ Не забравяй – отчетите не се пишат сами… за съжаление 😄</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <label htmlFor="month" className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
              Месец
            </label>
            <input
              id="month"
              type="month"
              value={monthValue}
              onChange={(event) => setMonthValue(event.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">Loading report...</div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">{errorMessage}</div>
        )}

        {!isLoading && !errorMessage && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="text-base font-semibold text-white">Добави ред</h2>
                <form onSubmit={handleAddRow} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Клиент</span>
                    <select
                      value={formValues.clientId}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, clientId: event.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                      required
                    >
                      <option value="">Избери клиент</option>
                      {clients.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Услуга</span>
                    <select
                      value={formValues.serviceId}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, serviceId: event.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                      required
                    >
                      <option value="">Избери услуга</option>
                      {services.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Задача</span>
                    <select
                      value={formValues.taskId}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, taskId: event.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                      required
                    >
                      <option value="">Избери задача</option>
                      {tasks.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-400">Часове</span>
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
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
                    <select
                      value={formValues.priority}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, priority: event.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                    >
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
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
                      disabled={isSaving}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-60"
                    >
                      Добави ред
                    </button>
                  </div>
                </form>
              </article>

              {successMessage && (
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </div>
              )}

              <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-base font-semibold text-white">Чернова (неизпратено)</h3>
                <p className="mt-1 text-sm text-zinc-500">Текущ месец: {monthLabel(monthValue)}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">Клиент</span>
                    <select
                      value={draftClientFilter}
                      onChange={(e) => setDraftClientFilter(e.target.value)}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                    >
                      <option value="">Всички клиенти</option>
                      {clients.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">Статус</span>
                    <select
                      value={draftStatusFilter}
                      onChange={(e) => setDraftStatusFilter(e.target.value)}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                    >
                      <option value="">Всички статуси</option>
                      {TASK_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 space-y-3">
                  {filteredDraftRows.length === 0 && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                      {draftRows.length === 0
                        ? "Няма чернови за този месец."
                        : "Няма редове за избраните филтри."}
                    </div>
                  )}
                  {filteredDraftRows.map((row) => renderRowCard(row, false))}
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-base font-semibold text-white">Изпратено (read-only)</h3>
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

            <aside className="space-y-4">
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

              <button
                type="button"
                onClick={handleSendAndLock}
                disabled={isSaving || draftRows.length === 0}
                className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                Изпрати и заключи месеца
              </button>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
