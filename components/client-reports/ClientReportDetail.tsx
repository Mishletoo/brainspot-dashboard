"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMonthKey } from "@/components/reports/storage";
import type { ClientMonthDetail } from "./types";

function fmtHours(h: number): string {
  return h % 1 === 0 ? h.toFixed(0) : h.toFixed(2);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-[#1c212b] px-5 py-4 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums ${
          accent ? "text-lime-400" : "text-zinc-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTable({
  title,
  icon,
  headers,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  headers: string[];
  rows: Array<{ key: string; cells: React.ReactNode[] }>;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <span className="text-zinc-500">{icon}</span>
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <span className="ml-auto rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
          {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/60">
              {headers.map((h) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 ${
                    h === "Hours" ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {rows.map(({ key, cells }) => (
              <tr key={key} className="transition hover:bg-white/[0.02]">
                {cells.map((cell, i) => (
                  <td
                    key={i}
                    className={`px-4 py-2.5 ${
                      headers[i] === "Hours"
                        ? "text-right font-mono font-semibold text-lime-400"
                        : "text-zinc-300"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Props {
  detail: ClientMonthDetail;
  monthKey: string;
  onMonthChange: (m: string) => void;
}

export function ClientReportDetail({ detail, monthKey, onMonthChange }: Props) {
  const [showEntries, setShowEntries] = useState(false);

  const { client, totalHours, employeeCount, serviceCount, taskCount } = detail;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
      {/* Back + Header */}
      <div className="flex items-start justify-between px-1 pt-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              href={`/admin/client-reports?month=${monthKey}`}
              className="flex items-center gap-1 text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-3.5 w-3.5"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Client Reports
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-100">{client.name}</h1>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            {formatMonthKey(monthKey)}
            {client.company && ` · ${client.company}`}
          </p>
        </div>

        {/* Month picker */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Month
          </label>
          <input
            type="month"
            value={monthKey}
            onChange={(e) => onMonthChange(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm font-medium text-zinc-100 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/30 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Hours" value={`${fmtHours(totalHours)}h`} accent />
        <KpiCard label="Employees" value={String(employeeCount)} />
        <KpiCard label="Services" value={String(serviceCount)} />
        <KpiCard label="Tasks" value={String(taskCount)} />
      </div>

      {detail.entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700/60 bg-[#1c212b] py-16">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-6 w-6 text-zinc-500"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-400">No entries for this month</p>
            <p className="mt-1 text-xs text-zinc-600">
              No time was logged for this client in {formatMonthKey(monthKey)}.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Hours by Employee */}
          <SectionTable
            title="Hours by Employee"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
              </svg>
            }
            headers={["Employee", "Hours"]}
            rows={detail.byEmployee.map((row) => ({
              key: row.employeeId,
              cells: [row.employeeName, `${fmtHours(row.hours)}h`],
            }))}
          />

          {/* Hours by Service */}
          <SectionTable
            title="Hours by Service"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            }
            headers={["Service", "Hours"]}
            rows={detail.byService.map((row) => ({
              key: row.serviceId,
              cells: [row.serviceName, `${fmtHours(row.hours)}h`],
            }))}
          />

          {/* Hours by Task */}
          <SectionTable
            title="Hours by Task"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
            headers={["Task", "Hours"]}
            rows={detail.byTask.map((row) => ({
              key: row.taskId,
              cells: [row.taskName, `${fmtHours(row.hours)}h`],
            }))}
          />

          {/* Entries toggle */}
          <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl">
            <button
              onClick={() => setShowEntries((v) => !v)}
              className="flex w-full items-center gap-2 border-b border-zinc-800 px-4 py-3 transition hover:bg-white/[0.02]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-4 w-4 text-zinc-500"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
                <path d="M2 20h20" />
              </svg>
              <h3 className="text-sm font-semibold text-zinc-200">All Entries</h3>
              <span className="ml-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {detail.entries.length}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`ml-auto h-4 w-4 text-zinc-500 transition-transform ${showEntries ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showEntries && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      {["Date", "Employee", "Service", "Task", "Hours", "Notes"].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 ${
                            h === "Hours" ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {detail.entries.map((entry) => (
                      <tr key={entry.id} className="transition hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-4 py-2.5 text-zinc-400">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-300">{entry.employeeName}</td>
                        <td className="px-4 py-2.5 text-zinc-300">{entry.serviceName}</td>
                        <td className="px-4 py-2.5 text-zinc-300">{entry.taskName}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-lime-400">
                          {fmtHours(entry.hours)}h
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-2.5 text-zinc-500">
                          {entry.notes ?? <span className="text-zinc-700">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
