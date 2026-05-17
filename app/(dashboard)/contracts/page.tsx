"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Contract = {
  id: string;
  contract_name: string;
  start_date: string | null;
  end_date: string | null;
  reminder_days: number | null;
  client: {
    name: string;
  } | null;
};

function formatDate(value: string | null) {
  return value ?? "-";
}

export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_name, start_date, end_date, reminder_days, clients(name)")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage("Неуспешно зареждане на договорите. Моля, опитайте отново.");
        setContracts([]);
        setIsLoading(false);
        return;
      }

      const mappedContracts: Contract[] = (data ?? []).map((item: any) => ({
        id: item.id,
        contract_name: item.contract_name,
        start_date: item.start_date,
        end_date: item.end_date,
        reminder_days: item.reminder_days,
        client: item.clients ? { name: item.clients.name } : null,
      }));

      setContracts(mappedContracts);
      setIsLoading(false);
    };

    fetchContracts();
  }, []);

  return (
    <div className="flex flex-col gap-4 text-[var(--color-bs-text)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Договори</h1>
          <p className="text-sm text-[var(--color-bs-muted)]">Следете срокове и напомняния по договорите.</p>
        </div>
        <Link
          href="/contracts/add"
          className="bs-btn-primary px-4 py-2 text-sm font-medium"
        >
          Добави договор
        </Link>
      </div>

      {isLoading && (
        <div className="bs-surface-card rounded-xl p-6 text-sm text-[var(--color-bs-muted)]">Зареждане на договори...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && contracts.length === 0 && (
        <EmptyState
          title="Все още няма договори"
          description="Добавете първия договор, за да следите срокове и подновявания."
          actionHref="/contracts/add"
          actionLabel="Добави договор"
          variant="dark"
        />
      )}

      {!isLoading && !errorMessage && contracts.length > 0 && (
        <div className="bs-surface-card bs-scroll-fade overflow-x-auto rounded-xl">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-bs-border-soft)] bg-white/[0.03] text-[var(--color-bs-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Договор</th>
                <th className="px-4 py-3 font-medium">Начална дата</th>
                <th className="px-4 py-3 font-medium">Крайна дата</th>
                <th className="px-4 py-3 font-medium">Дни за напомняне</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => router.push(`/contracts/${contract.id}`)}
                  className="cursor-pointer border-b border-[var(--color-bs-border-soft)] transition-colors hover:bg-white/[0.04] last:border-b-0"
                >
                  <td className="px-4 py-3 text-[var(--color-bs-text)]">{contract.client?.name || "-"}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-text)]">{contract.contract_name}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatDate(contract.start_date)}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatDate(contract.end_date)}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{contract.reminder_days ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
