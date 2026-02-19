import type { Task } from "./types";
import type { Service } from "@/components/services/types";

interface Props {
  tasks: Task[];
  services: Service[];
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TaskTable({
  tasks,
  services,
  onView,
  onEdit,
  onDelete,
}: Props) {
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Task Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
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
            {tasks.map((task) => (
              <tr key={task.id} className="transition hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-zinc-100">
                  {task.name}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {serviceMap.get(task.serviceId) ?? (
                    <span className="text-zinc-600">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {task.isActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-400 flex-shrink-0" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/60 px-2 py-0.5 text-xs font-medium text-zinc-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {formatDate(task.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(task)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit(task)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(task)}
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
