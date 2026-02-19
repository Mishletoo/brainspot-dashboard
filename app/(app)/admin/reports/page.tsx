"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EditRequest, MonthlyReport, TimeEntry } from "@/components/reports/types";
import {
  approveEditRequest,
  denyEditRequest,
  formatMonthKey,
  loadEditRequests,
  loadEntries,
  loadReports,
} from "@/components/reports/storage";
import { loadAuth } from "@/components/auth/storage";
import { loadEmployees } from "@/components/employees/storage";
import { RequireRole } from "@/components/auth/RequireRole";
import type { Employee } from "@/components/employees/types";

type Tab = "reports" | "edit-requests";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: MonthlyReport["status"] }) {
  if (status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
        Submitted
      </span>
    );
  }
  if (status === "UNLOCKED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/10 px-2.5 py-1 text-xs font-medium text-lime-300">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
        Unlocked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/40 px-2.5 py-1 text-xs font-medium text-zinc-500">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
      Open
    </span>
  );
}

// ─── Deny Reason Modal ────────────────────────────────────────────────────────

function DenyModal({
  request,
  employeeName,
  monthLabel,
  onConfirm,
  onClose,
}: {
  request: EditRequest;
  employeeName: string;
  monthLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
        <div className="px-6 py-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5 text-zinc-400"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-zinc-100">
            Deny edit request
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Denying request from{" "}
            <span className="font-medium text-zinc-200">{employeeName}</span>{" "}
            for{" "}
            <span className="font-medium text-zinc-200">{monthLabel}</span>.
            The report will remain locked.
          </p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              Reason{" "}
              <span className="font-normal text-zinc-600">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Deadlines already passed for this period…"
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-zinc-500 focus:ring-0"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            className="rounded-xl bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-600"
          >
            Deny Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Requests Panel ──────────────────────────────────────────────────────

function EditRequestsPanel({
  editRequests,
  reports,
  employeeMap,
  adminId,
  onRefresh,
}: {
  editRequests: EditRequest[];
  reports: MonthlyReport[];
  employeeMap: Map<string, string>;
  adminId: string;
  onRefresh: () => void;
}) {
  const [denyTarget, setDenyTarget] = useState<EditRequest | null>(null);

  const reportMap = useMemo(() => {
    const m = new Map<string, MonthlyReport>();
    reports.forEach((r) => m.set(r.id, r));
    return m;
  }, [reports]);

  const pending = useMemo(
    () =>
      [...editRequests]
        .filter((r) => r.status === "PENDING")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [editRequests]
  );

  const handleApprove = (request: EditRequest) => {
    approveEditRequest(request.id, adminId);
    onRefresh();
  };

  const handleDenyConfirm = (reason: string) => {
    if (!denyTarget) return;
    denyEditRequest(denyTarget.id, adminId, reason || undefined);
    setDenyTarget(null);
    onRefresh();
  };

  const getMonthLabel = (req: EditRequest) => {
    if (req.monthKey) return formatMonthKey(req.monthKey);
    const report = reportMap.get(req.reportId);
    return report ? formatMonthKey(report.monthKey) : "—";
  };

  if (pending.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700/60 bg-[#1c212b]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-6 w-6 text-zinc-500"
            >
              <path d="M9 12l2 2 4-4" />
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">
            No pending edit requests
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Requests from employees will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Month
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Requested
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Report Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {pending.map((req) => {
                const report = reportMap.get(req.reportId);
                return (
                  <tr key={req.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-zinc-100">
                      {employeeMap.get(req.employeeId) ?? req.employeeId}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {getMonthLabel(req)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDateTime(req.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {report ? (
                        <StatusBadge status={report.status} />
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          className="flex items-center gap-1.5 rounded-lg bg-lime-400/10 px-3 py-1.5 text-xs font-semibold text-lime-300 transition hover:bg-lime-400/20 hover:text-lime-200"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            className="h-3 w-3"
                          >
                            <path d="M9 12l2 2 4-4" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setDenyTarget(req)}
                          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            className="h-3 w-3"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {denyTarget && (
        <DenyModal
          request={denyTarget}
          employeeName={
            employeeMap.get(denyTarget.employeeId) ?? denyTarget.employeeId
          }
          monthLabel={getMonthLabel(denyTarget)}
          onConfirm={handleDenyConfirm}
          onClose={() => setDenyTarget(null)}
        />
      )}
    </>
  );
}

// ─── Reports Panel ────────────────────────────────────────────────────────────

function ReportsPanel({
  reports,
  entries,
  employeeMap,
}: {
  reports: MonthlyReport[];
  entries: TimeEntry[];
  employeeMap: Map<string, string>;
}) {
  const sorted = useMemo(
    () =>
      [...reports].sort((a, b) => {
        if (a.status === "SUBMITTED" && b.status !== "SUBMITTED") return -1;
        if (b.status === "SUBMITTED" && a.status !== "SUBMITTED") return 1;
        return b.monthKey.localeCompare(a.monthKey);
      }),
    [reports]
  );

  const entryCountMap = useMemo(() => {
    const map = new Map<string, { count: number; hours: number }>();
    entries.forEach((e) => {
      const prev = map.get(e.reportId) ?? { count: 0, hours: 0 };
      map.set(e.reportId, {
        count: prev.count + 1,
        hours: prev.hours + e.hours,
      });
    });
    return map;
  }, [entries]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700/60 bg-[#1c212b]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-6 w-6 text-zinc-500"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
              <path d="M2 20h20" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">No reports yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Reports will appear here once employees submit them.
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
                Employee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Month
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Entries
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Total Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Submitted
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sorted.map((report) => {
              const stats = entryCountMap.get(report.id) ?? {
                count: 0,
                hours: 0,
              };
              const h = stats.hours;
              return (
                <tr
                  key={report.id}
                  className="transition hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium text-zinc-100">
                    {employeeMap.get(report.employeeId) ?? report.employeeId}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatMonthKey(report.monthKey)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                    {stats.count}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-lime-400">
                    {h % 1 === 0 ? h.toFixed(0) : h.toFixed(2)}h
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {report.submittedAt ? (
                      formatDate(report.submittedAt)
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function AdminReportsContent() {
  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [adminId, setAdminId] = useState("");

  const load = useCallback(() => {
    setReports(loadReports());
    setEntries(loadEntries());
    setEmployees(loadEmployees());
    setEditRequests(loadEditRequests());
  }, []);

  useEffect(() => {
    const auth = loadAuth();
    setAdminId(auth?.employeeId ?? "");
    load();
  }, [load]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e.id, e.fullName));
    return map;
  }, [employees]);

  const pendingCount = useMemo(
    () => editRequests.filter((r) => r.status === "PENDING").length,
    [editRequests]
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
      {/* Header */}
      <div className="flex items-start justify-between px-1 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-100">Reports</h1>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
              Admin
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            Manage employee monthly reports and edit requests.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-1">
        <button
          type="button"
          onClick={() => setTab("reports")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "reports"
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          All Reports
        </button>
        <button
          type="button"
          onClick={() => setTab("edit-requests")}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "edit-requests"
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Edit Requests
          {pendingCount > 0 && (
            <span
              className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold leading-none ${
                tab === "edit-requests"
                  ? "bg-lime-400 text-zinc-900"
                  : "bg-lime-400/20 text-lime-300"
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel */}
      {tab === "reports" ? (
        <ReportsPanel
          reports={reports}
          entries={entries}
          employeeMap={employeeMap}
        />
      ) : (
        <EditRequestsPanel
          editRequests={editRequests}
          reports={reports}
          employeeMap={employeeMap}
          adminId={adminId}
          onRefresh={load}
        />
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <RequireRole requiredRole="ADMIN">
      <AdminReportsContent />
    </RequireRole>
  );
}
