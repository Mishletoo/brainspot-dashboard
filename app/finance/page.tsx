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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, issue_date, due_date, status, clients(name)")
        .order("issue_date", { ascending: false });

      if (error) {
        setErrorMessage("Could not load finance data. Please refresh and try again.");
        setInvoices([]);
        setIsLoading(false);
        return;
      }

      const mappedInvoices: Invoice[] = (data ?? []).map((item: any) => ({
        id: item.id,
        invoice_number: item.invoice_number,
        amount: Number(item.amount ?? 0),
        issue_date: item.issue_date,
        due_date: item.due_date,
        status: item.status ?? "draft",
        client_name: item.clients?.name ?? "-",
      }));

      setInvoices(mappedInvoices);
      setIsLoading(false);
    };

    fetchInvoices();
  }, []);

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
