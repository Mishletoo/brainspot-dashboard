import type { ClientService, PricingType } from "./types";
import type { Service } from "@/components/services/types";
import { formatEUR } from "@/lib/money";

interface Props {
  records: ClientService[];
  services: Service[];
  onView: (record: ClientService) => void;
  onEdit: (record: ClientService) => void;
  onRemove: (record: ClientService) => void;
}

const PRICING_BADGE = "inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300";

const PRICING_LABELS: Record<PricingType, string> = {
  FIXED_MONTHLY: "Fixed Monthly",
  HOURLY: "Hourly",
  COMMISSION: "Commission",
  FIXED_ONE_TIME: "Fixed One-Time",
};

function priceSummary(r: ClientService): string {
  switch (r.pricingType) {
    case "FIXED_MONTHLY":
      return r.monthlyFixedPrice != null ? `${formatEUR(r.monthlyFixedPrice)}/mo` : "—";
    case "HOURLY":
      return r.hourlyRate != null ? `${formatEUR(r.hourlyRate)}/hr` : "—";
    case "FIXED_ONE_TIME":
      return r.oneTimePrice != null ? formatEUR(r.oneTimePrice) : "—";
    case "COMMISSION":
      return `${r.commissionRatePct ?? 30}% commission`;
  }
}

export default function ClientServicesTable({ records, services, onView, onEdit, onRemove }: Props) {
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Pricing Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Price / Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {records.map((record) => {
              const svc = serviceMap.get(record.serviceId);
              return (
                <tr key={record.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-zinc-100">
                    {svc?.name ?? <span className="text-zinc-500 italic">Unknown service</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={PRICING_BADGE}>
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-400 flex-shrink-0" />
                      {PRICING_LABELS[record.pricingType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{priceSummary(record)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onView(record)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onEdit(record)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onRemove(record)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-700/60 hover:text-zinc-300"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
