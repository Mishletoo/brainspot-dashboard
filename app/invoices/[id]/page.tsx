"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type InvoiceStatus = "draft" | "sent" | "waiting" | "paid" | "overdue";

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  issue_date: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  notes: string | null;
  client: {
    id: string;
    name: string;
  } | null;
};

function formatValue(value: string | number | null) {
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

export default function InvoiceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, issue_date, due_date, status, notes, clients(id, name)")
        .eq("id", id)
        .single();

      if (error || !data) {
        setErrorMessage("Could not load invoice. It may not exist.");
        setInvoice(null);
        setIsLoading(false);
        return;
      }

      const mappedInvoice: Invoice = {
        id: data.id,
        invoice_number: data.invoice_number,
        amount: Number(data.amount),
        issue_date: data.issue_date,
        due_date: data.due_date,
        status: data.status,
        notes: data.notes,
        client: data.clients ? { id: data.clients.id, name: data.clients.name } : null,
      };

      setInvoice(mappedInvoice);
      setIsLoading(false);
    };

    fetchInvoice();
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-sm text-zinc-600">Loading invoice...</p>
      </div>
    );
  }

  if (errorMessage || !invoice) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage || "Invoice not found."}
        </div>
        <Link href="/invoices" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <Link href="/invoices" className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to invoices
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">{invoice.invoice_number}</h1>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Invoice Details</h2>
        </div>
        <dl className="divide-y divide-zinc-100">
          <DetailRow
            label="Client"
            value={
              invoice.client ? (
                <Link href={`/clients/${invoice.client.id}`} className="text-zinc-900 underline-offset-2 hover:underline">
                  {invoice.client.name}
                </Link>
              ) : (
                "-"
              )
            }
          />
          <DetailRow label="Invoice number" value={invoice.invoice_number} />
          <DetailRow label="Amount" value={formatAmount(invoice.amount)} />
          <DetailRow label="Issue date" value={formatValue(invoice.issue_date)} />
          <DetailRow label="Due date" value={formatValue(invoice.due_date)} />
          <DetailRow
            label="Status"
            value={
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}
              >
                {invoice.status}
              </span>
            }
          />
          <DetailRow label="Notes" value={formatValue(invoice.notes)} />
        </dl>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-right text-sm text-zinc-900">{value}</dd>
    </div>
  );
}
