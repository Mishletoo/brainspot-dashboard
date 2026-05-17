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
      label: "Несвързан",
      className: "bs-status-neutral",
    };
  }

  if (employee.is_active === false) {
    return {
      label: "Свързан (неактивен)",
      className: "bs-status-danger",
    };
  }

  return {
    label: "Свързан (активен)",
    className: "bs-status-success",
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
        setErrorMessage(payload?.error ?? "Неуспешно зареждане на служителите. Моля, опитайте отново.");
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
    <div className="flex flex-col gap-4 text-[var(--color-bs-text)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Служители</h1>
          <p className="text-sm text-[var(--color-bs-muted)]">Управлявайте служителите на едно място.</p>
        </div>
        <Link
          href="/employees/add"
          className="bs-btn-primary px-4 py-2 text-sm font-medium"
        >
          Добави служител
        </Link>
      </div>

      {isLoading && (
        <div className="bs-surface-card rounded-xl p-6 text-sm text-[var(--color-bs-muted)]">Зареждане на служители...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-300/35 bg-[rgba(255,110,140,0.1)] p-6 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && employees.length === 0 && (
        <EmptyState
          title="Все още няма служители"
          description="Добавете екипа си, за да управлявате контакти и ангажименти."
          actionHref="/employees/add"
          actionLabel="Добави служител"
          variant="dark"
        />
      )}

      {!isLoading && !errorMessage && employees.length > 0 && (
        <div className="bs-surface-card bs-scroll-fade overflow-x-auto rounded-xl">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-bs-border-soft)] bg-white/[0.03] text-[var(--color-bs-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Име</th>
                <th className="px-4 py-3 font-medium">Позиция</th>
                <th className="px-4 py-3 font-medium">Отдел</th>
                <th className="px-4 py-3 font-medium">Нетна заплата</th>
                <th className="px-4 py-3 font-medium">Бонус</th>
                <th className="px-4 py-3 font-medium">Месечен разход</th>
                <th className="px-4 py-3 font-medium">Свързан акаунт</th>
                <th className="px-4 py-3 font-medium">Имейл</th>
                <th className="px-4 py-3 font-medium">Телефон</th>
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
                    className="cursor-pointer border-b border-[var(--color-bs-border-soft)] transition-colors hover:bg-white/[0.04] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[var(--color-bs-text)]">{fullName}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{employee.position || "-"}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{employee.department || "-"}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatCurrency(employee.net_salary)}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatCurrency(employee.bonus)}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{formatCurrency(employee.monthly_cost)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${accountStatus.className}`}
                      >
                        {accountStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{employee.email || "-"}</td>
                    <td className="px-4 py-3 text-[var(--color-bs-muted)]">{employee.phone || "-"}</td>
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
