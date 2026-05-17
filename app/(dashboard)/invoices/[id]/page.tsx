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
  if (status === "paid") return "bs-status-success";
  if (status === "overdue") return "bs-status-danger";
  if (status === "sent") return "bs-status-info";
  if (status === "waiting") return "bs-status-warning";
  return "bs-status-neutral";
}

function getStatusLabel(status: InvoiceStatus) {
  if (status === "paid") return "Платена";
  if (status === "overdue") return "Просрочена";
  if (status === "sent") return "Изпратена";
  if (status === "waiting") return "Чакаща";
  return "Чернова";
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
        setErrorMessage("Неуспешно зареждане на фактурата. Възможно е да не съществува.");
        setInvoice(null);
        setIsLoading(false);
        return;
      }

      const rawClient = (data as { clients?: { id: string; name: string } | { id: string; name: string }[] }).clients;
      const client = Array.isArray(rawClient)
        ? rawClient[0]
          ? { id: rawClient[0].id, name: rawClient[0].name }
          : null
        : rawClient
          ? { id: rawClient.id, name: rawClient.name }
          : null;

      const mappedInvoice: Invoice = {
        id: data.id,
        invoice_number: data.invoice_number,
        amount: Number(data.amount),
        issue_date: data.issue_date,
        due_date: data.due_date,
        status: data.status,
        notes: data.notes,
        client,
      };

      setInvoice(mappedInvoice);
      setIsLoading(false);
    };

    fetchInvoice();
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-sm text-[var(--color-bs-muted)]">Зареждане на фактура...</p>
      </div>
    );
  }

  if (errorMessage || !invoice) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage || "Фактурата не е намерена."}
        </div>
        <Link href="/invoices" className="mt-4 inline-block text-sm text-[var(--color-bs-muted)] hover:text-[var(--color-bs-text)]">
          ← Назад към фактурите
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl text-[var(--color-bs-text)]">
      <div className="mb-6">
        <Link href="/invoices" className="mb-2 inline-block text-sm text-[var(--color-bs-muted)] hover:text-[var(--color-bs-text)]">
          ← Назад към фактурите
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">{invoice.invoice_number}</h1>
      </div>

      <div className="bs-surface-card rounded-xl">
        <div className="border-b border-[var(--color-bs-border-soft)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--color-bs-muted)]">Детайли за фактурата</h2>
        </div>
        <dl className="divide-y divide-[var(--color-bs-border-soft)]">
          <DetailRow
            label="Клиент"
            value={
              invoice.client ? (
                <Link
                  href={`/clients/${invoice.client.id}`}
                  className="text-[var(--color-bs-text)] underline-offset-2 hover:underline"
                >
                  {invoice.client.name}
                </Link>
              ) : (
                "-"
              )
            }
          />
          <DetailRow label="Номер на фактура" value={invoice.invoice_number} />
          <DetailRow label="Сума" value={formatAmount(invoice.amount)} />
          <DetailRow label="Дата на издаване" value={formatValue(invoice.issue_date)} />
          <DetailRow label="Падеж" value={formatValue(invoice.due_date)} />
          <DetailRow
            label="Статус"
            value={
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}
              >
                {getStatusLabel(invoice.status)}
              </span>
            }
          />
          <DetailRow label="Бележки" value={formatValue(invoice.notes)} />
        </dl>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-[var(--color-bs-muted)]">{label}</dt>
      <dd className="text-right text-sm text-[var(--color-bs-text)]">{value}</dd>
    </div>
  );
}
