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
    <div className="flex flex-col gap-4 text-[var(--color-bs-text)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Клиенти</h1>
          <p className="text-sm text-[var(--color-bs-muted)]">Управлявайте клиентите на едно място.</p>
        </div>
        <Link
          href="/clients/add"
          className="bs-btn-primary px-4 py-2 text-sm font-medium"
        >
          Добави клиент
        </Link>
      </div>

      {isLoading && (
        <div className="bs-surface-card rounded-xl p-6 text-sm text-[var(--color-bs-muted)]">Зареждане на клиенти...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && clients.length === 0 && (
        <EmptyState
          title="Все още няма клиенти"
          description="Започнете, като добавите първия си клиент."
          actionHref="/clients/add"
          actionLabel="Добави клиент"
          variant="dark"
        />
      )}

      {!isLoading && !errorMessage && clients.length > 0 && (
        <div className="bs-surface-card bs-scroll-fade overflow-x-auto rounded-xl">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-bs-border-soft)] bg-white/[0.03] text-[var(--color-bs-muted)]">
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
                  className="cursor-pointer border-b border-[var(--color-bs-border-soft)] transition-colors hover:bg-white/[0.04] last:border-b-0"
                >
                  <td className="px-4 py-3 text-[var(--color-bs-text)]">{client.name}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{client.contact_person || "-"}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{client.email || "-"}</td>
                  <td className="px-4 py-3 text-[var(--color-bs-muted)]">{client.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
