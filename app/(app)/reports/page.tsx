"use client";

import { useEffect, useMemo, useState } from "react";
import type { Client } from "@/components/clients/types";
import type { Service } from "@/components/services/types";
import type { Task } from "@/components/tasks/types";
import type { ClientService } from "@/components/client-services/types";
import { loadClients } from "@/components/clients/storage";
import { loadServices } from "@/components/services/storage";
import { loadTasks } from "@/components/tasks/storage";
import { loadClientServices } from "@/components/client-services/storage";
import type { MonthlyReport, TimeEntry } from "@/components/reports/types";
import {
  createEditRequestRecord,
  createEntryRecord,
  createReportRecord,
  formatMonthKey,
  getCurrentMonthKey,
  loadEditRequests,
  loadEntries,
  loadReports,
  saveEditRequests,
  saveEntries,
  saveReports,
} from "@/components/reports/storage";
import { loadAuth } from "@/components/auth/storage";
import { loadEmployees } from "@/components/employees/storage";
import ReportMonthPicker from "@/components/reports/ReportMonthPicker";
import TimeEntryForm from "@/components/reports/TimeEntryForm";
import TimeEntryTable from "@/components/reports/TimeEntryTable";
import TimeEntryModal from "@/components/reports/TimeEntryModal";
import SubmitConfirmModal from "@/components/reports/SubmitConfirmModal";
import EmptyStateHints from "@/components/reports/EmptyStateHints";

type ModalState =
  | { type: "none" }
  | { type: "edit"; entry: TimeEntry }
  | { type: "delete"; entry: TimeEntry }
  | { type: "submit" };

type EntryFormData = Omit<TimeEntry, "id" | "reportId" | "employeeId" | "createdAt">;

function StatusBadge({ status }: { status: MonthlyReport["status"] }) {
  if (status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/40 px-2.5 py-1 text-xs font-medium text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
        Open
      </span>
    );
  }
  if (status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
        Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/60 px-2.5 py-1 text-xs font-medium text-zinc-400">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      Unlocked
    </span>
  );
}

export default function ReportsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientServices, setClientServices] = useState<ClientService[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [editRequestPending, setEditRequestPending] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);

  // Load all data on mount
  useEffect(() => {
    const auth = loadAuth();
    const currentEmployeeId = auth?.employeeId ?? null;
    setEmployeeId(currentEmployeeId);

    if (currentEmployeeId) {
      const employees = loadEmployees();
      const emp = employees.find((e) => e.id === currentEmployeeId);
      setEmployeeName(emp?.fullName ?? auth?.email ?? "");
    }

    setClients(loadClients());
    setServices(loadServices());
    setTasks(loadTasks());
    setClientServices(loadClientServices());

    if (!currentEmployeeId) return;

    const loadedReports = loadReports();
    const loadedEntries = loadEntries();

    // Auto-create an OPEN report for current month if none exists
    const existingCurrent = loadedReports.find(
      (r) => r.employeeId === currentEmployeeId && r.monthKey === currentMonthKey
    );
    if (!existingCurrent) {
      const newReport = createReportRecord({
        employeeId: currentEmployeeId,
        monthKey: currentMonthKey,
        status: "OPEN",
      });
      const updated = [...loadedReports, newReport];
      saveReports(updated);
      setReports(updated);
    } else {
      setReports(loadedReports);
    }

    setEntries(loadedEntries);

    // Check if there's a pending edit request for the current report
    const editRequests = loadEditRequests();
    const hasPending = editRequests.some(
      (r) => r.employeeId === currentEmployeeId && r.status === "PENDING"
    );
    setEditRequestPending(hasPending);
  }, [currentMonthKey]);

  // The months available to select: current month + any past months with reports
  const availableMonths = useMemo(() => {
    if (!employeeId) return [currentMonthKey];
    const monthSet = new Set<string>([currentMonthKey]);
    reports
      .filter((r) => r.employeeId === employeeId)
      .forEach((r) => monthSet.add(r.monthKey));
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [reports, currentMonthKey, employeeId]);

  const selectedReport = useMemo(
    () =>
      employeeId
        ? reports.find(
            (r) => r.employeeId === employeeId && r.monthKey === selectedMonthKey
          )
        : undefined,
    [reports, selectedMonthKey, employeeId]
  );

  const reportEntries = useMemo(
    () => (selectedReport ? entries.filter((e) => e.reportId === selectedReport.id) : []),
    [entries, selectedReport]
  );

  const isLocked = selectedReport?.status === "SUBMITTED";
  const isEditable =
    selectedReport?.status === "OPEN" || selectedReport?.status === "UNLOCKED";

  const totalHours = reportEntries.reduce((sum, e) => sum + e.hours, 0);

  // ─── Persist helpers ───────────────────────────────────────────────────────

  const persistReports = (updated: MonthlyReport[]) => {
    setReports(updated);
    saveReports(updated);
  };

  const persistEntries = (updated: TimeEntry[]) => {
    setEntries(updated);
    saveEntries(updated);
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAddEntry = (data: EntryFormData) => {
    if (!selectedReport || !employeeId) return;
    const newEntry = createEntryRecord({
      ...data,
      reportId: selectedReport.id,
      employeeId,
    });
    persistEntries([...entries, newEntry]);
  };

  const handleEditSave = (data: EntryFormData) => {
    if (modal.type !== "edit") return;
    const updated = entries.map((e) =>
      e.id === modal.entry.id ? { ...modal.entry, ...data } : e
    );
    persistEntries(updated);
    setModal({ type: "none" });
  };

  const handleDeleteConfirm = () => {
    if (modal.type !== "delete") return;
    persistEntries(entries.filter((e) => e.id !== modal.entry.id));
    setModal({ type: "none" });
  };

  const handleSubmitReport = () => {
    if (!selectedReport) return;
    const updated = reports.map((r) =>
      r.id === selectedReport.id
        ? { ...r, status: "SUBMITTED" as const, submittedAt: new Date().toISOString() }
        : r
    );
    persistReports(updated);
    setModal({ type: "none" });
  };

  const handleRequestEdit = () => {
    if (!selectedReport || !employeeId) return;
    const editRequests = loadEditRequests();
    const alreadyPending = editRequests.some(
      (r) =>
        r.reportId === selectedReport.id &&
        r.employeeId === employeeId &&
        r.status === "PENDING"
    );
    if (alreadyPending) {
      setEditRequestPending(true);
      return;
    }
    const newRequest = createEditRequestRecord({
      reportId: selectedReport.id,
      employeeId,
      monthKey: selectedReport.monthKey,
      status: "PENDING",
    });
    saveEditRequests([...editRequests, newRequest]);
    setEditRequestPending(true);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-1 pt-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Monthly Reports</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Logged as{" "}
            <span className="font-medium text-zinc-300">{employeeName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ReportMonthPicker
            months={availableMonths}
            selectedMonth={selectedMonthKey}
            onChange={setSelectedMonthKey}
          />

          {selectedReport && (
            <StatusBadge status={selectedReport.status} />
          )}

          {isEditable && reportEntries.length > 0 && (
            <button
              onClick={() => setModal({ type: "submit" })}
              className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="h-3.5 w-3.5"
              >
                <path d="M9 12l2 2 4-4" />
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
              </svg>
              Submit Report
            </button>
          )}

          {isLocked && (
            <button
              onClick={handleRequestEdit}
              disabled={editRequestPending}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editRequestPending ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5 text-zinc-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Edit Requested
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Request Edit
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── Submitted banner ─────────────────────────────────────────────── */}
      {isLocked && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-700/60 bg-zinc-800/30 px-4 py-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-5 w-5 flex-shrink-0 text-zinc-400"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">
              This report has been submitted
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {selectedReport?.submittedAt
                ? `Submitted on ${new Date(selectedReport.submittedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}`
                : "Editing is locked. Use \u201cRequest Edit\u201d to ask an admin to unlock it."}
            </p>
          </div>
        </div>
      )}

      {/* ─── Add Time Entry Form ──────────────────────────────────────────── */}
      {isEditable && (
        <TimeEntryForm
          clients={clients}
          clientServices={clientServices}
          services={services}
          tasks={tasks}
          onAdd={handleAddEntry}
          disabled={false}
        />
      )}

      {/* ─── Entries section ──────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-zinc-300">
            Time Entries
            {reportEntries.length > 0 && (
              <span className="ml-2 rounded-lg bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {reportEntries.length}
              </span>
            )}
          </h2>
          {reportEntries.length > 0 && (
            <p className="text-sm text-zinc-500">
              Total:{" "}
              <span className="font-mono font-semibold text-lime-400">
                {totalHours % 1 === 0
                  ? totalHours.toFixed(0)
                  : totalHours.toFixed(2)}
                h
              </span>
            </p>
          )}
        </div>

        {reportEntries.length === 0 ? (
          <EmptyStateHints variant="no-entries" />
        ) : (
          <TimeEntryTable
            entries={reportEntries}
            clients={clients}
            services={services}
            tasks={tasks}
            clientServices={clientServices}
            isLocked={isLocked}
            onEdit={(entry) => setModal({ type: "edit", entry })}
            onDelete={(entry) => setModal({ type: "delete", entry })}
          />
        )}
      </div>

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      {modal.type === "edit" && (
        <TimeEntryModal
          entry={modal.entry}
          clients={clients}
          clientServices={clientServices}
          services={services}
          tasks={tasks}
          onClose={() => setModal({ type: "none" })}
          onSave={handleEditSave}
        />
      )}

      {modal.type === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
            <div className="px-6 py-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="h-5 w-5 text-zinc-400"
                >
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-zinc-100">Delete entry</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Are you sure you want to remove this time entry? This action
                cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setModal({ type: "none" })}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.type === "submit" && selectedReport && (
        <SubmitConfirmModal
          monthLabel={formatMonthKey(selectedMonthKey)}
          totalHours={totalHours}
          onClose={() => setModal({ type: "none" })}
          onConfirm={handleSubmitReport}
        />
      )}
    </div>
  );
}
