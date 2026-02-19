import type { TimeEntry } from "./types";
import type { Client } from "@/components/clients/types";
import type { Service } from "@/components/services/types";
import type { Task } from "@/components/tasks/types";
import type { ClientService } from "@/components/client-services/types";

interface Props {
  entries: TimeEntry[];
  clients: Client[];
  services: Service[];
  tasks: Task[];
  clientServices: ClientService[];
  isLocked: boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export default function TimeEntryTable({
  entries,
  clients,
  services,
  tasks,
  clientServices,
  isLocked,
  onEdit,
  onDelete,
}: Props) {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  const taskMap = new Map(tasks.map((t) => [t.id, t.name]));
  // clientServiceId → service name (for display)
  const csServiceMap = new Map(
    clientServices.map((cs) => [cs.id, serviceMap.get(cs.serviceId) ?? "—"])
  );

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Task
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Notes
              </th>
              {!isLocked && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="transition hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                  {formatDate(entry.createdAt)}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-100">
                  {clientMap.get(entry.clientId) ?? (
                    <span className="text-zinc-600">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {csServiceMap.get(entry.clientServiceId) ?? (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {taskMap.get(entry.taskId) ?? (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-zinc-100">
                  {entry.hours % 1 === 0
                    ? entry.hours.toFixed(0)
                    : entry.hours.toFixed(2)}
                  h
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-zinc-500">
                  {entry.notes ?? <span className="text-zinc-700">—</span>}
                </td>
                {!isLocked && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(entry)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(entry)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-700/60 hover:text-zinc-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {/* Total row */}
          <tfoot>
            <tr className="border-t border-zinc-700/60">
              <td
                colSpan={isLocked ? 4 : 4}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                Total
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-bold text-lime-400">
                {totalHours % 1 === 0
                  ? totalHours.toFixed(0)
                  : totalHours.toFixed(2)}
                h
              </td>
              <td colSpan={isLocked ? 1 : 2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
