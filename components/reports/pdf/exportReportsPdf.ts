import { jsPDF } from "jspdf";
import autoTable, { type CellHookData, type RowInput, type CellDef } from "jspdf-autotable";
import type { ReportsPdfData, ReportsPdfExportOptions } from "@/components/reports/pdf/reportPdfDataBuilder";

const FONT_FAMILY = "RobotoCyrillic";
const PRIMARY_FONT = "Roboto-Regular.ttf";

// Корпоративна палитра — графит, светло зелено от Brainspot, неутрални сиви.
const ACCENT: [number, number, number] = [163, 191, 35];
const ACCENT_SOFT_BG: [number, number, number] = [240, 246, 215];
const DARK_TEXT: [number, number, number] = [22, 28, 36];
const GRAPHITE: [number, number, number] = [45, 52, 62];
const MUTED_TEXT: [number, number, number] = [102, 114, 128];
const READABLE_MUTED: [number, number, number] = [70, 80, 92];
const TABLE_BORDER: [number, number, number] = [221, 226, 234];
const PAGE_PADDING_BOTTOM = 56;

function formatHours(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? `${value} €` : `${value.toFixed(2)} €`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^a-zа-я0-9\-]+/gi, "")
    .trim();
}

async function imageToDataUrl(path: string): Promise<string | null> {
  const response = await fetch(path);
  if (!response.ok) return null;
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function bytesToBinaryString(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return binary;
}

async function registerCyrillicFont(doc: jsPDF): Promise<void> {
  const response = await fetch("/fonts/Roboto-Regular.ttf");
  if (!response.ok) {
    throw new Error(`Failed to load Cyrillic font (status ${response.status})`);
  }

  const fontBuffer = await response.arrayBuffer();
  const fontBinary = bytesToBinaryString(new Uint8Array(fontBuffer));

  doc.addFileToVFS(PRIMARY_FONT, fontBinary);
  doc.addFont(PRIMARY_FONT, FONT_FAMILY, "normal");
  doc.setFont(FONT_FAMILY, "normal");
}

function ensurePageSpace(doc: jsPDF, y: number, requiredHeight: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + requiredHeight <= pageHeight - PAGE_PADDING_BOTTOM) {
    return y;
  }
  doc.addPage();
  return 60;
}

// По-силни секционни заглавия — UPPERCASE, по-голям шрифт, дебел accent strip,
// тънка линия под заглавието и много въздух преди/след.
function drawSectionHeader(
  doc: jsPDF,
  title: string,
  marginX: number,
  pageWidth: number,
  y: number
): number {
  const headerY = y + 6;
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(marginX, headerY - 14, 4, 18, "F");

  doc.setFontSize(15);
  doc.setTextColor(GRAPHITE[0], GRAPHITE[1], GRAPHITE[2]);
  doc.setFont(FONT_FAMILY, "normal");
  doc.text(title, marginX + 14, headerY);

  // Деликатна сива линия под заглавието — за визуална разделителност.
  doc.setDrawColor(TABLE_BORDER[0], TABLE_BORDER[1], TABLE_BORDER[2]);
  doc.setLineWidth(0.5);
  doc.line(marginX, headerY + 10, pageWidth - marginX, headerY + 10);

  return headerY + 28;
}

function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string
): void {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(TABLE_BORDER[0], TABLE_BORDER[1], TABLE_BORDER[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(x, y, w, h, 8, 8, "FD");

  // Зелена лента отгоре — корпоративен accent.
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(x, y, w, 5, "F");

  doc.setFontSize(10);
  doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
  doc.setFont(FONT_FAMILY, "normal");
  doc.text(title, x + 16, y + 28);

  doc.setFontSize(22);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
  doc.text(value, x + 16, y + 58);
}

function tableHeadStyles() {
  return {
    fillColor: ACCENT_SOFT_BG,
    textColor: GRAPHITE,
    font: FONT_FAMILY,
    fontStyle: "normal" as const,
    halign: "center" as const,
    fontSize: 10,
    cellPadding: { top: 10, right: 8, bottom: 10, left: 8 },
  };
}

function baseTableStyles() {
  return {
    font: FONT_FAMILY,
    fontStyle: "normal" as const,
    fontSize: 10.5,
    textColor: DARK_TEXT,
    cellPadding: { top: 11, right: 8, bottom: 11, left: 8 },
    overflow: "linebreak" as const,
  };
}

function drawRowSeparator(
  doc: jsPDF,
  data: CellHookData,
  marginX: number,
  pageWidth: number
): void {
  if (data.section !== "body") return;
  doc.setDrawColor(TABLE_BORDER[0], TABLE_BORDER[1], TABLE_BORDER[2]);
  doc.setLineWidth(0.4);
  const lineY = data.cell.y + data.cell.height;
  doc.line(marginX, lineY, pageWidth - marginX, lineY);
}

function getTableEndY(doc: jsPDF, fallback: number): number {
  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return last?.finalY ?? fallback;
}

export async function exportReportsPdf(
  data: ReportsPdfData,
  options: ReportsPdfExportOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    putOnlyUsedFonts: true,
    compress: true,
  });

  await registerCyrillicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;

  // ===== ХЕДЪР: голямо лого, корпоративно заглавие =====
  const logoDataUrl = await imageToDataUrl("/logos/brain_spot_logo-03.png");
  let logoBottom = 44;
  if (logoDataUrl) {
    const props = doc.getImageProperties(logoDataUrl);
    const naturalRatio = props.height > 0 ? props.width / props.height : 3;
    // Голямо, центрирано лого — фиксирана височина, естествени пропорции, без stretch.
    // PNG-ите имат вграден празно поле, затова височината е щедра.
    const maxLogoHeight = 130;
    const maxLogoWidth = 320;
    let logoHeight = maxLogoHeight;
    let logoWidth = logoHeight * naturalRatio;
    if (logoWidth > maxLogoWidth) {
      logoWidth = maxLogoWidth;
      logoHeight = logoWidth / naturalRatio;
    }
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 40;
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
    logoBottom = logoY + logoHeight;
  } else {
    doc.setFontSize(18);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("Brainspot", pageWidth / 2, 76, { align: "center" });
    logoBottom = 96;
  }

  let y = logoBottom + 44;

  doc.setFontSize(24);
  doc.setTextColor(GRAPHITE[0], GRAPHITE[1], GRAPHITE[2]);
  doc.setFont(FONT_FAMILY, "normal");
  doc.text("ОТЧЕТ ЗА ИЗВЪРШЕНА РАБОТА", pageWidth / 2, y, { align: "center" });
  y += 30;

  doc.setFontSize(17);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
  doc.text(data.clientLabel, pageWidth / 2, y, { align: "center" });
  y += 22;

  doc.setFontSize(12);
  doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
  doc.text(data.monthLabel, pageWidth / 2, y, { align: "center" });
  y += 18;

  doc.setFontSize(9.5);
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text(data.modeLabel, pageWidth / 2, y, { align: "center" });
  y += 16;

  // Accent линия за визуално приключване на хедъра.
  const dividerWidth = 100;
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(1.4);
  doc.line((pageWidth - dividerWidth) / 2, y, (pageWidth + dividerWidth) / 2, y);
  y += 36;

  // ===== КЛЮЧОВИ ПОКАЗАТЕЛИ =====
  y = drawSectionHeader(doc, "КЛЮЧОВИ ПОКАЗАТЕЛИ", marginX, pageWidth, y);

  const kpiCards: { title: string; value: string }[] = [
    { title: "Общо часове", value: formatHours(data.totalHours) },
    { title: "Общо задачи", value: String(data.tasksCount) },
    { title: "Брой услуги", value: String(data.services.length) },
    { title: "Брой служители", value: String(data.employeesInvolved.length) },
  ];

  const cardGap = 16;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 76;

  for (let i = 0; i < kpiCards.length; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const cardX = marginX + col * (cardWidth + cardGap);
    const cardY = y + row * (cardHeight + cardGap);
    drawKpiCard(doc, cardX, cardY, cardWidth, cardHeight, kpiCards[i].title, kpiCards[i].value);
  }
  y += Math.ceil(kpiCards.length / 2) * (cardHeight + cardGap);

  if (options.showCost) {
    drawKpiCard(doc, marginX, y, contentWidth, cardHeight, "Обща себестойност", formatCurrency(data.totalCost));
    y += cardHeight + cardGap;
  }

  y += 18;

  // ===== РЕЗЮМЕ НА МЕСЕЦА (кратко, 5–6 реда) =====
  const summaryBlockHeight = 80 + Math.max(1, data.summaryServices.length) * 20;
  y = ensurePageSpace(doc, y, summaryBlockHeight);
  y = drawSectionHeader(doc, "РЕЗЮМЕ НА МЕСЕЦА", marginX, pageWidth, y);

  doc.setFontSize(11);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
  doc.text(`През ${data.monthLabel} екипът на Brainspot работи по:`, marginX, y);
  y += 20;

  doc.setFontSize(11);
  doc.setTextColor(GRAPHITE[0], GRAPHITE[1], GRAPHITE[2]);
  if (data.summaryServices.length === 0) {
    doc.text("• Няма налични услуги за периода", marginX + 14, y);
    y += 20;
  } else {
    for (const service of data.summaryServices) {
      doc.text(`• ${service}`, marginX + 14, y);
      y += 20;
    }
  }
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
  doc.text(
    `Изпълнени са общо ${data.tasksCount} задачи с участие на ${data.employeesInvolved.length} специалисти.`,
    marginX,
    y
  );
  y += 30;

  // ===== ИЗВЪРШЕНИ ДЕЙНОСТИ =====
  const activitiesToShow = data.activitiesSummary.length
    ? data.activitiesSummary
    : ["Няма налични обобщени дейности."];
  const activitiesBlockHeight = 50 + activitiesToShow.length * 20;
  y = ensurePageSpace(doc, y, activitiesBlockHeight);
  y = drawSectionHeader(doc, "ИЗВЪРШЕНИ ДЕЙНОСТИ", marginX, pageWidth, y);

  for (const activity of activitiesToShow) {
    y = ensurePageSpace(doc, y, 22);
    doc.setFontSize(11);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("✓", marginX + 4, y);
    doc.setTextColor(GRAPHITE[0], GRAPHITE[1], GRAPHITE[2]);
    doc.text(activity, marginX + 22, y);
    y += 20;
  }
  y += 16;

  // ===== РАЗБИВКА ПО УСЛУГИ =====
  y = ensurePageSpace(doc, y, 200);
  y = drawSectionHeader(doc, "РАЗБИВКА ПО УСЛУГИ", marginX, pageWidth, y);

  autoTable(doc, {
    startY: y,
    head: [["Услуга", "Общо часове", "%", "Брой задачи"]],
    body: data.serviceBreakdown.length > 0
      ? data.serviceBreakdown.map(
          (row): RowInput => [
            row.service,
            formatHours(row.hours),
            formatPercent(row.participationPercent),
            String(row.tasks),
          ]
        )
      : [["—", "—", "—", "—"]],
    margin: { left: marginX, right: marginX },
    theme: "plain",
    styles: baseTableStyles(),
    headStyles: tableHeadStyles(),
    columnStyles: {
      0: { cellWidth: 200, halign: "left" },
      1: { cellWidth: 105, halign: "center" },
      2: { cellWidth: 100, halign: "center" },
      3: { cellWidth: 110, halign: "center" },
    },
    didDrawCell: (cellData) => {
      if (cellData.section === "body" && cellData.column.index === 0) {
        drawRowSeparator(doc, cellData, marginX, pageWidth);
      }
    },
  });
  y = getTableEndY(doc, y) + 30;

  // ===== РАЗБИВКА ПО СЛУЖИТЕЛИ =====
  y = ensurePageSpace(doc, y, 180);
  y = drawSectionHeader(doc, "РАЗБИВКА ПО СЛУЖИТЕЛИ", marginX, pageWidth, y);

  const employeeHead = options.showCost
    ? ["Служител", "Часове", "Задачи", "Процент участие", "Себестойност"]
    : ["Служител", "Часове", "Задачи", "Процент участие"];

  const employeeBody: RowInput[] = data.employeeBreakdown.map((row) => {
    const cells: CellDef[] = [
      { content: row.employeeName },
      { content: formatHours(row.hours) },
      { content: String(row.tasks) },
      {
        content: formatPercent(row.participationPercent),
        styles: { fontSize: 12.5, textColor: GRAPHITE },
      },
    ];
    if (options.showCost) {
      cells.push({ content: formatCurrency(row.totalCost) });
    }
    return cells;
  });

  // Ширини, гарантиращи че никой хедър не се пренася.
  const employeeColumnStyles: Record<number, { cellWidth: number; halign: "left" | "center" | "right" }> = options.showCost
    ? {
        0: { cellWidth: 175, halign: "left" },
        1: { cellWidth: 65, halign: "center" },
        2: { cellWidth: 65, halign: "center" },
        3: { cellWidth: 115, halign: "center" },
        4: { cellWidth: 95, halign: "right" },
      }
    : {
        0: { cellWidth: 210, halign: "left" },
        1: { cellWidth: 75, halign: "center" },
        2: { cellWidth: 75, halign: "center" },
        3: { cellWidth: 155, halign: "center" },
      };

  const employeeEmptyRow = options.showCost
    ? [
        { content: "—" },
        { content: "—" },
        { content: "—" },
        { content: "—" },
        { content: "—" },
      ]
    : [
        { content: "—" },
        { content: "—" },
        { content: "—" },
        { content: "—" },
      ];

  autoTable(doc, {
    startY: y,
    head: [employeeHead],
    body: employeeBody.length > 0 ? employeeBody : [employeeEmptyRow],
    margin: { left: marginX, right: marginX },
    theme: "plain",
    styles: baseTableStyles(),
    headStyles: tableHeadStyles(),
    columnStyles: employeeColumnStyles,
    didDrawCell: (cellData) => {
      if (cellData.section === "body" && cellData.column.index === 0) {
        drawRowSeparator(doc, cellData, marginX, pageWidth);
      }
    },
  });
  y = getTableEndY(doc, y) + 30;

  // ===== ДЕТАЙЛЕН ОТЧЕТ =====
  y = ensurePageSpace(doc, y, 220);
  y = drawSectionHeader(doc, "ДЕТАЙЛЕН ОТЧЕТ", marginX, pageWidth, y);

  const taskHead: string[] = ["Дата", "Услуга", "Задача", "Часове"];
  if (options.showEmployees) taskHead.push("Служител");
  if (options.showCost) taskHead.push("Себестойност");

  // Фиксирани ширини, оразмерени така че никой хедър да не се пренася,
  // включително пълната българска дата като "1.05.2026 г.".
  // "Услуга" получава достатъчно ширина за двуредово пренасяне на дълги имена.
  // Само "Задача" и описанието могат да се пренасят свободно на нов ред.
  let widths: number[];
  if (options.showEmployees && options.showCost) {
    widths = [78, 100, 117, 55, 80, 85];
  } else if (options.showEmployees) {
    widths = [80, 115, 172, 55, 93];
  } else if (options.showCost) {
    widths = [80, 115, 170, 55, 95];
  } else {
    widths = [82, 130, 245, 58];
  }

  const totalCols = widths.length;
  const taskBody: RowInput[] = [];
  const rowKinds: ("main" | "sub")[] = [];

  for (const row of data.taskRows) {
    const mainRow: CellDef[] = [
      { content: row.date },
      { content: row.service },
      { content: row.task },
      { content: formatHours(row.hours) },
    ];
    if (options.showEmployees) {
      mainRow.push({ content: row.employeeName ?? "Екип Brainspot" });
    }
    if (options.showCost) {
      mainRow.push({ content: formatCurrency(row.totalCost) });
    }
    taskBody.push(mainRow);
    rowKinds.push("main");

    const desc = row.description?.trim();
    if (desc && desc !== "—") {
      // Описанието получава пълна ширина под датата и услугата,
      // с по-голям шрифт и въздух — да се чете лесно.
      const subRow: CellDef[] = [
        { content: "" },
        { content: "" },
        {
          content: desc,
          colSpan: totalCols - 2,
          styles: {
            fontSize: 9.5,
            textColor: READABLE_MUTED,
            cellPadding: { top: 2, right: 10, bottom: 14, left: 10 },
          },
        },
      ];
      taskBody.push(subRow);
      rowKinds.push("sub");
    }
  }

  const taskColumnStyles: Record<number, { cellWidth: number; halign?: "left" | "center" | "right" }> = {
    0: { cellWidth: widths[0], halign: "center" },
    1: { cellWidth: widths[1], halign: "left" },
    2: { cellWidth: widths[2], halign: "left" },
    3: { cellWidth: widths[3], halign: "center" },
  };
  let nextIdx = 4;
  if (options.showEmployees) {
    taskColumnStyles[nextIdx] = { cellWidth: widths[nextIdx], halign: "left" };
    nextIdx++;
  }
  if (options.showCost) {
    taskColumnStyles[nextIdx] = { cellWidth: widths[nextIdx], halign: "right" };
  }

  const emptyBodyRow = (() => {
    const cells: CellDef[] = [
      { content: "—" },
      { content: "—" },
      { content: "Няма записи за избраните филтри" },
      { content: "—" },
    ];
    if (options.showEmployees) cells.push({ content: "—" });
    if (options.showCost) cells.push({ content: "—" });
    return cells;
  })();

  autoTable(doc, {
    startY: y,
    head: [taskHead],
    body: taskBody.length > 0 ? taskBody : [emptyBodyRow],
    margin: { left: marginX, right: marginX },
    theme: "plain",
    styles: {
      ...baseTableStyles(),
      fontSize: 10,
      cellPadding: { top: 11, right: 8, bottom: 6, left: 8 },
    },
    headStyles: tableHeadStyles(),
    columnStyles: taskColumnStyles,
    didDrawCell: (cellData) => {
      if (cellData.section !== "body") return;
      if (cellData.column.index !== 0) return;
      const idx = cellData.row.index;
      const kind = rowKinds[idx];
      if (!kind) return;
      const next = rowKinds[idx + 1];
      const isGroupEnd = (kind === "main" && next !== "sub") || kind === "sub";
      if (!isGroupEnd) return;
      doc.setDrawColor(TABLE_BORDER[0], TABLE_BORDER[1], TABLE_BORDER[2]);
      doc.setLineWidth(0.4);
      const lineY = cellData.cell.y + cellData.cell.height;
      doc.line(marginX, lineY, pageWidth - marginX, lineY);
    },
  });
  y = getTableEndY(doc, y);

  // ===== ФИНАНСОВО ОБОБЩЕНИЕ =====
  if (options.showCost) {
    y += 36;
    y = ensurePageSpace(doc, y, 280);
    y = drawSectionHeader(doc, "ФИНАНСОВО ОБОБЩЕНИЕ", marginX, pageWidth, y);

    const finCardHeight = 90;
    const finCardWidth = (contentWidth - cardGap) / 2;
    drawKpiCard(doc, marginX, y, finCardWidth, finCardHeight, "Общо часове", formatHours(data.totalHours));
    drawKpiCard(
      doc,
      marginX + finCardWidth + cardGap,
      y,
      finCardWidth,
      finCardHeight,
      "Обща себестойност",
      formatCurrency(data.totalCost)
    );
    y += finCardHeight + 28;

    y = ensurePageSpace(doc, y, 140);

    autoTable(doc, {
      startY: y,
      head: [["Услуга", "Себестойност"]],
      body: data.serviceBreakdown.length > 0
        ? data.serviceBreakdown.map(
            (row): RowInput => [row.service, formatCurrency(row.totalCost)]
          )
        : [["—", "—"]],
      margin: { left: marginX, right: marginX },
      theme: "plain",
      styles: baseTableStyles(),
      headStyles: {
        ...tableHeadStyles(),
        halign: "left",
      },
      columnStyles: {
        0: { cellWidth: 375, halign: "left" },
        1: { cellWidth: 140, halign: "right" },
      },
      didDrawCell: (cellData) => {
        if (cellData.section === "body" && cellData.column.index === 0) {
          drawRowSeparator(doc, cellData, marginX, pageWidth);
        }
      },
    });
  }

  // Документът приключва тук — никаква финална страница.

  const safeClient = sanitizeFilename(data.clientLabel);
  const safeMonth = sanitizeFilename(data.monthLabel);
  const fileName = `otchet-${safeClient || "vsichki-klienti"}-${safeMonth || "period"}.pdf`;
  doc.save(fileName);
}
