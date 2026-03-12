"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type InvoiceStatus = "draft" | "sent" | "waiting" | "paid" | "overdue";

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  issue_date: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  client: {
    name: string;
  } | null;
};

function formatDate(value: string | null) {
  return value ?? "-";
}

function formatAmount(value: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return Number(value).toFixed(2);
}

function getStatusBadgeClass(status: InvoiceStatus) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "overdue") return "border-red-200 bg-red-50 text-red-700";
  if (status === "sent") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "waiting") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export default function InvoicesPage() {
  const router = useRouter();
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
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage("Could not load invoices. Please refresh and try again.");
        setInvoices([]);
        setIsLoading(false);
        return;
      }

      const mappedInvoices: Invoice[] = (data ?? []).map((item: any) => ({
        id: item.id,
        invoice_number: item.invoice_number,
        amount: Number(item.amount),
        issue_date: item.issue_date,
        due_date: item.due_date,
        status: item.status,
        client: item.clients ? { name: item.clients.name } : null,
      }));

      setInvoices(mappedInvoices);
      setIsLoading(false);
    };

    fetchInvoices();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Invoices</h1>
          <p className="text-sm text-zinc-500">Track invoice status, due dates, and amounts in one place.</p>
        </div>
        <Link
          href="/invoices/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add invoice
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading invoices...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && invoices.length === 0 && (
        <EmptyState
          title="No invoices yet"
          description="Create and track invoices, amounts, and payment status. Add your first invoice to get started."
          actionHref="/invoices/add"
          actionLabel="Add invoice"
        />
      )}

      {!isLoading && !errorMessage && invoices.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice number</th>
                <th className="px-4 py-3 font-medium">Client name</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Issue date</th>
                <th className="px-4 py-3 font-medium">Due date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                  className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 last:border-b-0"
                >
                  <td className="px-4 py-3 text-zinc-900">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-zinc-900">{invoice.client?.name || "-"}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatAmount(invoice.amount)}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatDate(invoice.issue_date)}</td>
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
        </div>
      )}
    </div>
  );
}
