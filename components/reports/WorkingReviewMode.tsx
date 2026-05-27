"use client";

import { useMemo, useState } from "react";

type LookupItem = {
  id: string;
  name: string;
};

export type WorkingReviewItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  clientId: string | null;
  serviceId: string | null;
  taskId: string | null;
  taskDescription: string | null;
  notes: string;
  hours: number;
  activityDate: string | null;
  monthReviewStatus: "draft" | "submitted" | "locked";
};

type WorkingReviewModeProps = {
  items: WorkingReviewItem[];
  employees: LookupItem[];
  clients: LookupItem[];
  services: LookupItem[];
  tasks: LookupItem[];
  canViewCompensation: boolean;
  employeeHourlyCostById: Map<string, number | null>;
};

type SortKey =
  | "employee"
  | "client"
  | "service"
  | "task"
  | "hours"
  | "date"
  | "status";

const STATUS_OPTIONS: Array<{ value: "" | "draft" | "submitted" | "locked"; label: string }> = [
  { value: "", label: "Всички" },
  { value: "draft", label: "Чернова" },
  { value: "submitted", label: "Изпратен" },
  { value: "locked", label: "Заключен" },
];

function formatHours(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? `${value} €` : `${value.toFixed(2)} €`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("bg-BG");
}

function statusLabel(value: WorkingReviewItem["monthReviewStatus"]): string {
  if (value === "draft") return "Чернова";
  if (value === "locked") return "Заключен";
  return "Изпратен";
}

function normalizeTaskKey(taskText: string): string {
  return taskText
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveEmployeeName(lookupName: string | undefined, rowEmployeeName: string | null | undefined): string {
  const fromLookup = (lookupName ?? "").trim();
  if (fromLookup.length > 0 && fromLookup !== "Без име") return fromLookup;
  const fromRow = (rowEmployeeName ?? "").trim();
  if (fromRow.length > 0) return fromRow;
  return "Неразпознат служител";
}

export function WorkingReviewMode({
  items,
  employees,
  clients,
  services,
  tasks,
  canViewCompensation,
  employeeHourlyCostById,
}: WorkingReviewModeProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"" | "draft" | "submitted" | "locked">("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const employeesById = useMemo(() => new Map(employees.map((item) => [item.id, item.name])), [employees]);
  const clientsById = useMemo(() => new Map(clients.map((item) => [item.id, item.name])), [clients]);
  const servicesById = useMemo(() => new Map(services.map((item) => [item.id, item.name])), [services]);
  const tasksById = useMemo(() => new Map(tasks.map((item) => [item.id, item.name])), [tasks]);

  const rows = useMemo(() => {
    const base = items.filter((item) => {
      if (selectedEmployeeId && item.employeeId !== selectedEmployeeId) return false;
      if (selectedClientId && item.clientId !== selectedClientId) return false;
      if (selectedServiceId && item.serviceId !== selectedServiceId) return false;
      if (selectedStatus && item.monthReviewStatus !== selectedStatus) return false;
      return true;
    });

    const getTaskText = (item: WorkingReviewItem) => {
      const fromDescription = item.taskDescription?.trim();
      if (fromDescription) return fromDescription;
      if (item.taskId) return tasksById.get(item.taskId) ?? "Без задача";
      return "Без задача";
    };

    const compareText = (left: string, right: string) => left.localeCompare(right, "bg-BG");

    const sorted = [...base].sort((a, b) => {
      const employeeNameA = resolveEmployeeName(employeesById.get(a.employeeId), a.employeeName);
      const employeeNameB = resolveEmployeeName(employeesById.get(b.employeeId), b.employeeName);
      const clientNameA = a.clientId ? clientsById.get(a.clientId) ?? "Неизвестен клиент" : "Без клиент";
      const clientNameB = b.clientId ? clientsById.get(b.clientId) ?? "Неизвестен клиент" : "Без клиент";
      const serviceNameA = a.serviceId ? servicesById.get(a.serviceId) ?? "Неизвестна услуга" : "Без услуга";
      const serviceNameB = b.serviceId ? servicesById.get(b.serviceId) ?? "Неизвестна услуга" : "Без услуга";
      const taskA = getTaskText(a);
      const taskB = getTaskText(b);
      const dateA = a.activityDate ?? "";
      const dateB = b.activityDate ?? "";

      let comparison = 0;
      if (sortKey === "employee") comparison = compareText(employeeNameA, employeeNameB);
      if (sortKey === "client") comparison = compareText(clientNameA, clientNameB);
      if (sortKey === "service") comparison = compareText(serviceNameA, serviceNameB);
      if (sortKey === "task") comparison = compareText(taskA, taskB);
      if (sortKey === "hours") comparison = a.hours - b.hours;
      if (sortKey === "date") comparison = compareText(dateA, dateB);
      if (sortKey === "status") comparison = compareText(statusLabel(a.monthReviewStatus), statusLabel(b.monthReviewStatus));

      if (comparison === 0) {
        comparison = compareText(employeeNameA, employeeNameB);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted.map((item) => {
      const employeeName = resolveEmployeeName(employeesById.get(item.employeeId), item.employeeName);
      const clientName = item.clientId ? clientsById.get(item.clientId) ?? "Неизвестен клиент" : "Без клиент";
      const serviceName = item.serviceId ? servicesById.get(item.serviceId) ?? "Неизвестна услуга" : "Без услуга";
      const taskText = item.taskDescription?.trim() || (item.taskId ? tasksById.get(item.taskId) ?? "Без задача" : "Без задача");
      const hourlyCost = employeeHourlyCostById.get(item.employeeId) ?? null;
      const totalValue = hourlyCost != null ? hourlyCost * item.hours : null;

      return {
        ...item,
        employeeName,
        clientName,
        serviceName,
        taskText,
        hourlyCost,
        totalValue,
      };
    });
  }, [
    items,
    selectedEmployeeId,
    selectedClientId,
    selectedServiceId,
    selectedStatus,
    sortKey,
    sortDirection,
    tasksById,
    employeesById,
    clientsById,
    servicesById,
    employeeHourlyCostById,
  ]);

  const metrics = useMemo(() => {
    const uniqueEmployees = new Set(rows.map((row) => row.employeeId));
    const uniqueClients = new Set(rows.map((row) => row.clientId ?? "none"));
    const totalHours = rows.reduce((acc, row) => acc + row.hours, 0);
    const taskCount = rows.length;
    let totalValue: number | null = null;
    if (canViewCompensation) {
      for (const row of rows) {
        if (row.totalValue != null && Number.isFinite(row.totalValue)) {
          totalValue = (totalValue ?? 0) + row.totalValue;
        }
      }
    }

    return {
      totalHours,
      totalValue,
      taskCount,
      employeesCount: uniqueEmployees.size,
      clientsCount: uniqueClients.size,
    };
  }, [rows, canViewCompensation]);

  const clientSummaries = useMemo(() => {
    const summary = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        hours: number;
        value: number | null;
        tasks: number;
        employeeIds: Set<string>;
      }
    >();

    for (const row of rows) {
      const clientId = row.clientId ?? "none";
      const existing = summary.get(clientId) ?? {
        clientId,
        clientName: row.clientName,
        hours: 0,
        value: null,
        tasks: 0,
        employeeIds: new Set<string>(),
      };

      existing.hours += row.hours;
      existing.tasks += 1;
      existing.employeeIds.add(row.employeeId);
      if (row.totalValue != null) {
        existing.value = (existing.value ?? 0) + row.totalValue;
      }
      summary.set(clientId, existing);
    }

    return Array.from(summary.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, "bg-BG"));
  }, [rows, canViewCompensation]);

  const clientExpandedRows = useMemo(() => {
    if (!expandedClientId) return [];
    const targetClientId = expandedClientId === "none" ? null : expandedClientId;

    const grouped = new Map<string, { employeeName: string; hours: number; tasks: number }>();
    for (const row of rows) {
      if (row.clientId !== targetClientId) continue;
      const existing = grouped.get(row.employeeId) ?? {
        employeeName: row.employeeName,
        hours: 0,
        tasks: 0,
      };
      existing.hours += row.hours;
      existing.tasks += 1;
      grouped.set(row.employeeId, existing);
    }

    return Array.from(grouped.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName, "bg-BG"));
  }, [rows, expandedClientId]);

  const warnings = useMemo(() => {
    const result: string[] = [];
    const taskGroups = new Map<string, Array<(typeof rows)[number]>>();

    for (const row of rows) {
      const taskKey = normalizeTaskKey(row.taskText);
      if (!taskKey || taskKey === "без задача") continue;
      const existing = taskGroups.get(taskKey) ?? [];
      existing.push(row);
      taskGroups.set(taskKey, existing);
    }

    const missingDescriptionRows = rows.filter((row) => {
      const taskRaw = row.taskDescription?.trim() ?? "";
      return taskRaw.length === 0 && !row.taskId;
    });
    if (missingDescriptionRows.length > 0) {
      const names = Array.from(new Set(missingDescriptionRows.map((row) => row.employeeName))).slice(0, 3);
      result.push(`Задачи без описание: ${missingDescriptionRows.length} (напр. ${names.join(", ")}).`);
    }

    const heavyHoursRows = rows.filter((row) => row.hours >= 12);
    if (heavyHoursRows.length > 0) {
      const sample = heavyHoursRows[0];
      result.push(`Задачи с прекалено много часове: ${heavyHoursRows.length} (напр. "${sample.taskText}" - ${formatHours(sample.hours)} ч).`);
    }

    const shortTextHeavyRows = rows.filter((row) => {
      const normalized = normalizeTaskKey(row.taskText);
      return normalized.length > 0 && normalized.length <= 8 && row.hours >= 6;
    });
    if (shortTextHeavyRows.length > 0) {
      const sample = shortTextHeavyRows[0];
      result.push(`Кратко описание с много часове: "${sample.taskText}" - ${formatHours(sample.hours)} ч.`);
    }

    for (const [taskKey, group] of taskGroups.entries()) {
      if (group.length >= 5) {
        result.push(`Много повторения на задача "${taskKey}": ${group.length} записа.`);
      }
      if (group.length >= 2) {
        const hours = group.map((entry) => entry.hours);
        const minHours = Math.min(...hours);
        const maxHours = Math.max(...hours);
        if (maxHours >= minHours * 2 && maxHours - minHours >= 3) {
          result.push(
            `Сходна задача "${taskKey}" с голяма разлика в часове: от ${formatHours(minHours)} ч до ${formatHours(maxHours)} ч.`
          );
        }
      }
      if (result.length >= 10) break;
    }

    return result.slice(0, 10);
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const showFocusHint = !selectedClientId && !selectedEmployeeId && rows.length >= 40;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
        Няма работни записи за избрания месец.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <h2 className="text-sm font-semibold text-white">Филтри за работен преглед</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs text-zinc-400">
            Служител
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            >
              <option value="">Всички</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-zinc-400">
            Клиент
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            >
              <option value="">Всички</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-zinc-400">
            Услуга
            <select
              value={selectedServiceId}
              onChange={(event) => setSelectedServiceId(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            >
              <option value="">Всички</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-zinc-400">
            Статус
            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as "" | "draft" | "submitted" | "locked")
              }
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Общо часове</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{formatHours(metrics.totalHours)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Обща стойност</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">
            {canViewCompensation ? formatCurrency(metrics.totalValue) : "Няма достъп"}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Брой задачи</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{metrics.taskCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Брой служители</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{metrics.employeesCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Брой клиенти</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{metrics.clientsCount}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <h2 className="text-sm font-semibold text-white">Обобщение по клиенти</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950/90 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Клиент</th>
                <th className="px-3 py-2 font-medium text-right">Часове</th>
                <th className="px-3 py-2 font-medium text-right">Стойност</th>
                <th className="px-3 py-2 font-medium text-right">Задачи</th>
                <th className="px-3 py-2 font-medium text-right">Служители</th>
                <th className="px-3 py-2 font-medium text-right">Детайли</th>
              </tr>
            </thead>
            <tbody>
              {clientSummaries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-center text-zinc-400">
                    Няма агрегирани клиентски данни.
                  </td>
                </tr>
              )}
              {clientSummaries.map((row) => {
                const isExpanded = expandedClientId === row.clientId;
                return (
                  <tr key={row.clientId} className="border-b border-zinc-900 last:border-b-0">
                    <td className="px-3 py-2 text-zinc-100">{row.clientName}</td>
                    <td className="px-3 py-2 text-right text-zinc-100">{formatHours(row.hours)}</td>
                    <td className="px-3 py-2 text-right text-zinc-100">
                      {canViewCompensation ? formatCurrency(row.value) : "Няма достъп"}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-100">{row.tasks}</td>
                    <td className="px-3 py-2 text-right text-zinc-100">{row.employeeIds.size}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedClientId(isExpanded ? null : row.clientId)}
                        className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white"
                      >
                        {isExpanded ? "Скрий" : "Покажи"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {expandedClientId && (
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <h3 className="text-xs uppercase tracking-wide text-zinc-500">Разпределение по служители</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Служител</th>
                    <th className="px-2 py-1.5 font-medium text-right">Часове</th>
                    <th className="px-2 py-1.5 font-medium text-right">Задачи</th>
                  </tr>
                </thead>
                <tbody>
                  {clientExpandedRows.map((row) => (
                    <tr key={row.employeeName} className="border-b border-zinc-900 last:border-b-0">
                      <td className="px-2 py-1.5 text-zinc-100">{row.employeeName}</td>
                      <td className="px-2 py-1.5 text-right text-zinc-100">{formatHours(row.hours)}</td>
                      <td className="px-2 py-1.5 text-right text-zinc-100">{row.tasks}</td>
                    </tr>
                  ))}
                  {clientExpandedRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-2 text-center text-zinc-400">
                        Няма детайлни редове за този клиент.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Детайлен работен преглед</h2>
          <span className="text-xs text-zinc-500">Показани редове: {rows.length}</span>
        </div>
        {showFocusHint && (
          <p className="mt-2 text-xs text-zinc-400">
            Изберете клиент или служител, за да видите по-фокусиран преглед.
          </p>
        )}
        <div className="mt-3 max-h-[480px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/80">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("employee")} className="font-medium hover:text-zinc-300">
                    Служител{sortIndicator("employee")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("client")} className="font-medium hover:text-zinc-300">
                    Клиент{sortIndicator("client")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("service")} className="font-medium hover:text-zinc-300">
                    Услуга{sortIndicator("service")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("task")} className="font-medium hover:text-zinc-300">
                    Задача{sortIndicator("task")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button type="button" onClick={() => toggleSort("hours")} className="font-medium hover:text-zinc-300">
                    Часове{sortIndicator("hours")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button type="button" onClick={() => toggleSort("date")} className="font-medium hover:text-zinc-300">
                    Дата{sortIndicator("date")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button type="button" onClick={() => toggleSort("status")} className="font-medium hover:text-zinc-300">
                    Статус{sortIndicator("status")}
                  </button>
                </th>
                <th className="px-3 py-2">Коментар</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-3 text-center text-zinc-400">
                    Няма записи за избраните филтри.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-900 last:border-b-0">
                  <td className="px-3 py-2 text-zinc-100">{row.employeeName}</td>
                  <td className="px-3 py-2 text-zinc-100">{row.clientName}</td>
                  <td className="px-3 py-2 text-zinc-100">{row.serviceName}</td>
                  <td className="px-3 py-2 text-zinc-100">{row.taskText}</td>
                  <td className="px-3 py-2 text-right text-zinc-100">{formatHours(row.hours)}</td>
                  <td className="px-3 py-2 text-right text-zinc-100">{formatDate(row.activityDate)}</td>
                  <td className="px-3 py-2 text-right text-zinc-100">{statusLabel(row.monthReviewStatus)}</td>
                  <td className="max-w-xs px-3 py-2 text-zinc-300">{row.notes?.trim() || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-4">
        <h2 className="text-sm font-semibold text-amber-200">⚠️ За проверка</h2>
        <ul className="mt-2 space-y-1 text-sm text-amber-100">
          {warnings.length === 0 && <li>Няма открити предупреждения по текущите данни.</li>}
          {warnings.map((warning) => (
            <li key={warning}>- {warning}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
