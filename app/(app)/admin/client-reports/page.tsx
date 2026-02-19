"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RequireRole } from "@/components/auth/RequireRole";
import { ClientReportsMonthPicker } from "@/components/client-reports/ClientReportsMonthPicker";
import { ClientReportsTable } from "@/components/client-reports/ClientReportsTable";
import { buildClientMonthRows } from "@/components/client-reports/selectors";
import { getCurrentMonthKey, loadReports, loadEntries } from "@/components/reports/storage";
import { loadClients } from "@/components/clients/storage";
import { loadEmployees } from "@/components/employees/storage";
import { loadServices } from "@/components/services/storage";

function ClientReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [monthKey, setMonthKey] = useState<string>(
    searchParams.get("month") ?? getCurrentMonthKey()
  );

  const [clients, setClients] = useState(() => loadClients());
  const [reports, setReports] = useState(() => loadReports());
  const [entries, setEntries] = useState(() => loadEntries());
  const [services, setServices] = useState(() => loadServices());

  useEffect(() => {
    setClients(loadClients());
    setReports(loadReports());
    setEntries(loadEntries());
    setServices(loadServices());
  }, []);

  function handleMonthChange(m: string) {
    setMonthKey(m);
    router.replace(`/admin/client-reports?month=${m}`, { scroll: false });
  }

  const rows = useMemo(
    () => buildClientMonthRows(monthKey, clients, reports, entries, services),
    [monthKey, clients, reports, entries, services]
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
      {/* Header */}
      <div className="flex items-start justify-between px-1 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-100">Client Reports</h1>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
              Admin
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            Aggregated hours per client across all employees.
          </p>
        </div>
        <ClientReportsMonthPicker value={monthKey} onChange={handleMonthChange} />
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 px-1">
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#1c212b] px-3 py-1.5">
          <span className="text-xs text-zinc-500">Clients with hours:</span>
          <span className="text-sm font-semibold text-zinc-100">
            {rows.filter((r) => r.totalHours > 0).length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#1c212b] px-3 py-1.5">
          <span className="text-xs text-zinc-500">Total hours logged:</span>
          <span className="text-sm font-semibold text-lime-400">
            {(() => {
              const total = rows.reduce((s, r) => s + r.totalHours, 0);
              return total % 1 === 0 ? `${total}h` : `${total.toFixed(2)}h`;
            })()}
          </span>
        </div>
      </div>

      {/* Table */}
      <ClientReportsTable rows={rows} monthKey={monthKey} />
    </div>
  );
}

export default function AdminClientReportsPage() {
  return (
    <RequireRole requiredRole="ADMIN">
      <ClientReportsContent />
    </RequireRole>
  );
}
