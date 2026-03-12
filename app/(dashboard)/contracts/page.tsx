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
        setErrorMessage("Could not load contracts. Please refresh and try again.");
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Contracts</h1>
          <p className="text-sm text-zinc-500">Track contract dates and reminders in one place.</p>
        </div>
        <Link
          href="/contracts/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add contract
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading contracts...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && contracts.length === 0 && (
        <EmptyState
          title="No contracts yet"
          description="Track contract dates and renewal reminders in one place. Add your first contract to get started."
          actionHref="/contracts/add"
          actionLabel="Add contract"
        />
      )}

      {!isLoading && !errorMessage && contracts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Client name</th>
                <th className="px-4 py-3 font-medium">Contract name</th>
                <th className="px-4 py-3 font-medium">Start date</th>
                <th className="px-4 py-3 font-medium">End date</th>
                <th className="px-4 py-3 font-medium">Reminder days</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => router.push(`/contracts/${contract.id}`)}
                  className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 last:border-b-0"
                >
                  <td className="px-4 py-3 text-zinc-900">{contract.client?.name || "-"}</td>
                  <td className="px-4 py-3 text-zinc-900">{contract.contract_name}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatDate(contract.start_date)}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatDate(contract.end_date)}</td>
                  <td className="px-4 py-3 text-zinc-700">{contract.reminder_days ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
