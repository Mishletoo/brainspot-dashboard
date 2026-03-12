"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Contract = {
  id: string;
  contract_name: string;
  contract_file: string | null;
  signed_date: string | null;
  start_date: string | null;
  end_date: string | null;
  notice_period_days: number | null;
  reminder_days: number | null;
  notes: string | null;
  client: {
    id: string;
    name: string;
  } | null;
};

function formatValue(value: string | number | null) {
  return value ?? "-";
}

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export default function ContractDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchContract = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, contract_name, contract_file, signed_date, start_date, end_date, notice_period_days, reminder_days, notes, clients(id, name)"
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setErrorMessage("Could not load contract. It may not exist.");
        setContract(null);
        setIsLoading(false);
        return;
      }

      const relatedClient = (data as any).clients;

      const normalizedClient: Contract["client"] = Array.isArray(relatedClient)
        ? relatedClient.length > 0
          ? { id: relatedClient[0].id, name: relatedClient[0].name }
          : null
        : relatedClient
          ? { id: relatedClient.id, name: relatedClient.name }
          : null;

      const mappedContract: Contract = {
        id: data.id,
        contract_name: data.contract_name,
        contract_file: data.contract_file,
        signed_date: data.signed_date,
        start_date: data.start_date,
        end_date: data.end_date,
        notice_period_days: data.notice_period_days,
        reminder_days: data.reminder_days,
        notes: data.notes,
        client: normalizedClient,
      };

      setContract(mappedContract);
      setIsLoading(false);
    };

    fetchContract();
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-sm text-zinc-600">Loading contract...</p>
      </div>
    );
  }

  if (errorMessage || !contract) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage || "Contract not found."}
        </div>
        <Link href="/contracts" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <Link href="/contracts" className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to contracts
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">{contract.contract_name}</h1>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Contract Details</h2>
        </div>
        <dl className="divide-y divide-zinc-100">
          <DetailRow
            label="Client"
            value={contract.client ? (
              <Link href={`/clients/${contract.client.id}`} className="text-zinc-900 underline-offset-2 hover:underline">
                {contract.client.name}
              </Link>
            ) : (
              "-"
            )}
          />
          <DetailRow label="Contract name" value={contract.contract_name} />
          <DetailRow
            label="Contract file"
            value={
              contract.contract_file ? (
                isUrl(contract.contract_file) ? (
                  <a
                    href={contract.contract_file}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-900 underline-offset-2 hover:underline"
                  >
                    Open file
                  </a>
                ) : (
                  contract.contract_file
                )
              ) : (
                "-"
              )
            }
          />
          <DetailRow label="Signed date" value={formatValue(contract.signed_date)} />
          <DetailRow label="Start date" value={formatValue(contract.start_date)} />
          <DetailRow label="End date" value={formatValue(contract.end_date)} />
          <DetailRow label="Notice period days" value={formatValue(contract.notice_period_days)} />
          <DetailRow label="Reminder days" value={formatValue(contract.reminder_days)} />
          <DetailRow label="Notes" value={formatValue(contract.notes)} />
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
