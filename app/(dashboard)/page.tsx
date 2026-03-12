"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ExpiringContract = {
  id: string;
  contract_name: string;
  end_date: string;
  client_name: string;
  days_left: number;
};

type SummaryMetrics = {
  activeClients: number;
  activeContracts: number;
  unpaidInvoices: number;
  overdueInvoices: number;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}.${month}.${year}`;
}

function getStatusClasses(daysLeft: number) {
  if (daysLeft <= 30) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (daysLeft <= 60) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export default function Home() {
  const [contracts, setContracts] = useState<ExpiringContract[]>([]);
  const [metrics, setMetrics] = useState<SummaryMetrics>({
    activeClients: 0,
    activeContracts: 0,
    unpaidInvoices: 0,
    overdueInvoices: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 60);

      const todayString = today.toISOString().split("T")[0];
      const maxDateString = maxDate.toISOString().split("T")[0];

      const [
        activeClientsResult,
        activeContractsResult,
        unpaidInvoicesResult,
        overdueInvoicesResult,
        expiringContractsResult,
      ] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase
          .from("contracts")
          .select("*", { count: "exact", head: true })
          .or(`end_date.is.null,end_date.gte.${todayString}`),
        supabase.from("invoices").select("*", { count: "exact", head: true }).neq("status", "paid"),
        supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .neq("status", "paid")
          .lt("due_date", todayString),
        supabase
          .from("contracts")
          .select("id, contract_name, end_date, clients(name)")
          .not("end_date", "is", null)
          .gte("end_date", todayString)
          .lte("end_date", maxDateString)
          .order("end_date", { ascending: true }),
      ]);

      if (
        activeClientsResult.error ||
        activeContractsResult.error ||
        unpaidInvoicesResult.error ||
        overdueInvoicesResult.error ||
        expiringContractsResult.error
      ) {
        setErrorMessage("Could not load dashboard data. Please refresh and try again.");
        setMetrics({
          activeClients: 0,
          activeContracts: 0,
          unpaidInvoices: 0,
          overdueInvoices: 0,
        });
        setContracts([]);
        setIsLoading(false);
        return;
      }

      setMetrics({
        activeClients: activeClientsResult.count ?? 0,
        activeContracts: activeContractsResult.count ?? 0,
        unpaidInvoices: unpaidInvoicesResult.count ?? 0,
        overdueInvoices: overdueInvoicesResult.count ?? 0,
      });

      const mappedContracts: ExpiringContract[] = (expiringContractsResult.data ?? []).map((item: any) => {
        const endDate = new Date(item.end_date);
        endDate.setHours(0, 0, 0, 0);

        const millisecondsDiff = endDate.getTime() - today.getTime();
        const daysLeft = Math.round(millisecondsDiff / (1000 * 60 * 60 * 24));

        return {
          id: item.id,
          contract_name: item.contract_name,
          end_date: item.end_date,
          client_name: item.clients?.name ?? "-",
          days_left: daysLeft,
        };
      });

      setContracts(mappedContracts);
      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">Welcome to Brainspot Dashboard.</p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-zinc-100 sm:grid-cols-4">
          <Link
            href="/clients"
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-zinc-50 sm:py-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Active clients
            </p>
            <p className="text-lg font-semibold tabular-nums text-zinc-900">
              {isLoading ? "—" : metrics.activeClients}
            </p>
          </Link>
          <Link
            href="/contracts"
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-zinc-50 sm:py-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Active contracts
            </p>
            <p className="text-lg font-semibold tabular-nums text-zinc-900">
              {isLoading ? "—" : metrics.activeContracts}
            </p>
          </Link>
          <Link
            href="/invoices"
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-zinc-50 sm:py-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Unpaid invoices
            </p>
            <p className="text-lg font-semibold tabular-nums text-zinc-900">
              {isLoading ? "—" : metrics.unpaidInvoices}
            </p>
          </Link>
          <Link
            href="/invoices"
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center transition-colors hover:bg-zinc-50 sm:py-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Overdue invoices
            </p>
            <p className="text-lg font-semibold tabular-nums text-zinc-900">
              {isLoading ? "—" : metrics.overdueInvoices}
            </p>
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Contracts expiring soon</h2>
          <Link
            href="/contracts"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700"
          >
            View all
          </Link>
        </div>

        {isLoading && <div className="p-4 text-sm text-zinc-600">Loading contracts...</div>}

        {!isLoading && errorMessage && <div className="p-4 text-sm text-red-700">{errorMessage}</div>}

        {!isLoading && !errorMessage && contracts.length === 0 && (
          <EmptyState
            title="No contracts expiring soon"
            description="Contracts ending in the next 60 days will appear here. Add a contract to get started."
            actionHref="/contracts/add"
            actionLabel="Add contract"
            variant="compact"
          />
        )}

        {!isLoading && !errorMessage && contracts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Client name</th>
                  <th className="px-4 py-3 font-medium">Contract name</th>
                  <th className="px-4 py-3 font-medium">End date</th>
                  <th className="px-4 py-3 font-medium">Days left</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-4 py-3 text-zinc-900">{contract.client_name}</td>
                    <td className="px-4 py-3 text-zinc-900">{contract.contract_name}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatDate(contract.end_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(contract.days_left)}`}
                      >
                        {contract.days_left} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

