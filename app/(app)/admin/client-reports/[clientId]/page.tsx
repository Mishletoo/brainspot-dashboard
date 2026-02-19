"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ClientReportDetail } from "@/components/client-reports/ClientReportDetail";
import { buildClientMonthDetail } from "@/components/client-reports/selectors";
import { getCurrentMonthKey, loadReports, loadEntries } from "@/components/reports/storage";
import { loadClients } from "@/components/clients/storage";
import { loadEmployees } from "@/components/employees/storage";
import { loadServices } from "@/components/services/storage";
import { loadTasks } from "@/components/tasks/storage";
import Link from "next/link";

function ClientReportDetailContent() {
  const { clientId } = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [monthKey, setMonthKey] = useState<string>(
    searchParams.get("month") ?? getCurrentMonthKey()
  );

  const [clients, setClients] = useState(() => loadClients());
  const [reports, setReports] = useState(() => loadReports());
  const [entries, setEntries] = useState(() => loadEntries());
  const [employees, setEmployees] = useState(() => loadEmployees());
  const [services, setServices] = useState(() => loadServices());
  const [tasks, setTasks] = useState(() => loadTasks());

  useEffect(() => {
    setClients(loadClients());
    setReports(loadReports());
    setEntries(loadEntries());
    setEmployees(loadEmployees());
    setServices(loadServices());
    setTasks(loadTasks());
  }, []);

  function handleMonthChange(m: string) {
    setMonthKey(m);
    router.replace(`/admin/client-reports/${clientId}?month=${m}`, {
      scroll: false,
    });
  }

  const detail = useMemo(
    () =>
      buildClientMonthDetail(
        clientId,
        monthKey,
        clients,
        reports,
        entries,
        employees,
        services,
        tasks
      ),
    [clientId, monthKey, clients, reports, entries, employees, services, tasks]
  );

  if (!detail) {
    return (
      <div className="flex h-full flex-col gap-4 p-2">
        <div className="px-1 pt-2">
          <Link
            href="/admin/client-reports"
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
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-[#1c212b]">
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-400">Client not found</p>
            <p className="mt-1 text-xs text-zinc-600">
              The client ID <code className="text-zinc-500">{clientId}</code> does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientReportDetail
      detail={detail}
      monthKey={monthKey}
      onMonthChange={handleMonthChange}
    />
  );
}

export default function AdminClientReportDetailPage() {
  return (
    <RequireAuth requiredRole="ADMIN">
      <ClientReportDetailContent />
    </RequireAuth>
  );
}
