"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Client = {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, contact_person, email, phone")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage("Неуспешно зареждане на клиентите. Моля, опитайте отново.");
        setClients([]);
        setIsLoading(false);
        return;
      }

      setClients(data ?? []);
      setIsLoading(false);
    };

    fetchClients();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Клиенти</h1>
          <p className="text-sm text-zinc-500">Управлявайте клиентите на едно място.</p>
        </div>
        <Link
          href="/clients/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Добави клиент
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Зареждане на клиенти...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && clients.length === 0 && (
        <EmptyState
          title="Все още няма клиенти"
          description="Започнете, като добавите първия си клиент."
          actionHref="/clients/add"
          actionLabel="Добави клиент"
        />
      )}

      {!isLoading && !errorMessage && clients.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Име</th>
                <th className="px-4 py-3 font-medium">Контактно лице</th>
                <th className="px-4 py-3 font-medium">Имейл</th>
                <th className="px-4 py-3 font-medium">Телефон</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 last:border-b-0"
                >
                  <td className="px-4 py-3 text-zinc-900">{client.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{client.contact_person || "-"}</td>
                  <td className="px-4 py-3 text-zinc-700">{client.email || "-"}</td>
                  <td className="px-4 py-3 text-zinc-700">{client.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
