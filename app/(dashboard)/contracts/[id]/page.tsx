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
        setErrorMessage("Неуспешно зареждане на договора. Възможно е да не съществува.");
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
        <p className="text-sm text-[var(--color-bs-muted)]">Зареждане на договор...</p>
      </div>
    );
  }

  if (errorMessage || !contract) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage || "Договорът не е намерен."}
        </div>
        <Link href="/contracts" className="mt-4 inline-block text-sm text-[var(--color-bs-muted)] hover:text-[var(--color-bs-text)]">
          ← Назад към договорите
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl text-[var(--color-bs-text)]">
      <div className="mb-6">
        <Link href="/contracts" className="mb-2 inline-block text-sm text-[var(--color-bs-muted)] hover:text-[var(--color-bs-text)]">
          ← Назад към договорите
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">{contract.contract_name}</h1>
      </div>

      <div className="bs-surface-card rounded-xl">
        <div className="border-b border-[var(--color-bs-border-soft)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--color-bs-muted)]">Детайли за договора</h2>
        </div>
        <dl className="divide-y divide-[var(--color-bs-border-soft)]">
          <DetailRow
            label="Клиент"
            value={contract.client ? (
              <Link href={`/clients/${contract.client.id}`} className="text-[var(--color-bs-text)] underline-offset-2 hover:underline">
                {contract.client.name}
              </Link>
            ) : (
              "-"
            )}
          />
          <DetailRow label="Име на договор" value={contract.contract_name} />
          <DetailRow
            label="Договор"
            value={
              contract.contract_file ? (
                isUrl(contract.contract_file) ? (
                  <a
                    href={contract.contract_file}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-bs-text)] underline-offset-2 hover:underline"
                  >
                    Отвори файла
                  </a>
                ) : (
                  contract.contract_file
                )
              ) : (
                "-"
              )
            }
          />
          <DetailRow label="Дата на подписване" value={formatValue(contract.signed_date)} />
          <DetailRow label="Начална дата" value={formatValue(contract.start_date)} />
          <DetailRow label="Крайна дата" value={formatValue(contract.end_date)} />
          <DetailRow label="Срок на предизвестие (дни)" value={formatValue(contract.notice_period_days)} />
          <DetailRow label="Дни за напомняне" value={formatValue(contract.reminder_days)} />
          <DetailRow label="Бележки" value={formatValue(contract.notes)} />
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
