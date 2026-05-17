"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Client = {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type ClientService = {
  id: string;
  pricing_type: "one_time" | "monthly" | "percentage";
  fixed_price: number | null;
  monthly_price: number | null;
  percentage_rate: number | null;
  service: {
    name: string;
  } | null;
};

type ClientContract = {
  id: string;
  contract_name: string;
  start_date: string | null;
  end_date: string | null;
  reminder_days: number | null;
};

type ClientInvoice = {
  id: string;
  invoice_number: string;
  amount: number;
  issue_date: string | null;
  due_date: string | null;
  status: "draft" | "sent" | "waiting" | "paid" | "overdue";
};

function formatMoney(value: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return Number(value).toFixed(2);
}

function formatPercentage(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  return `${parseFloat(String(value))}%`;
}

function getPricingTypeLabel(value: "one_time" | "monthly" | "percentage") {
  if (value === "one_time") return "Еднократно";
  if (value === "monthly") return "Месечно";
  return "Процент";
}

function getInvoiceStatusBadgeClass(status: ClientInvoice["status"]) {
  if (status === "paid") return "bs-status-success";
  if (status === "overdue") return "bs-status-danger";
  if (status === "sent") return "bs-status-info";
  if (status === "waiting") return "bs-status-warning";
  return "bs-status-neutral";
}

function getInvoiceStatusLabel(status: ClientInvoice["status"]) {
  if (status === "paid") return "Платена";
  if (status === "overdue") return "Просрочена";
  if (status === "sent") return "Изпратена";
  if (status === "waiting") return "Чакаща";
  return "Чернова";
}

export default function ClientDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [clientServices, setClientServices] = useState<ClientService[]>([]);
  const [clientContracts, setClientContracts] = useState<ClientContract[]>([]);
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [detachErrorMessage, setDetachErrorMessage] = useState("");
  const [removingClientServiceId, setRemovingClientServiceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, contact_person, email, phone, notes")
        .eq("id", id)
        .single();

      if (clientError || !clientData) {
        setErrorMessage("Неуспешно зареждане на клиента. Възможно е да не съществува.");
        setClient(null);
        setClientServices([]);
        setClientContracts([]);
        setClientInvoices([]);
        setIsLoading(false);
        return;
      }

      const { data: serviceData, error: serviceError } = await supabase
        .from("client_services")
        .select("id, pricing_type, fixed_price, monthly_price, percentage_rate, services(name)")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      if (serviceError) {
        setErrorMessage("Неуспешно зареждане на услугите на клиента. Моля, опитайте отново.");
        setClient(clientData);
        setClientServices([]);
        setClientContracts([]);
        setClientInvoices([]);
        setIsLoading(false);
        return;
      }

      const mappedClientServices: ClientService[] = (serviceData ?? []).map((item: any) => ({
        id: item.id,
        pricing_type: item.pricing_type,
        fixed_price: item.fixed_price,
        monthly_price: item.monthly_price,
        percentage_rate: item.percentage_rate,
        service: item.services ? { name: item.services.name } : null,
      }));

      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("id, contract_name, start_date, end_date, reminder_days")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      if (contractError) {
        setErrorMessage("Неуспешно зареждане на договорите на клиента. Моля, опитайте отново.");
        setClient(clientData);
        setClientServices(mappedClientServices);
        setClientContracts([]);
        setClientInvoices([]);
        setIsLoading(false);
        return;
      }

      const mappedClientContracts: ClientContract[] = (contractData ?? []).map((item: any) => ({
        id: item.id,
        contract_name: item.contract_name,
        start_date: item.start_date,
        end_date: item.end_date,
        reminder_days: item.reminder_days,
      }));

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, issue_date, due_date, status")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      if (invoiceError) {
        setErrorMessage("Неуспешно зареждане на фактурите на клиента. Моля, опитайте отново.");
        setClient(clientData);
        setClientServices(mappedClientServices);
        setClientContracts(mappedClientContracts);
        setClientInvoices([]);
        setIsLoading(false);
        return;
      }

      const mappedClientInvoices: ClientInvoice[] = (invoiceData ?? []).map((item: any) => ({
        id: item.id,
        invoice_number: item.invoice_number,
        amount: Number(item.amount),
        issue_date: item.issue_date,
        due_date: item.due_date,
        status: item.status,
      }));

      setClient(clientData);
      setClientServices(mappedClientServices);
      setClientContracts(mappedClientContracts);
      setClientInvoices(mappedClientInvoices);
      setIsLoading(false);
    };

    fetchData();
  }, [id]);

  const handleDetachService = async (clientServiceId: string) => {
    const confirmed = window.confirm("Премахване на тази свързана услуга от клиента?");
    if (!confirmed) return;

    setDetachErrorMessage("");
    setRemovingClientServiceId(clientServiceId);

    const { error } = await supabase.from("client_services").delete().eq("id", clientServiceId);

    if (error) {
      setDetachErrorMessage("Неуспешно премахване на услугата от клиента. Моля, опитайте отново.");
      setRemovingClientServiceId(null);
      return;
    }

    setClientServices((prev) => prev.filter((service) => service.id !== clientServiceId));
    setRemovingClientServiceId(null);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-sm text-[var(--color-bs-muted)]">Зареждане на клиент...</p>
      </div>
    );
  }

  if (errorMessage || !client) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage || "Клиентът не е намерен."}
        </div>
        <Link href="/clients" className="mt-4 inline-block text-sm text-[var(--color-bs-muted)] hover:text-[var(--color-bs-text)]">
          ← Назад към клиентите
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl text-[var(--color-bs-text)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/clients" className="mb-2 inline-block text-sm text-[var(--color-bs-muted)] hover:text-[var(--color-bs-text)]">
            ← Назад към клиентите
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">{client.name}</h1>
        </div>
      </div>

      <div className="bs-surface-card rounded-xl">
        <div className="border-b border-[var(--color-bs-border-soft)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--color-bs-muted)]">Детайли за клиента</h2>
        </div>
        <dl className="divide-y divide-[var(--color-bs-border-soft)]">
          <DetailRow label="Име" value={client.name} />
          <DetailRow label="Контактно лице" value={client.contact_person} />
          <DetailRow label="Имейл" value={client.email} />
          <DetailRow label="Телефон" value={client.phone} />
          <DetailRow label="Бележки" value={client.notes} />
        </dl>
      </div>

      <div className="bs-surface-card mt-6 rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-bs-border-soft)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--color-bs-muted)]">Услуги на клиента</h2>
          <Link
            href={`/clients/${id}/add-service`}
            className="bs-btn-primary px-3 py-1.5 text-xs font-medium"
          >
            Свържи услуга
          </Link>
        </div>
        {detachErrorMessage && (
          <div className="border-b border-rose-300/35 bg-[rgba(255,110,140,0.1)] px-4 py-2 text-sm text-rose-300">
            {detachErrorMessage}
          </div>
        )}

        {clientServices.length === 0 ? (
          <EmptyState
            title="Няма свързани услуги"
            description="Свържете услуги от каталога с индивидуални цени за този клиент."
            actionHref={`/clients/${id}/add-service`}
            actionLabel="Свържи услуга"
            variant="compact-dark"
          />
        ) : (
          <div className="bs-scroll-fade overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-bs-border-soft)] bg-white/[0.03] text-[var(--color-bs-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Услуга</th>
                  <th className="px-4 py-3 font-medium">Тип ценообразуване</th>
                  <th className="px-4 py-3 font-medium">Фиксирана цена</th>
                  <th className="px-4 py-3 font-medium">Месечна цена</th>
                  <th className="px-4 py-3 font-medium">Процент</th>
                  <th className="px-4 py-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {clientServices.map((service) => (
                  <tr key={service.id} className="border-b border-[var(--color-bs-border-soft)] last:border-b-0">
                    <td className="px-4 py-3 text-[var(--color-bs-text)]">{service.service?.name || "-"}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{getPricingTypeLabel(service.pricing_type)}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatMoney(service.fixed_price)}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatMoney(service.monthly_price)}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatPercentage(service.percentage_rate)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDetachService(service.id)}
                        disabled={removingClientServiceId === service.id}
                        className="rounded-md border border-rose-300/35 bg-[rgba(255,110,140,0.08)] px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-[rgba(255,110,140,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingClientServiceId === service.id ? "Премахване..." : "Премахни"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bs-surface-card mt-6 rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-bs-border-soft)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--color-bs-muted)]">Договори</h2>
          <Link
            href="/contracts/add"
            className="bs-btn-primary px-3 py-1.5 text-xs font-medium"
          >
            Добави договор
          </Link>
        </div>

        {clientContracts.length === 0 ? (
          <EmptyState
            title="Все още няма договори"
            description="Добавете договори за този клиент, за да следите срокове и напомняния."
            actionHref="/contracts/add"
            actionLabel="Добави договор"
            variant="compact-dark"
          />
        ) : (
          <div className="bs-scroll-fade overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-bs-border-soft)] bg-white/[0.03] text-[var(--color-bs-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Договор</th>
                  <th className="px-4 py-3 font-medium">Начална дата</th>
                  <th className="px-4 py-3 font-medium">Крайна дата</th>
                  <th className="px-4 py-3 font-medium">Дни за напомняне</th>
                </tr>
              </thead>
              <tbody>
                {clientContracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-[var(--color-bs-border-soft)] last:border-b-0">
                    <td className="px-4 py-3 text-[var(--color-bs-text)]">
                      <Link href={`/contracts/${contract.id}`} className="hover:underline">
                        {contract.contract_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{contract.start_date ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{contract.end_date ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{contract.reminder_days ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bs-surface-card mt-6 rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-bs-border-soft)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--color-bs-muted)]">Фактури</h2>
          <Link
            href="/invoices/add"
            className="bs-btn-primary px-3 py-1.5 text-xs font-medium"
          >
            Добави фактура
          </Link>
        </div>

        {clientInvoices.length === 0 ? (
          <EmptyState
            title="Все още няма фактури"
            description="Създайте фактури за този клиент, за да следите суми и плащания."
            actionHref="/invoices/add"
            actionLabel="Добави фактура"
            variant="compact-dark"
          />
        ) : (
          <div className="bs-scroll-fade overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-bs-border-soft)] bg-white/[0.03] text-[var(--color-bs-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Номер на фактура</th>
                  <th className="px-4 py-3 font-medium">Сума</th>
                  <th className="px-4 py-3 font-medium">Дата на издаване</th>
                  <th className="px-4 py-3 font-medium">Падеж</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {clientInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[var(--color-bs-border-soft)] last:border-b-0">
                    <td className="px-4 py-3 text-[var(--color-bs-text)]">
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatMoney(invoice.amount)}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{invoice.issue_date ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{invoice.due_date ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getInvoiceStatusBadgeClass(invoice.status)}`}
                      >
                        {getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-[var(--color-bs-muted)]">{label}</dt>
      <dd className="text-right text-sm text-[var(--color-bs-text)]">{value ?? "-"}</dd>
    </div>
  );
}
