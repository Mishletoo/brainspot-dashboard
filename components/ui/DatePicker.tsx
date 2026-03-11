"use client";

import { useEffect, useRef, useState } from "react";

/** Always { start, end }. end is "" when only one date selected. */
export type DatePickerValue = { start: string; end: string };

export interface DatePickerProps {
  value: DatePickerValue;
  onChange: (value: DatePickerValue) => void;
  placeholder?: string;
  className?: string;
  locale?: string;
  min?: string;
  max?: string;
}

const WEEKDAY_LABELS: string[] = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISO(iso: string): Date | null {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(iso: string, locale: string): string {
  const d = parseISO(iso);
  if (!d) return "";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDisplayText(value: DatePickerValue, locale: string, placeholder: string): string {
  const { start, end } = value;
  if (!start && !end) return placeholder;
  if (start && end && start !== end) return `${formatDisplay(start, locale)} – ${formatDisplay(end, locale)}`;
  if (start) return formatDisplay(start, locale);
  if (end) return formatDisplay(end, locale);
  return placeholder;
}

function getCalendarDays(year: number, month: number): { date: number; iso: string; isCurrentMonth: boolean; isToday: boolean }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekday = first.getDay();
  const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const daysInMonth = last.getDate();
  const today = toLocalISO(new Date());

  const result: { date: number; iso: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
  const totalCells = 42;

  for (let i = 0; i < totalCells; i++) {
    const dayIndex = i - startOffset + 1;
    if (dayIndex <= 0) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const prevLast = new Date(prevYear, prevMonth + 1, 0);
      const d = prevLast.getDate() + dayIndex;
      const date = new Date(prevYear, prevMonth, d);
      result.push({
        date: d,
        iso: toLocalISO(date),
        isCurrentMonth: false,
        isToday: toLocalISO(date) === today,
      });
    } else if (dayIndex > daysInMonth) {
      const nextDay = dayIndex - daysInMonth;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const date = new Date(nextYear, nextMonth, nextDay);
      result.push({
        date: nextDay,
        iso: toLocalISO(date),
        isCurrentMonth: false,
        isToday: toLocalISO(date) === today,
      });
    } else {
      const date = new Date(year, month, dayIndex);
      const iso = toLocalISO(date);
      result.push({
        date: dayIndex,
        iso,
        isCurrentMonth: true,
        isToday: iso === today,
      });
    }
  }
  return result;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Избери дата",
  className = "",
  locale = "bg-BG",
  min,
  max,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [rangePhase, setRangePhase] = useState<"start" | "end">("start");
  const [rangeDraft, setRangeDraft] = useState<DatePickerValue>({ start: "", end: "" });

  const viewFromValue = value.start || value.end;
  const [viewYear, setViewYear] = useState(() => {
    const d = viewFromValue ? parseISO(viewFromValue) : new Date();
    return (d || new Date()).getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = viewFromValue ? parseISO(viewFromValue) : new Date();
    return (d || new Date()).getMonth();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewFromValue) {
      const d = parseISO(viewFromValue);
      if (d) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [viewFromValue]);

  useEffect(() => {
    if (!open) return;
    setRangePhase("start");
    setRangeDraft({ start: value.start, end: value.end });
  }, [open, value.start, value.end]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (rangeDraft.start && !rangeDraft.end) {
          onChange({ start: rangeDraft.start, end: "" });
        }
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, rangeDraft.start, rangeDraft.end, onChange]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const days = getCalendarDays(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isDisabled = (iso: string) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const r = open ? rangeDraft : value;
  const isSelected = (iso: string) => r.start === iso || r.end === iso;
  const isInRange = (iso: string) => {
    if (!r.start || !r.end) return false;
    const [s, e] = r.start <= r.end ? [r.start, r.end] : [r.end, r.start];
    return iso >= s && iso <= e && iso !== s && iso !== e;
  };

  const handleSelect = (iso: string) => {
    if (isDisabled(iso)) return;
    if (rangePhase === "start") {
      setRangeDraft({ start: iso, end: "" });
      setRangePhase("end");
      return;
    }
    const start = rangeDraft.start;
    const end = iso;
    onChange({ start: start <= end ? start : end, end: start <= end ? end : start });
    setOpen(false);
  };

  const displayText = getDisplayText(value, locale, placeholder);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-100 outline-none transition-[border-color,background-color] duration-150 hover:border-zinc-600 hover:bg-zinc-900/80 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={placeholder}
      >
        <span className={displayText !== placeholder ? "text-zinc-100" : "text-zinc-500"}>{displayText}</span>
        <span className="ml-auto flex shrink-0 text-zinc-500">
          <CalendarIcon />
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[280px] rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-xl shadow-black/20"
          role="dialog"
          aria-modal="true"
          aria-label="Календар"
        >
          <div className="p-3">
            <p className="mb-2 text-xs text-zinc-500">
              {rangePhase === "start" ? "Избери начална дата" : "Избери крайна дата (или същата за един ден)"}
            </p>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Предишен месец"
              >
                <ChevronLeft />
              </button>
              <span className="text-sm font-medium text-zinc-200">{monthLabel}</span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Следващ месец"
              >
                <ChevronRight />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1.5 font-medium text-zinc-500">
                  {label}
                </div>
              ))}
              {days.map((cell) => {
                const disabled = isDisabled(cell.iso);
                const selected = isSelected(cell.iso);
                const inRange = isInRange(cell.iso);
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelect(cell.iso)}
                    className={`rounded-xl py-2 text-sm transition-colors ${
                      disabled
                        ? "cursor-not-allowed text-zinc-600"
                        : cell.isCurrentMonth
                          ? "text-zinc-200 hover:bg-zinc-700/60 hover:text-white"
                          : "text-zinc-500 hover:bg-zinc-800/50"
                    } ${inRange ? "bg-zinc-700/70 text-zinc-200" : ""} ${selected ? "bg-zinc-600 text-white hover:bg-zinc-500 hover:text-white" : ""} ${cell.isToday && !selected ? "font-semibold text-sky-400" : ""}`}
                  >
                    {cell.date}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
