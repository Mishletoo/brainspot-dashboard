export type ReportsPdfMode = "official" | "working";

export type ReportsPdfExportOptions = {
  showEmployees: boolean;
  showCost: boolean;
};

export type ReportsPdfSourceRow = {
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
};

export type ReportsPdfEmployeeSummary = {
  employeeName: string;
  hours: number;
  tasks: number;
  participationPercent: number;
  totalCost: number | null;
};

export type ReportsPdfTaskRow = {
  date: string;
  service: string;
  task: string;
  description: string;
  hours: number;
  employeeName: string | null;
  hourlyRate: number | null;
  totalCost: number | null;
};

export type ReportsPdfServiceBreakdownRow = {
  service: string;
  hours: number;
  tasks: number;
  participationPercent: number;
  totalCost: number | null;
};

export type ReportsPdfData = {
  mode: ReportsPdfMode;
  modeLabel: string;
  clientLabel: string;
  monthLabel: string;
  totalHours: number;
  tasksCount: number;
  services: string[];
  employeesInvolved: string[];
  totalCost: number | null;
  summaryServices: string[];
  activitiesSummary: string[];
  serviceBreakdown: ReportsPdfServiceBreakdownRow[];
  employeeBreakdown: ReportsPdfEmployeeSummary[];
  taskRows: ReportsPdfTaskRow[];
};

type BuildReportsPdfDataParams = {
  mode: ReportsPdfMode;
  monthLabel: string;
  clientLabel: string;
  rows: ReportsPdfSourceRow[];
  servicesById: Map<string, string>;
  tasksById: Map<string, string>;
  hourlyRateByEmployeeId: Map<string, number | null>;
  generatedAt: Date;
  showCost: boolean;
  showEmployees: boolean;
};

function toDisplayDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("bg-BG");
}

function normalizeTaskDescription(row: ReportsPdfSourceRow, tasksById: Map<string, string>): string {
  const taskDescription = row.taskDescription?.trim();
  if (taskDescription) return taskDescription;
  if (row.taskId) return tasksById.get(row.taskId) ?? "Без задача";
  return "Без задача";
}

function toPercent(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return (value / total) * 100;
}

function shortenActivity(value: string): string {
  let text = (value ?? "").trim();
  if (!text) return "";

  // Спираме на първото изречение/точка/нова линия — bullet-овете трябва да са кратки.
  const splitIdx = text.search(/[.;\n]/);
  if (splitIdx > 6 && splitIdx < 70) {
    text = text.slice(0, splitIdx).trim();
  }

  // Ако пак е твърде дълъг — режем до 55 знака на най-близкия space.
  if (text.length > 55) {
    const slice = text.slice(0, 55);
    const lastSpace = slice.lastIndexOf(" ");
    text = (lastSpace > 20 ? slice.slice(0, lastSpace) : slice).trim() + "…";
  }

  if (!text) return "";
  return text.charAt(0).toLocaleUpperCase("bg-BG") + text.slice(1);
}

function normalizeActivityKey(value: string): string {
  return value
    .toLocaleLowerCase("bg-BG")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildActivityBullets(taskRows: ReportsPdfTaskRow[]): string[] {
  const byKey = new Map<string, string>();

  for (const row of taskRows) {
    const raw = (row.task ?? "").trim();
    if (!raw) continue;
    if (raw === "—" || raw === "Без задача" || raw === "Без описание") continue;

    const short = shortenActivity(raw);
    if (!short || short.length < 4) continue;

    const key = normalizeActivityKey(short);
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, short);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => a.localeCompare(b, "bg-BG"))
    .slice(0, 8);
}

export function buildReportsPdfData({
  mode,
  monthLabel,
  clientLabel,
  rows,
  servicesById,
  tasksById,
  hourlyRateByEmployeeId,
  showCost,
  showEmployees,
}: BuildReportsPdfDataParams): ReportsPdfData {
  const modeLabel = mode === "official" ? "Официален отчет" : "Вътрешен работен преглед / Чернова";
  const sortedRows = [...rows].sort((a, b) => {
    const dateCmp = (a.activityDate ?? "").localeCompare(b.activityDate ?? "", "bg-BG");
    if (dateCmp !== 0) return dateCmp;
    return a.employeeName.localeCompare(b.employeeName, "bg-BG");
  });

  type RawEmployeeSummary = {
    employeeName: string;
    hours: number;
    tasks: number;
    totalCost: number | null;
  };

  const employeeSummaryMap = new Map<string, RawEmployeeSummary>();
  const serviceSummaryMap = new Map<
    string,
    { service: string; hours: number; tasks: number; totalCost: number | null }
  >();
  const serviceSet = new Set<string>();
  const employeeSet = new Set<string>();
  const taskRows: ReportsPdfTaskRow[] = [];

  let totalHours = 0;
  let totalCost = 0;
  let hasAtLeastOneCost = false;

  for (const row of sortedRows) {
    const serviceName = row.serviceId ? servicesById.get(row.serviceId) ?? "Без услуга" : "Без услуга";
    const taskText = normalizeTaskDescription(row, tasksById);
    const employeeName = row.employeeName.trim() || "Неразпознат служител";
    const hourlyRate = hourlyRateByEmployeeId.get(row.employeeId) ?? null;
    const rowCost = showCost && hourlyRate != null ? row.hours * hourlyRate : null;

    totalHours += row.hours;
    if (showCost && rowCost != null && Number.isFinite(rowCost)) {
      totalCost += rowCost;
      hasAtLeastOneCost = true;
    }

    serviceSet.add(serviceName);
    employeeSet.add(employeeName);

    const serviceSummary = serviceSummaryMap.get(serviceName) ?? {
      service: serviceName,
      hours: 0,
      tasks: 0,
      totalCost: null,
    };
    serviceSummary.hours += row.hours;
    serviceSummary.tasks += 1;
    if (showCost && rowCost != null && Number.isFinite(rowCost)) {
      serviceSummary.totalCost = (serviceSummary.totalCost ?? 0) + rowCost;
    }
    serviceSummaryMap.set(serviceName, serviceSummary);

    const employeeSummary = employeeSummaryMap.get(row.employeeId) ?? {
      employeeName,
      hours: 0,
      tasks: 0,
      totalCost: null,
    };

    employeeSummary.hours += row.hours;
    employeeSummary.tasks += 1;
    if (showCost && rowCost != null && Number.isFinite(rowCost)) {
      employeeSummary.totalCost = (employeeSummary.totalCost ?? 0) + rowCost;
    }

    employeeSummaryMap.set(row.employeeId, employeeSummary);

    taskRows.push({
      date: toDisplayDate(row.activityDate),
      service: serviceName,
      task: taskText,
      description: row.notes?.trim() || "—",
      hours: row.hours,
      employeeName: showEmployees ? employeeName : null,
      hourlyRate: showCost ? hourlyRate : null,
      totalCost: showCost ? rowCost : null,
    });
  }

  const employeeBreakdown: ReportsPdfEmployeeSummary[] = showEmployees
    ? Array.from(employeeSummaryMap.values())
        .map((row) => ({
          employeeName: row.employeeName,
          hours: row.hours,
          tasks: row.tasks,
          participationPercent: toPercent(row.hours, totalHours),
          totalCost: row.totalCost,
        }))
        .sort((a, b) => b.hours - a.hours)
    : [
        {
          employeeName: "Екип Brainspot",
          hours: totalHours,
          tasks: sortedRows.length,
          participationPercent: totalHours > 0 ? 100 : 0,
          totalCost: showCost && hasAtLeastOneCost ? totalCost : null,
        },
      ];

  const serviceBreakdown = Array.from(serviceSummaryMap.values())
    .map((row) => ({
      service: row.service,
      hours: row.hours,
      tasks: row.tasks,
      participationPercent: toPercent(row.hours, totalHours),
      totalCost: row.totalCost,
    }))
    .sort((a, b) => b.hours - a.hours);

  const activitiesSummary = buildActivityBullets(taskRows);
  const summaryServices = serviceBreakdown.slice(0, 4).map((row) => row.service);

  return {
    mode,
    modeLabel,
    clientLabel,
    monthLabel,
    totalHours,
    tasksCount: sortedRows.length,
    services: Array.from(serviceSet).sort((a, b) => a.localeCompare(b, "bg-BG")),
    employeesInvolved: Array.from(employeeSet).sort((a, b) => a.localeCompare(b, "bg-BG")),
    totalCost: showCost && hasAtLeastOneCost ? totalCost : null,
    summaryServices,
    activitiesSummary,
    serviceBreakdown,
    employeeBreakdown,
    taskRows,
  };
}
