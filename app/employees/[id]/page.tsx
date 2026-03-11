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
  bonus: number | null;
  vouchers: number | null;
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
  const id = params.id as string;

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

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setErrorMessage("Could not load employee. It may not exist.");
        setEmployee(null);
        setIsLoading(false);
        return;
      }

      setEmployee(data);
      setIsLoading(false);
    };

    fetchEmployee();
  }, [id]);

  const handleDelete = async () => {
    const isConfirmed = window.confirm("Are you sure you want to delete this employee?");
    if (!isConfirmed) return;

    setDeleteErrorMessage("");
    setIsDeleting(true);

    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      setDeleteErrorMessage("Could not delete employee. Please try again.");
      setIsDeleting(false);
      return;
    }

    router.push("/employees");
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-zinc-600">Loading employee...</p>
      </div>
    );
  }

  if (errorMessage || !employee) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage || "Employee not found."}</div>
        <Link href="/employees" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to employees
        </Link>
      </div>
    );
  }

  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Unknown";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/employees" className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
            ← Back to employees
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">{fullName}</h1>
          {employee.position && <p className="mt-1 text-sm text-zinc-600">{employee.position}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/employees/${id}/edit`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {deleteErrorMessage && <p className="mb-4 text-sm text-red-600">{deleteErrorMessage}</p>}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Details</h2>
        </div>
        <dl className="divide-y divide-zinc-100">
          <DetailRow label="First name" value={employee.first_name} />
          <DetailRow label="Last name" value={employee.last_name} />
          <DetailRow label="Position" value={employee.position} />
          <DetailRow label="Department" value={employee.department} />
          <DetailRow label="Email" value={employee.email} />
          <DetailRow label="Phone" value={employee.phone} />
          <DetailRow label="Birth date" value={formatDate(employee.birth_date)} />
          <DetailRow label="Photo URL" value={employee.photo_url} />
        </dl>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Compensation</h2>
        </div>
        <dl className="divide-y divide-zinc-100">
          <DetailRow label="Hours per day" value={employee.hours_per_day != null ? String(employee.hours_per_day) : "-"} />
          <DetailRow label="Gross salary" value={formatCurrency(employee.gross_salary)} />
          <DetailRow label="Net salary" value={formatCurrency(employee.net_salary)} />
          <DetailRow label="Bonus" value={formatCurrency(employee.bonus)} />
          <DetailRow label="Vouchers" value={formatCurrency(employee.vouchers)} />
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
