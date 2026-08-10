/** Shared report-month helpers. Source of truth: report_year + report_month. */

export const BG_MONTH_NAMES = [
  "Януари",
  "Февруари",
  "Март",
  "Април",
  "Май",
  "Юни",
  "Юли",
  "Август",
  "Септември",
  "Октомври",
  "Ноември",
  "Декември",
] as const;

export type ReportMonthKey = string; // YYYY-MM

export function toMonthKey(year: number, month: number): ReportMonthKey {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(monthKey: ReportMonthKey): { year: number; month: number } {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  return { year, month };
}

export function getCurrentMonthKey(date = new Date()): ReportMonthKey {
  return toMonthKey(date.getFullYear(), date.getMonth() + 1);
}

/** Bulgarian label: "Юли 2026" */
export function formatBgMonthLabel(year: number, month: number): string {
  const name = BG_MONTH_NAMES[month - 1];
  if (!name || !Number.isFinite(year)) return `${month}.${year}`;
  return `${name} ${year}`;
}

export function formatBgMonthKey(monthKey: ReportMonthKey): string {
  const { year, month } = parseMonthKey(monthKey);
  return formatBgMonthLabel(year, month);
}

/** Build selectable months: current month + months present in data, newest first. */
export function buildAvailableMonthKeys(
  dataMonths: Array<{ year: number; month: number }>,
  currentKey: ReportMonthKey = getCurrentMonthKey()
): ReportMonthKey[] {
  const keys = new Set<ReportMonthKey>();
  keys.add(currentKey);

  for (const entry of dataMonths) {
    const year = Number(entry.year);
    const month = Number(entry.month);
    if (!Number.isFinite(year) || !Number.isFinite(month)) continue;
    if (year < 2000 || year > 2100) continue;
    if (month < 1 || month > 12) continue;
    keys.add(toMonthKey(year, month));
  }

  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

export function isMonthlyReportSubmitted(row: {
  status?: string | null;
  submitted_at?: string | null;
  locked_at?: string | null;
}): boolean {
  const status = String(row.status ?? "").toLowerCase().trim();
  const hasSubmittedAt = typeof row.submitted_at === "string" && row.submitted_at.trim().length > 0;
  if (hasSubmittedAt) return true;
  if (["submitted", "approved", "finalized", "pending_review"].includes(status)) return true;
  // locked_at must not make a report count as unsubmitted
  const hasLockedAt = typeof row.locked_at === "string" && row.locked_at.trim().length > 0;
  if (hasLockedAt || status === "locked") return true;
  return false;
}

export function isMonthlyReportLocked(row: {
  status?: string | null;
  locked_at?: string | null;
}): boolean {
  const status = String(row.status ?? "").toLowerCase().trim();
  const hasLockedAt = typeof row.locked_at === "string" && row.locked_at.trim().length > 0;
  return hasLockedAt || ["locked", "approved", "finalized"].includes(status);
}
