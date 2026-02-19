import type { Service } from "./types";
import { PRICING_TYPE_LABELS } from "./types";

interface Props {
  services: Service[];
  onView: (service: Service) => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onViewTasks?: (service: Service) => void;
}

/** All pricing type badges use the same neutral pill style */
const PRICING_BADGE = "inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ServiceTable({ services, onView, onEdit, onDelete, onViewTasks }: Props) {
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
                Pricing Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Description
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
            {services.map((service) => (
              <tr key={service.id} className="transition hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-zinc-100">{service.name}</td>
                <td className="px-4 py-3">
                  <span className={PRICING_BADGE}>
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400 flex-shrink-0" />
                    {PRICING_TYPE_LABELS[service.pricingType]}
                  </span>
                </td>
                <td className="max-w-xs px-4 py-3 text-zinc-400">
                  <span className="line-clamp-1">{service.description ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(service.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(service)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit(service)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                    >
                      Edit
                    </button>
                    {onViewTasks && (
                      <button
                        onClick={() => onViewTasks(service)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-lime-500 transition hover:bg-lime-500/10 hover:text-lime-400"
                      >
                        Tasks
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(service)}
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
