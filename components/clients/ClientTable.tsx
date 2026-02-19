import Link from "next/link";
import type { Client } from "./types";

interface Props {
  clients: Client[];
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ClientTable({ clients, onView, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                EIK
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Added
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {clients.map((client) => (
              <tr key={client.id} className="transition hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-zinc-100">
                  <Link
                    href={`/clients/${client.id}`}
                    className="transition hover:text-lime-400"
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-400">{client.company ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-500">{client.eik ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{client.email ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{client.phone ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(client.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(client)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit(client)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(client)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-700/60 hover:text-zinc-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
