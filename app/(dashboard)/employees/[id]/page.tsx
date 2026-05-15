"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  photo_url: string | null;
  hours_per_day: number | null;
  gross_salary: number | null;
  net_salary: number | null;
  employer_contributions: number | null;
  bonus: number | null;
  vouchers: number | null;
  monthly_hours: number | null;
  monthly_cost: number | null;
  hourly_cost: number | null;
  auth_user_id: string | null;
  is_active: boolean | null;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return `€${Number(value).toFixed(2)}`;
}

export default function EmployeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, {
        method: "GET",
      });
      const payload = (await response.json().catch(() => null)) as
        | { employee?: Employee; error?: string }
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Неуспешно зареждане на служителя. Възможно е да не съществува.");
        setEmployee(null);
        setIsLoading(false);
        return;
      }

      setEmployee(payload?.employee ?? null);
      setIsLoading(false);
    };

    fetchEmployee();
  }, [id]);

  const handleDelete = async () => {
    const isConfirmed = window.confirm("Сигурни ли сте, че искате да изтриете този служител?");
    if (!isConfirmed) return;

    setDeleteErrorMessage("");
    setIsDeleting(true);

    if (!id) {
      setDeleteErrorMessage("Липсва идентификатор на служител.");
      setIsDeleting(false);
      return;
    }

    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      setDeleteErrorMessage("Неуспешно изтриване на служителя. Моля, опитайте отново.");
      setIsDeleting(false);
      return;
    }

    router.push("/employees");
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-zinc-600">Зареждане на служител...</p>
      </div>
    );
  }

  if (errorMessage || !employee) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage || "Служителят не е намерен."}</div>
        <Link href="/employees" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Назад към служителите
        </Link>
      </div>
    );
  }

  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Неизвестен";
  const linkedStatusLabel = !employee.auth_user_id
    ? "Несвързан"
    : employee.is_active === false
      ? "Свързан (неактивен)"
      : "Свързан (активен)";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/employees" className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
            ← Назад към служителите
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">{fullName}</h1>
          {employee.position && <p className="mt-1 text-sm text-zinc-600">{employee.position}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/employees/${id}/edit`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Редактирай
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            {isDeleting ? "Изтриване..." : "Изтрий"}
          </button>
        </div>
      </div>

      {deleteErrorMessage && <p className="mb-4 text-sm text-red-600">{deleteErrorMessage}</p>}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Детайли</h2>
        </div>
        <dl className="divide-y divide-zinc-100">
          <DetailRow label="Име" value={employee.first_name} />
          <DetailRow label="Фамилия" value={employee.last_name} />
          <DetailRow label="Позиция" value={employee.position} />
          <DetailRow label="Отдел" value={employee.department} />
          <DetailRow label="Имейл" value={employee.email} />
          <DetailRow label="Телефон" value={employee.phone} />
          <DetailRow label="Свързан акаунт" value={linkedStatusLabel} />
          <DetailRow label="Auth user id" value={employee.auth_user_id ?? "-"} />
          <DetailRow label="Дата на раждане" value={formatDate(employee.birth_date)} />
          <DetailRow label="Снимка (URL)" value={employee.photo_url} />
        </dl>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Възнаграждение</h2>
        </div>
        <dl className="divide-y divide-zinc-100">
          <DetailRow label="Часове на ден" value={employee.hours_per_day != null ? String(employee.hours_per_day) : "-"} />
          <DetailRow label="Брутна заплата" value={formatCurrency(employee.gross_salary)} />
          <DetailRow label="Нетна заплата" value={formatCurrency(employee.net_salary)} />
          <DetailRow label="Осигуровки от работодател" value={formatCurrency(employee.employer_contributions)} />
          <DetailRow label="Бонус" value={formatCurrency(employee.bonus)} />
          <DetailRow label="Ваучери" value={formatCurrency(employee.vouchers)} />
          <DetailRow label="Месечни часове" value={employee.monthly_hours != null ? String(employee.monthly_hours) : "-"} />
          <DetailRow label="Месечен разход" value={formatCurrency(employee.monthly_cost)} />
          <DetailRow
            label="Часова себестойност"
            value={
              employee.hourly_cost != null && !Number.isNaN(employee.hourly_cost)
                ? `€${Number(employee.hourly_cost).toFixed(4)}`
                : "-"
            }
          />
        </dl>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-right text-sm text-zinc-900">{value ?? "-"}</dd>
    </div>
  );
}
