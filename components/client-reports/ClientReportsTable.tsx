"use client";

import Link from "next/link";
import type { ClientMonthRow } from "./types";

function fmtHours(h: number): string {
  return h % 1 === 0 ? h.toFixed(0) : h.toFixed(2);
}

interface Props {
  rows: ClientMonthRow[];
  monthKey: string;
}

export function ClientReportsTable({ rows, monthKey }: Props) {
  const hasData = rows.some((r) => r.totalHours > 0);

  if (!hasData) {
    return (
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
            Try selecting a different month or ask employees to submit their reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Client
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Total Hours
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Employees
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Top Services
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map(({ client, totalHours, employeeCount, topServices }) => (
              <tr
                key={client.id}
                className="transition hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-100">{client.name}</p>
                  {client.company && (
                    <p className="text-xs text-zinc-500">{client.company}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-lime-400">
                  {totalHours > 0 ? `${fmtHours(totalHours)}h` : (
                    <span className="font-normal text-zinc-700">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                  {employeeCount > 0 ? employeeCount : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {topServices.length === 0 ? (
                    <span className="text-zinc-700">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {topServices.map((s) => (
                        <span
                          key={`${client.id}-${s.serviceName}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
                        >
                          {s.serviceName}
                          <span className="font-mono text-zinc-500">{fmtHours(s.hours)}h</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/client-reports/${client.id}?month=${monthKey}`}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
