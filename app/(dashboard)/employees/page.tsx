"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  net_salary: number | null;
  bonus: number | null;
  monthly_cost: number | null;
  auth_user_id: string | null;
  is_active: boolean | null;
};

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return `€${Number(value).toFixed(2)}`;
}

function getLinkedAccountStatus(employee: Employee) {
  if (!employee.auth_user_id) {
    return {
      label: "Not linked",
      className: "border-zinc-200 bg-zinc-50 text-zinc-700",
    };
  }

  if (employee.is_active === false) {
    return {
      label: "Linked (inactive)",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: "Linked (active)",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/employees", { method: "GET" });
      const payload = (await response.json().catch(() => null)) as
        | { employees?: Employee[]; error?: string }
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Could not load employees. Please refresh and try again.");
        setEmployees([]);
        setIsLoading(false);
        return;
      }

      setEmployees(payload?.employees ?? []);
      setIsLoading(false);
    };

    fetchEmployees();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Employees</h1>
          <p className="text-sm text-zinc-500">Manage employees in one place.</p>
        </div>
        <Link
          href="/employees/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add employee
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading employees...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && employees.length === 0 && (
        <EmptyState
          title="No employees yet"
          description="Add your team to manage contacts and assignments. Add your first employee to get started."
          actionHref="/employees/add"
          actionLabel="Add employee"
        />
      )}

      {!isLoading && !errorMessage && employees.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Net salary</th>
                <th className="px-4 py-3 font-medium">Bonus</th>
                <th className="px-4 py-3 font-medium">Monthly cost</th>
                <th className="px-4 py-3 font-medium">Linked account</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const accountStatus = getLinkedAccountStatus(employee);
                const fullName =
                  [employee.first_name, employee.last_name]
                    .filter((value) => typeof value === "string" && value.trim().length > 0)
                    .join(" ") || "-";

                return (
                  <tr
                    key={employee.id}
                    onClick={() => router.push(`/employees/${employee.id}`)}
                    className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-zinc-900">{fullName}</td>
                    <td className="px-4 py-3 text-zinc-700">{employee.position || "-"}</td>
                    <td className="px-4 py-3 text-zinc-700">{employee.department || "-"}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatCurrency(employee.net_salary)}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatCurrency(employee.bonus)}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatCurrency(employee.monthly_cost)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${accountStatus.className}`}
                      >
                        {accountStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{employee.email || "-"}</td>
                    <td className="px-4 py-3 text-zinc-700">{employee.phone || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
