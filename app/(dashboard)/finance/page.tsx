"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabaseClient";

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  issue_date: string | null;
  due_date: string | null;
  status: string;
  client_name: string;
};

type FinanceMetrics = {
  totalInvoicesAmount: number;
  paidInvoicesAmount: number;
  unpaidInvoicesAmount: number;
  overdueInvoicesAmount: number;
};

type AdSpendRow = {
  clientId: string;
  clientName: string;
  metaAdsSpend: number;
  googleAdsSpend: number;
  totalSpend: number;
  metaAdsCommission: number;
  googleAdsCommission: number;
  totalCommission: number;
};

function formatAmount(value: number) {
  if (Number.isInteger(value)) {
    return `€${value}`;
  }

  return `€${value.toFixed(2)}`;
}

function formatDate(value: string | null) {
  return value ?? "-";
}

function getStatusBadgeClass(status: string) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "overdue") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "sent") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "waiting") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [adSpendRows, setAdSpendRows] = useState<AdSpendRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [monthValue, setMonthValue] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  });

  const monthBounds = useMemo(() => {
    const [year, month] = monthValue.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    return {
      startIso: start.toISOString().slice(0, 10),
      endIso: end.toISOString().slice(0, 10),
    };
  }, [monthValue]);

  useEffect(() => {
    const fetchFinanceData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, issue_date, due_date, status, clients(name)")
        .gte("issue_date", monthBounds.startIso)
        .lte("issue_date", monthBounds.endIso)
        .order("issue_date", { ascending: false });

      if (invoiceError) {
        setErrorMessage("Could not load finance data. Please refresh and try again.");
        setInvoices([]);
        setAdSpendRows([]);
        setIsLoading(false);
        return;
      }

      const { data: percentageServices, error: servicesError } = await supabase
        .from("services")
        .select("id, name, percentage_value")
        .in("name", ["Meta Ads", "Google Ads"]);

      if (servicesError) {
        setErrorMessage("Could not load ad spend service setup. Please refresh and try again.");
        setInvoices([]);
        setAdSpendRows([]);
        setIsLoading(false);
        return;
      }

      const percentageByServiceId = new Map<string, number>();
      let metaAdsServiceId = "";
      let googleAdsServiceId = "";
      for (const service of percentageServices ?? []) {
        const serviceId = String(service.id ?? "");
        const serviceName = String(service.name ?? "");
        const percentageValue = Number(service.percentage_value ?? 30);
        if (!serviceId) continue;
        percentageByServiceId.set(serviceId, Number.isFinite(percentageValue) ? percentageValue : 30);
        if (serviceName === "Meta Ads") metaAdsServiceId = serviceId;
        if (serviceName === "Google Ads") googleAdsServiceId = serviceId;
      }

      let mappedAdSpendRows: AdSpendRow[] = [];
      if (metaAdsServiceId || googleAdsServiceId) {
        const serviceIds = [metaAdsServiceId, googleAdsServiceId].filter(Boolean);
        const { data: spendData, error: spendError } = await supabase
          .from("client_service_spend")
          .select("client_id, service_id, spend, clients(name)")
          .eq("month", monthValue)
          .in("service_id", serviceIds);

        if (spendError) {
          setErrorMessage("Could not load ad spend data. Please refresh and try again.");
          setInvoices([]);
          setAdSpendRows([]);
          setIsLoading(false);
          return;
        }

        const grouped = new Map<string, AdSpendRow>();
        for (const row of spendData ?? []) {
          const clientId = String((row as any).client_id ?? "");
          if (!clientId) continue;
          const serviceId = String((row as any).service_id ?? "");
          const spend = Number((row as any).spend ?? 0);
          const existing = grouped.get(clientId) ?? {
            clientId,
            clientName: (row as any).clients?.name ?? "-",
            metaAdsSpend: 0,
            googleAdsSpend: 0,
            totalSpend: 0,
            metaAdsCommission: 0,
            googleAdsCommission: 0,
            totalCommission: 0,
          };

          if (serviceId === metaAdsServiceId) {
            existing.metaAdsSpend += spend;
            const pct = (percentageByServiceId.get(metaAdsServiceId) ?? 30) / 100;
            existing.metaAdsCommission += spend * pct;
          } else if (serviceId === googleAdsServiceId) {
            existing.googleAdsSpend += spend;
            const pct = (percentageByServiceId.get(googleAdsServiceId) ?? 30) / 100;
            existing.googleAdsCommission += spend * pct;
          }

          existing.totalSpend = existing.metaAdsSpend + existing.googleAdsSpend;
          existing.totalCommission = existing.metaAdsCommission + existing.googleAdsCommission;
          grouped.set(clientId, existing);
        }

        mappedAdSpendRows = Array.from(grouped.values()).sort((a, b) =>
          a.clientName.localeCompare(b.clientName, "bg-BG")
        );
      }

      const mappedInvoices: Invoice[] = (invoiceData ?? []).map((item: any) => ({
        id: item.id,
        invoice_number: item.invoice_number,
        amount: Number(item.amount ?? 0),
        issue_date: item.issue_date,
        due_date: item.due_date,
        status: item.status ?? "draft",
        client_name: item.clients?.name ?? "-",
      }));

      setInvoices(mappedInvoices);
      setAdSpendRows(mappedAdSpendRows);
      setIsLoading(false);
    };

    fetchFinanceData();
  }, [monthBounds.endIso, monthBounds.startIso, monthValue]);

  const metrics = useMemo<FinanceMetrics>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return invoices.reduce<FinanceMetrics>(
      (totals, invoice) => {
        const amount = Number(invoice.amount) || 0;
        const isPaid = invoice.status === "paid";
        const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;

        totals.totalInvoicesAmount += amount;

        if (isPaid) {
          totals.paidInvoicesAmount += amount;
        } else {
          totals.unpaidInvoicesAmount += amount;
        }

        if (!isPaid && dueDate && !Number.isNaN(dueDate.getTime())) {
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            totals.overdueInvoicesAmount += amount;
          }
        }

        return totals;
      },
      {
        totalInvoicesAmount: 0,
        paidInvoicesAmount: 0,
        unpaidInvoicesAmount: 0,
        overdueInvoicesAmount: 0,
      }
    );
  }, [invoices]);

  const recentInvoices = useMemo(() => invoices.slice(0, 10), [invoices]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Finance</h1>
        <p className="text-sm text-zinc-500">Overview of invoice performance and payment status.</p>
        <div className="max-w-56 rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <label htmlFor="finance-month" className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Month
          </label>
          <input
            id="finance-month"
            type="month"
            value={monthValue}
            onChange={(event) => setMonthValue(event.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Loading finance data...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && (
        <>
          <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-700">Ad spend by client</h2>
            </div>
            {adSpendRows.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">No ad spend records for this month.</div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium text-right">Meta Ads spend</th>
                    <th className="px-4 py-3 font-medium text-right">Google Ads spend</th>
                    <th className="px-4 py-3 font-medium text-right">Total spend</th>
                    <th className="px-4 py-3 font-medium text-right">Meta Ads commission</th>
                    <th className="px-4 py-3 font-medium text-right">Google Ads commission</th>
                    <th className="px-4 py-3 font-medium text-right">Total commission</th>
                  </tr>
                </thead>
                <tbody>
                  {adSpendRows.map((row) => (
                    <tr key={row.clientId} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-4 py-3 text-zinc-900">{row.clientName}</td>
                      <td className="px-4 py-3 text-right text-zinc-700">{formatAmount(row.metaAdsSpend)}</td>
                      <td className="px-4 py-3 text-right text-zinc-700">{formatAmount(row.googleAdsSpend)}</td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatAmount(row.totalSpend)}</td>
                      <td className="px-4 py-3 text-right text-zinc-700">{formatAmount(row.metaAdsCommission)}</td>
                      <td className="px-4 py-3 text-right text-zinc-700">{formatAmount(row.googleAdsCommission)}</td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900">
                        {formatAmount(row.totalCommission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">Total invoices</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatAmount(metrics.totalInvoicesAmount)}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Paid invoices</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatAmount(metrics.paidInvoicesAmount)}</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Unpaid invoices</p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{formatAmount(metrics.unpaidInvoicesAmount)}</p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Overdue invoices</p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">{formatAmount(metrics.overdueInvoicesAmount)}</p>
            </div>
          </section>

          <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-700">Recent invoices</h2>
            </div>

            {recentInvoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Your recent invoices will appear here. Create your first invoice to start tracking payments."
                actionHref="/invoices/add"
                actionLabel="Add invoice"
                variant="compact"
              />
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice number</th>
                    <th className="px-4 py-3 font-medium">Client name</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-4 py-3 text-zinc-900">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 text-zinc-900">{invoice.client_name}</td>
                      <td className="px-4 py-3 text-zinc-700">{formatAmount(invoice.amount)}</td>
                      <td className="px-4 py-3 text-zinc-700">{formatDate(invoice.due_date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
