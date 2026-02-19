import type { Employee } from "./types";
import { formatEUR } from "@/lib/money";

interface Props {
  employees: Employee[];
  showCompensation: boolean;
  onEdit: (employee: Employee) => void;
  onToggleActive: (employee: Employee) => void;
}

function RoleBadge({ role }: { role: Employee["role"] }) {
  if (role === "ADMIN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-200">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-400 flex-shrink-0" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/60 px-2 py-0.5 text-xs font-medium text-zinc-500">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
      Employee
    </span>
  );
}

function StatusDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        isActive ? "text-zinc-300" : "text-zinc-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-lime-400" : "bg-zinc-600"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function EmployeeTable({
  employees,
  showCompensation,
  onEdit,
  onToggleActive,
}: Props) {
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
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Role
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
                h/day
              </th>
              {showCompensation && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Cost/h
                </th>
              )}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {employees.map((emp) => (
              <tr
                key={emp.id}
                className={`transition hover:bg-white/[0.02] ${
                  !emp.isActive ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium text-zinc-100">
                  {emp.fullName}
                </td>
                <td className="px-4 py-3 text-zinc-400">{emp.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={emp.role} />
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-zinc-300">
                  {emp.workdayHours}h
                </td>
                {showCompensation && (
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                    {formatEUR(emp.hourlyCost)}/h
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <StatusDot isActive={emp.isActive} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(emp)}
                      className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onToggleActive(emp)}
                      className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
                    >
                      {emp.isActive ? "Deactivate" : "Activate"}
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
