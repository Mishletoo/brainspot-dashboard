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

function getInvoiceStatusBadgeClass(status: ClientInvoice["status"]) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "overdue") return "border-red-200 bg-red-50 text-red-700";
  if (status === "sent") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "waiting") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
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
        setErrorMessage("Could not load client. It may not exist.");
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
        setErrorMessage("Could not load client services. Please refresh and try again.");
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
        setErrorMessage("Could not load client contracts. Please refresh and try again.");
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
        setErrorMessage("Could not load client invoices. Please refresh and try again.");
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
    const confirmed = window.confirm("Remove this attached service from the client?");
    if (!confirmed) return;

    setDetachErrorMessage("");
    setRemovingClientServiceId(clientServiceId);

    const { error } = await supabase.from("client_services").delete().eq("id", clientServiceId);

    if (error) {
      setDetachErrorMessage("Could not remove service from this client. Please try again.");
      setRemovingClientServiceId(null);
      return;
    }

    setClientServices((prev) => prev.filter((service) => service.id !== clientServiceId));
    setRemovingClientServiceId(null);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-sm text-zinc-600">Loading client...</p>
      </div>
    );
  }

  if (errorMessage || !client) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage || "Client not found."}</div>
        <Link href="/clients" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/clients" className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
            ← Back to clients
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">{client.name}</h1>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Client Details</h2>
        </div>
        <dl className="divide-y divide-zinc-100">
          <DetailRow label="Name" value={client.name} />
          <DetailRow label="Contact person" value={client.contact_person} />
          <DetailRow label="Email" value={client.email} />
          <DetailRow label="Phone" value={client.phone} />
          <DetailRow label="Notes" value={client.notes} />
        </dl>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Client Services</h2>
          <Link
            href={`/clients/${id}/add-service`}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Attach Service
          </Link>
        </div>
        {detachErrorMessage && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{detachErrorMessage}</div>
        )}

        {clientServices.length === 0 ? (
          <EmptyState
            title="No services attached"
            description="Attach services from your catalog with custom pricing for this client."
            actionHref={`/clients/${id}/add-service`}
            actionLabel="Attach service"
            variant="compact"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Service name</th>
                  <th className="px-4 py-3 font-medium">Pricing type</th>
                  <th className="px-4 py-3 font-medium">Fixed price</th>
                  <th className="px-4 py-3 font-medium">Monthly price</th>
                  <th className="px-4 py-3 font-medium">Percentage rate</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientServices.map((service) => (
                  <tr key={service.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-4 py-3 text-zinc-900">{service.service?.name || "-"}</td>
                    <td className="px-4 py-3 text-zinc-700">{service.pricing_type}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatMoney(service.fixed_price)}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatMoney(service.monthly_price)}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatPercentage(service.percentage_rate)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDetachService(service.id)}
                        disabled={removingClientServiceId === service.id}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingClientServiceId === service.id ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Contracts</h2>
          <Link
            href="/contracts/add"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Add Contract
          </Link>
        </div>

        {clientContracts.length === 0 ? (
          <EmptyState
            title="No contracts yet"
            description="Add contracts for this client to track dates and renewal reminders."
            actionHref="/contracts/add"
            actionLabel="Add contract"
            variant="compact"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Contract name</th>
                  <th className="px-4 py-3 font-medium">Start date</th>
                  <th className="px-4 py-3 font-medium">End date</th>
                  <th className="px-4 py-3 font-medium">Reminder days</th>
                </tr>
              </thead>
              <tbody>
                {clientContracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-4 py-3 text-zinc-900">
                      <Link href={`/contracts/${contract.id}`} className="hover:underline">
                        {contract.contract_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{contract.start_date ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-700">{contract.end_date ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-700">{contract.reminder_days ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Invoices</h2>
          <Link
            href="/invoices/add"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Add Invoice
          </Link>
        </div>

        {clientInvoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Create invoices for this client to track amounts and payment status."
            actionHref="/invoices/add"
            actionLabel="Add invoice"
            variant="compact"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice number</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Issue date</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-4 py-3 text-zinc-900">
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{formatMoney(invoice.amount)}</td>
                    <td className="px-4 py-3 text-zinc-700">{invoice.issue_date ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-700">{invoice.due_date ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getInvoiceStatusBadgeClass(invoice.status)}`}
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
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-right text-sm text-zinc-900">{value ?? "-"}</dd>
    </div>
  );
}
