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
        setErrorMessage("Неуспешно зареждане на фактурите. Моля, опитайте отново.");
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
    <div className="flex flex-col gap-4 text-[var(--color-bs-text)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Фактури</h1>
          <p className="text-sm text-[var(--color-bs-muted)]">Следете статус, падеж и суми на фактурите.</p>
        </div>
        <Link
          href="/invoices/add"
          className="bs-btn-primary px-4 py-2 text-sm font-medium"
        >
          Добави фактура
        </Link>
      </div>

      {isLoading && (
        <div className="bs-surface-card rounded-xl p-6 text-sm text-[var(--color-bs-muted)]">Зареждане на фактури...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && invoices.length === 0 && (
        <EmptyState
          title="Все още няма фактури"
          description="Създайте първата фактура, за да започнете да следите плащанията."
          actionHref="/invoices/add"
          actionLabel="Добави фактура"
          variant="dark"
        />
      )}

      {!isLoading && !errorMessage && invoices.length > 0 && (
        <div className="bs-surface-card bs-scroll-fade overflow-x-auto rounded-xl">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-bs-border-soft)] bg-white/[0.03] text-[var(--color-bs-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Номер на фактура</th>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Сума</th>
                <th className="px-4 py-3 font-medium">Дата на издаване</th>
                <th className="px-4 py-3 font-medium">Падеж</th>
                <th className="px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                  className="cursor-pointer border-b border-[var(--color-bs-border-soft)] transition-colors hover:bg-white/[0.04] last:border-b-0"
                >
                  <td className="px-4 py-3 text-[var(--color-bs-text)]">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-text)]">{invoice.client?.name || "-"}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatAmount(invoice.amount)}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatDate(invoice.issue_date)}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatDate(invoice.due_date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}
                    >
                      {getStatusLabel(invoice.status)}
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
