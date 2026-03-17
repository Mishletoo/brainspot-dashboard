"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Employee = {
  id: string;
  name: string;
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

type WorkItemRow = {
  id: string;
  employeeId: string;
  clientId: string | null;
  serviceId: string | null;
  hours: number;
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

function parseHours(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? `${value} €` : `${value.toFixed(2)} €`;
}

export default function ReportsPage() {
  const [monthValue, setMonthValue] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [items, setItems] = useState<WorkItemRow[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadLookups = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const [
        { data: employeesData, error: employeesError },
        { data: clientsData, error: clientsError },
        { data: servicesData, error: servicesError },
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("id, first_name, last_name, gross_salary, bonus, vouchers, hours_per_day")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("id, name").order("name", { ascending: true }),
        supabase.from("services").select("id, name").order("name", { ascending: true }),
      ]);

      if (employeesError || clientsError || servicesError) {
        const details = JSON.stringify(
          {
            employeesError,
            clientsError,
            servicesError,
          },
          null,
          2
        );
        setErrorMessage(`Не успяхме да заредим служители, клиенти и услуги.\n\nТехнически детайли:\n${details}`);
        setEmployees([]);
        setClients([]);
        setServices([]);
        setItems([]);
        setIsLoading(false);
        return;
      }

      setEmployees(
        (employeesData ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id ?? ""),
          name: (() => {
            const first = typeof row.first_name === "string" ? row.first_name : "";
            const last = typeof row.last_name === "string" ? row.last_name : "";
            const full = `${first} ${last}`.trim();
            return full || "Без име";
          })(),
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

      setIsLoading(false);
    };

    loadLookups();
  }, []);

  useEffect(() => {
    const loadMonthlyData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data: reportsData, error: reportsError } = await supabase.from("monthly_reports").select("*");

      if (reportsError) {
        const details = JSON.stringify(reportsError, null, 2);
        setErrorMessage(`Не успяхме да заредим отчетите за месеца.\n\nТехнически детайли:\n${details}`);
        setItems([]);
        setIsLoading(false);
        return;
      }

      const submittedReports = (reportsData ?? [])
        .filter((row: Record<string, unknown>) => {
          const statusText = String(row.status ?? "").toLowerCase();
          return statusText === "submitted" && monthMatchesRow(row, monthValue);
        })
        .map((row: Record<string, unknown>) => row);

      if (submittedReports.length === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const reportIdToEmployeeId = new Map<string, string>();
      const reportIds: string[] = [];

      for (const row of submittedReports) {
        const reportId = String(row.id ?? "");
        if (!reportId) continue;
        const employeeId = String(row.employee_id ?? "");
        reportIds.push(reportId);
        if (employeeId) {
          reportIdToEmployeeId.set(reportId, employeeId);
        }
      }

      if (reportIds.length === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("work_report_items")
        .select("id, monthly_report_id, client_id, service_id, hours");

      if (itemsError) {
        const details = JSON.stringify(itemsError, null, 2);
        setErrorMessage(`Не успяхме да заредим детайлите по задачи.\n\nТехнически детайли:\n${details}`);
        setItems([]);
        setIsLoading(false);
        return;
      }

      const mappedItems: WorkItemRow[] = (itemsData ?? [])
        .filter((row: Record<string, unknown>) => reportIds.includes(String(row.monthly_report_id ?? "")))
        .map((row: Record<string, unknown>) => {
          const monthlyReportId = String(row.monthly_report_id ?? "");
          const employeeId = reportIdToEmployeeId.get(monthlyReportId) ?? "";

          return {
            id: String(row.id ?? ""),
            employeeId,
            clientId: row.client_id != null ? String(row.client_id) : null,
            serviceId: row.service_id != null ? String(row.service_id) : null,
            hours: parseHours(row.hours),
          };
        })
        .filter((item) => item.employeeId);

      setItems(mappedItems);
      setIsLoading(false);
    };

    loadMonthlyData();
  }, [monthValue]);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);
  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const servicesById = useMemo(() => new Map(services.map((s) => [s.id, s.name])), [services]);

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

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (selectedEmployeeId && item.employeeId !== selectedEmployeeId) return false;
        if (selectedClientId && item.clientId !== selectedClientId) return false;
        return true;
      }),
    [items, selectedEmployeeId, selectedClientId]
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
        employeeName: employeesById.get(item.employeeId) ?? "Неизвестен служител",
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
  }, [filteredItems, employeesById, clientsById]);

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
        const employeeName = employeesById.get(item.employeeId);
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
  }, [filteredItems, clientsById, employeesById]);

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
          employeeName: employeesById.get(employeeId) ?? "Неизвестен служител",
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
  }, [filteredItems, clientsById, employeesById, servicesById, employeeHourlyCostById]);

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

  const clientServiceGroups = useMemo(
    () => {
      if (!selectedClientId || costPerClientEmployee.length === 0) return [];

      type ServiceGroup = {
        serviceId: string;
        serviceName: string;
        rows: ClientEmployeeCostRow[];
        totalHours: number;
        totalCost: number | null;
      };

      const groups = new Map<string, ServiceGroup>();

      for (const row of costPerClientEmployee as any[]) {
        const serviceId = row.serviceId ?? "none";
        const serviceName = row.serviceName ?? "Без услуга";

        const existing: ServiceGroup =
          groups.get(serviceId) ??
          {
            serviceId,
            serviceName,
            rows: [] as ClientEmployeeCostRow[],
            totalHours: 0,
            totalCost: null as number | null,
          };

        existing.rows.push(row);
        existing.totalHours += row.hoursTotal;

        if (row.totalCost != null && Number.isFinite(row.totalCost)) {
          existing.totalCost = (existing.totalCost ?? 0) + row.totalCost;
        }

        groups.set(serviceId, existing);
      }

      return Array.from(groups.values()).sort((a, b) =>
        a.serviceName.localeCompare(b.serviceName, "bg-BG")
      );
    },
    [selectedClientId, costPerClientEmployee]
  );

  const hasData = filteredItems.length > 0;

  async function handleExportClientReport() {
    if (!selectedClientId || !clientCostTotals || clientServiceGroups.length === 0) return;
    if (isExporting) return;

    setIsExporting(true);
    try {
      const rawClientName = clientsById.get(selectedClientId) ?? "client";
      const safeClientName = rawClientName
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s]+/g, "-")
        .replace(/[^a-zа-я0-9\-]+/gi, "");

      const safeMonth = monthValue.replace(/[^0-9\-]+/g, "") || monthValue;

      const filename = `client-report-${safeClientName || "client"}-${safeMonth}.pdf`;

      const [{ PDFDocument, rgb }, fontkitModule] = await Promise.all([
        import("pdf-lib"),
        import("@pdf-lib/fontkit"),
      ]);

      const fontkit = (fontkitModule as any).default ?? fontkitModule;

      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      // Typography: use embedded sans-serif with proper Cyrillic support
      const fontResponse = await fetch("/fonts/Roboto-Regular.ttf");
      if (!fontResponse.ok) {
        throw new Error(
          `[Reports PDF] Failed to load font /fonts/Roboto-Regular.ttf (status ${fontResponse.status})`
        );
      }
      const fontBytes = await fontResponse.arrayBuffer();
      let page = pdfDoc.addPage();
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const font = await pdfDoc.embedFont(fontBytes);

      // Color system for a clean light report.
      const textPrimary = rgb(0.09, 0.11, 0.14);
      const textSecondary = rgb(0.39, 0.44, 0.5);
      const borderSoft = rgb(0.86, 0.89, 0.93);
      const panelBg = rgb(0.975, 0.98, 0.988);
      const tableHeaderBg = rgb(0.956, 0.968, 0.986);
      const zebraA = rgb(0.985, 0.988, 0.994);
      const zebraB = rgb(0.972, 0.978, 0.988);
      const subtotalBg = rgb(0.945, 0.952, 0.965);
      const totalBg = rgb(0.918, 0.928, 0.946);

      const marginLeft = 28;
      const marginRight = 28;
      const marginTop = 42;
      const marginBottom = 40;
      const contentWidth = pageWidth - marginLeft - marginRight;

      const titleSize = 19;
      const bodySize = 10.5;
      const tableHeaderSize = 9.3;
      const tableCellSize = 9.6;
      const headerHeight = 74;
      const metaRowHeight = 18;
      const tableHeaderHeight = 26;
      const tableRowBaseHeight = 24;
      const cellPadding = 10;

      let cursorY = pageHeight - marginTop - headerHeight - 16;

      const drawTextRaw = (
        text: string,
        x: number,
        y: number,
        size: number,
        color = textPrimary
      ) => {
        page.drawText(text, {
          x,
          y,
          size,
          font,
          color,
        });
      };

      const textWidth = (text: string, size: number) => font.widthOfTextAtSize(text, size);

      const truncateToWidth = (value: string, maxWidth: number, size: number) => {
        const safe = (value ?? "").toString();
        if (!safe) return "";
        if (textWidth(safe, size) <= maxWidth) return safe;
        const ellipsis = "…";
        let result = safe;
        while (result.length > 0 && textWidth(result + ellipsis, size) > maxWidth) {
          result = result.slice(0, -1);
        }
        return result ? `${result}${ellipsis}` : ellipsis;
      };

      const drawHeader = () => {
        const headerTopY = pageHeight - marginTop;
        drawTextRaw("Brain Spot", marginLeft, headerTopY - 14, 12, textSecondary);
        drawTextRaw("Отчет за клиент", marginLeft, headerTopY - 38, titleSize, textPrimary);
        page.drawLine({
          start: { x: marginLeft, y: pageHeight - marginTop - headerHeight },
          end: { x: pageWidth - marginRight, y: pageHeight - marginTop - headerHeight },
          thickness: 1,
          color: borderSoft,
        });

      };

      const addNewPage = () => {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        drawHeader();
        cursorY = pageHeight - marginTop - headerHeight - 16;
      };

      const ensureSpace = (requiredHeight: number) => {
        if (cursorY - requiredHeight < marginBottom) {
          addNewPage();
        }
      };

      const totalTasks = filteredItems.length;
      const totalHoursText = formatHours(clientCostTotals.totalHours);
      const totalCostText =
        clientCostTotals.totalCost == null
          ? "—"
          : formatCurrency(clientCostTotals.totalCost);

      drawHeader();

      // Meta summary panel (same data, refined visual hierarchy).
      ensureSpace(metaRowHeight * 3 + 24);
      const metaTopY = cursorY;
      const metaPanelHeight = metaRowHeight * 3 + 14;
      page.drawRectangle({
        x: marginLeft,
        y: metaTopY - metaPanelHeight,
        width: contentWidth,
        height: metaPanelHeight,
        color: panelBg,
      });

      const leftColX = marginLeft + 14;
      const rightColX = marginLeft + contentWidth / 2 + 8;
      const metaLabelValueGap = 14;
      const metaColumnWidth = contentWidth / 2 - 22;
      const firstMetaRowY = metaTopY - 18;
      const secondMetaRowY = firstMetaRowY - metaRowHeight;
      const thirdMetaRowY = secondMetaRowY - metaRowHeight;

      const drawMetaLine = (label: string, value: string, x: number, y: number) => {
        const labelWidth = textWidth(label, bodySize);
        const valueX = x + labelWidth + metaLabelValueGap;
        const maxValueWidth = Math.max(20, x + metaColumnWidth - valueX);
        drawTextRaw(label, x, y, bodySize, textSecondary);
        drawTextRaw(truncateToWidth(value, maxValueWidth, bodySize), valueX, y, bodySize, textPrimary);
      };

      drawMetaLine("Клиент:", String(rawClientName), leftColX, firstMetaRowY);
      drawMetaLine("Месец:", monthLabel(monthValue), leftColX, secondMetaRowY);
      drawMetaLine("Общо задачи:", String(totalTasks), leftColX, thirdMetaRowY);
      drawMetaLine("Общо часове:", totalHoursText, rightColX, firstMetaRowY);
      drawMetaLine("Обща себестойност:", totalCostText, rightColX, secondMetaRowY);

      cursorY = metaTopY - metaPanelHeight - 18;

      const columns = [
        { key: "service", title: "Услуга", width: 168, align: "left" as const },
        { key: "employee", title: "Служител", width: 147, align: "left" as const },
        { key: "hours", title: "Часове", width: 56, align: "right" as const },
        { key: "rate", title: "Цена на час", width: 72, align: "right" as const },
        { key: "cost", title: "Себестойност", width: 64, align: "right" as const },
      ];
      const columnGap = 8;

      let columnX = marginLeft;
      const tableColumns = columns.map((col) => {
        const mapped = { ...col, x: columnX };
        columnX += col.width + columnGap;
        return mapped;
      });

      function drawTableHeader() {
        ensureSpace(tableHeaderHeight + 8);
        const y = cursorY - tableHeaderHeight;
        page.drawRectangle({
          x: marginLeft,
          y,
          width: contentWidth,
          height: tableHeaderHeight,
          color: tableHeaderBg,
        });

        page.drawLine({
          start: { x: marginLeft, y },
          end: { x: pageWidth - marginRight, y },
          thickness: 1,
          color: borderSoft,
        });

        tableColumns.forEach((col) => {
          const titleWidth = textWidth(col.title, tableHeaderSize);
          const textX =
            col.align === "right"
              ? col.x + col.width - cellPadding - titleWidth
              : col.x + cellPadding;
          drawTextRaw(col.title, textX, y + 8, tableHeaderSize, textPrimary);
        });

        cursorY = y;
      }

      const drawTableRow = (
        service: string,
        employee: string,
        hours: string,
        rate: string,
        cost: string,
        options?: { rowIndex?: number; isSubtotal?: boolean; isGrandTotal?: boolean }
      ) => {
        const wrapToTwoLines = (value: string, maxWidth: number) => {
          const safe = String(value ?? "").trim();
          if (!safe) return [""];
          if (textWidth(safe, tableCellSize) <= maxWidth) return [safe];

          const words = safe.split(/\s+/).filter(Boolean);
          let firstLine = "";
          let consumed = 0;

          for (let i = 0; i < words.length; i++) {
            const candidate = firstLine ? `${firstLine} ${words[i]}` : words[i];
            if (textWidth(candidate, tableCellSize) <= maxWidth) {
              firstLine = candidate;
              consumed = i + 1;
            } else {
              break;
            }
          }

          if (!firstLine) {
            const hardFirst = truncateToWidth(safe, maxWidth, tableCellSize);
            return [hardFirst];
          }

          const rest = words.slice(consumed).join(" ");
          if (!rest) return [firstLine];
          return [firstLine, truncateToWidth(rest, maxWidth, tableCellSize)];
        };

        const serviceLines = wrapToTwoLines(service, columns[0].width - cellPadding * 2);
        const employeeLines = wrapToTwoLines(employee, columns[1].width - cellPadding * 2);
        const lineCount = Math.max(serviceLines.length, employeeLines.length, 1);
        const rowHeight = tableRowBaseHeight + (lineCount - 1) * 10;

        ensureSpace(rowHeight + tableHeaderHeight + 2);
        if (cursorY - rowHeight < marginBottom + 8) {
          addNewPage();
          drawTableHeader();
        }

        const rowIndex = options?.rowIndex ?? 0;
        const isSubtotal = options?.isSubtotal ?? false;
        const isGrandTotal = options?.isGrandTotal ?? false;
        const y = cursorY - rowHeight;

        const rowBg = isGrandTotal ? totalBg : isSubtotal ? subtotalBg : rowIndex % 2 === 0 ? zebraA : zebraB;
        page.drawRectangle({
          x: marginLeft,
          y,
          width: contentWidth,
          height: rowHeight,
          color: rowBg,
        });
        page.drawLine({
          start: { x: marginLeft, y },
          end: { x: pageWidth - marginRight, y },
          thickness: 0.6,
          color: borderSoft,
        });

        const cells = { service, employee, hours, rate, cost };
        const topTextY = y + rowHeight - tableCellSize - 6;

        tableColumns.forEach((col) => {
          if (col.key === "service" || col.key === "employee") {
            const lines = col.key === "service" ? serviceLines : employeeLines;
            lines.forEach((line, index) => {
              drawTextRaw(line, col.x + cellPadding, topTextY - index * 10.4, tableCellSize, textPrimary);
            });
            return;
          }

          const rawValue = String(cells[col.key as keyof typeof cells] ?? "");
          const safeValue = truncateToWidth(rawValue, col.width - cellPadding * 2, tableCellSize);
          const valueWidth = textWidth(safeValue, tableCellSize);
          const textX =
            col.align === "right"
              ? col.x + col.width - cellPadding - valueWidth
              : col.x + cellPadding;
          drawTextRaw(safeValue, textX, topTextY, tableCellSize, textPrimary);
        });

        cursorY = y;
      };

      drawTableHeader();

      let globalRowIndex = 0;

      for (const group of clientServiceGroups as any[]) {
        group.rows.forEach((row: any, index: number) => {
          const serviceCell = index === 0 ? String(group.serviceName ?? "") : "";
          const hoursText = formatHours(row.hoursTotal);
          const hourlyText =
            row.hourlyCost == null ? "—" : formatCurrency(row.hourlyCost);
          const totalText =
            row.totalCost == null ? "—" : formatCurrency(row.totalCost);

          drawTableRow(
            serviceCell,
            String(row.employeeName ?? ""),
            hoursText,
            hourlyText,
            totalText,
            { rowIndex: globalRowIndex++ }
          );
        });

        const groupHoursText = formatHours(group.totalHours);
        const groupTotalText =
          group.totalCost == null ? "—" : formatCurrency(group.totalCost);

        drawTableRow(
          "Общо за услугата",
          "",
          groupHoursText,
          "—",
          groupTotalText,
          { isSubtotal: true, rowIndex: globalRowIndex++ }
        );
      }

      drawTableRow(
        "Общо за клиента",
        "",
        totalHoursText,
        "—",
        totalCostText,
        { isSubtotal: true, isGrandTotal: true, rowIndex: globalRowIndex++ }
      );

      const pdfBytes = await pdfDoc.save();
      const pdfBlobBytes = new Uint8Array(pdfBytes);
      const blob = new Blob([pdfBlobBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export client report PDF", error);
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
              Обобщени данни по служители и по клиенти за изпратени месечни отчети.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <label htmlFor="month" className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
                Месец
              </label>
              <input
                id="month"
                type="month"
                value={monthValue}
                onChange={(event) => setMonthValue(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500"
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

        {!isLoading && !errorMessage && !hasData && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
            Няма данни за избраните филтри.
          </div>
        )}

        {!isLoading && !errorMessage && hasData && (
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

            {/* Section 4: Преглед на отчет за клиента */}
            {selectedClientId && clientCostTotals && clientServiceGroups.length > 0 && (
              <div id="client-report-preview">
                <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Преглед на отчет за клиента</h2>
                      <p className="text-xs text-zinc-500">
                        {monthLabel(monthValue)} ·{" "}
                        {clientsById.get(selectedClientId) ?? "Неизвестен клиент"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportClientReport}
                      disabled={isExporting}
                      className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-100 shadow-sm transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isExporting ? "Генериране..." : "Изтегли PDF"}
                    </button>
                  </div>

                  {/* Summary block */}
                  <div className="mt-4 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm text-zinc-100 md:grid-cols-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Клиент
                      </span>
                      <span className="text-sm font-semibold">
                        {clientsById.get(selectedClientId) ?? "Неизвестен клиент"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Месец
                      </span>
                      <span className="text-sm">{monthLabel(monthValue)}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Общо задачи
                      </span>
                      <span className="text-sm font-semibold">{filteredItems.length}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Общо часове
                      </span>
                      <span className="text-sm font-semibold">
                        {formatHours(clientCostTotals.totalHours)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Обща себестойност
                      </span>
                      <span className="text-sm font-semibold">
                        {clientCostTotals.totalCost == null
                          ? "—"
                          : formatCurrency(clientCostTotals.totalCost)}
                      </span>
                    </div>
                  </div>

                  {/* Single table grouped by service */}
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/90">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-zinc-800 bg-zinc-950/95 text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Услуга</th>
                          <th className="px-3 py-2 font-medium">Служител</th>
                          <th className="px-3 py-2 font-medium text-right">Часове</th>
                          <th className="px-3 py-2 font-medium text-right">Цена на час</th>
                          <th className="px-3 py-2 font-medium text-right">Себестойност</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientServiceGroups.map((group) => (
                          <Fragment key={group.serviceId}>
                            {group.rows.map((row: any, index: number) => (
                              <tr
                                key={`${row.employeeId}|${row.serviceId ?? "none"}|${index}`}
                                className="border-b border-zinc-900 last:border-b-0"
                              >
                                <td className="px-3 py-1.5 align-top text-sm text-zinc-100">
                                  {index === 0 ? group.serviceName : ""}
                                </td>
                                <td className="px-3 py-1.5 align-top text-sm text-zinc-100">
                                  {row.employeeName}
                                </td>
                                <td className="px-3 py-1.5 text-right text-sm text-zinc-100">
                                  {formatHours(row.hoursTotal)}
                                </td>
                                <td className="px-3 py-1.5 text-right text-sm text-zinc-100">
                                  {row.hourlyCost == null
                                    ? "—"
                                    : formatCurrency(row.hourlyCost)}
                                </td>
                                <td className="px-3 py-1.5 text-right text-sm text-zinc-100">
                                  {row.totalCost == null
                                    ? "—"
                                    : formatCurrency(row.totalCost)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-zinc-800 bg-zinc-900/80">
                              <td className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                                Общо за услугата
                              </td>
                              <td className="px-3 py-1.5" />
                              <td className="px-3 py-1.5 text-right text-sm font-semibold text-zinc-100">
                                {formatHours(group.totalHours)}
                              </td>
                              <td className="px-3 py-1.5 text-right text-sm text-zinc-500">—</td>
                              <td className="px-3 py-1.5 text-right text-sm font-semibold text-zinc-100">
                                {group.totalCost == null
                                  ? "—"
                                  : formatCurrency(group.totalCost)}
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                        <tr className="border-t border-zinc-800 bg-zinc-950">
                          <td className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                            Общо за клиента
                          </td>
                          <td className="px-3 py-2" />
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
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
