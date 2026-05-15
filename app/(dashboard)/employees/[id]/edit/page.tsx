"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

type EmployeeFormValues = {
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  birth_date: string;
  photo_url: string;
  hours_per_day: string;
  gross_salary: string;
  net_salary: string;
  employer_contributions: string;
  bonus: string;
  vouchers: string;
  monthly_hours: string;
};

const initialValues: EmployeeFormValues = {
  first_name: "",
  last_name: "",
  position: "",
  department: "",
  email: "",
  phone: "",
  birth_date: "",
  photo_url: "",
  hours_per_day: "",
  gross_salary: "",
  net_salary: "",
  employer_contributions: "",
  bonus: "",
  vouchers: "",
  monthly_hours: "",
};

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [formValues, setFormValues] = useState<EmployeeFormValues>(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        | {
            employee?: {
              first_name?: string | null;
              last_name?: string | null;
              position?: string | null;
              department?: string | null;
              email?: string | null;
              phone?: string | null;
              birth_date?: string | null;
              photo_url?: string | null;
              hours_per_day?: number | null;
              gross_salary?: number | null;
              net_salary?: number | null;
              employer_contributions?: number | null;
              bonus?: number | null;
              vouchers?: number | null;
              monthly_hours?: number | null;
            };
            error?: string;
          }
        | null;
      const employee = payload?.employee;

      if (!response.ok || !employee) {
        setErrorMessage(payload?.error ?? "Could not load employee data.");
        setIsLoading(false);
        return;
      }

      setFormValues({
        first_name: employee.first_name ?? "",
        last_name: employee.last_name ?? "",
        position: employee.position ?? "",
        department: employee.department ?? "",
        email: employee.email ?? "",
        phone: employee.phone ?? "",
        birth_date: employee.birth_date ?? "",
        photo_url: employee.photo_url ?? "",
        hours_per_day: employee.hours_per_day != null ? String(employee.hours_per_day) : "",
        gross_salary: employee.gross_salary != null ? String(employee.gross_salary) : "",
        net_salary: employee.net_salary != null ? String(employee.net_salary) : "",
        employer_contributions:
          employee.employer_contributions != null ? String(employee.employer_contributions) : "",
        bonus: employee.bonus != null ? String(employee.bonus) : "",
        vouchers: employee.vouchers != null ? String(employee.vouchers) : "",
        monthly_hours: employee.monthly_hours != null ? String(employee.monthly_hours) : "",
      });
      setIsLoading(false);
    };

    fetchEmployee();
  }, [id]);

  const handleInputChange = (field: keyof EmployeeFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const toNullableText = (value: string) => {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  const toNullableNumber = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") return null;

    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    if (!id) {
      setErrorMessage("Missing employee id.");
      setIsSaving(false);
      return;
    }

    const updatedEmployee = {
      id,
      first_name: toNullableText(formValues.first_name),
      last_name: toNullableText(formValues.last_name),
      position: toNullableText(formValues.position),
      department: toNullableText(formValues.department),
      email: toNullableText(formValues.email),
      phone: toNullableText(formValues.phone),
      birth_date: toNullableText(formValues.birth_date),
      photo_url: toNullableText(formValues.photo_url),
      hours_per_day: toNullableNumber(formValues.hours_per_day),
      gross_salary: toNullableNumber(formValues.gross_salary),
      net_salary: toNullableNumber(formValues.net_salary),
      employer_contributions: toNullableNumber(formValues.employer_contributions),
      bonus: toNullableNumber(formValues.bonus),
      vouchers: toNullableNumber(formValues.vouchers),
      monthly_hours: toNullableNumber(formValues.monthly_hours),
    };

    const response = await fetch("/api/employees", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedEmployee),
    });
    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; error?: string }
      | null;

    if (!response.ok || payload?.success !== true) {
      setErrorMessage(payload?.error ?? "Could not update employee. Please try again.");
      setIsSaving(false);
      return;
    }

    router.push(`/employees/${id}`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-sm text-zinc-600">Loading employee data...</p>
      </div>
    );
  }

  if (errorMessage && !isSaving) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{errorMessage}</div>
        <Link href={`/employees/${id}`} className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to employee details
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <Link href={`/employees/${id}`} className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to employee details
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Employee</h1>
        <p className="mt-1 text-sm text-zinc-500">Update employee information below.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="first_name" className="text-sm font-medium text-zinc-700">
              First name
            </label>
            <input
              id="first_name"
              type="text"
              value={formValues.first_name}
              onChange={(event) => handleInputChange("first_name", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="last_name" className="text-sm font-medium text-zinc-700">
              Last name
            </label>
            <input
              id="last_name"
              type="text"
              value={formValues.last_name}
              onChange={(event) => handleInputChange("last_name", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="position" className="text-sm font-medium text-zinc-700">
              Position
            </label>
            <input
              id="position"
              type="text"
              value={formValues.position}
              onChange={(event) => handleInputChange("position", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="department" className="text-sm font-medium text-zinc-700">
              Department
            </label>
            <input
              id="department"
              type="text"
              value={formValues.department}
              onChange={(event) => handleInputChange("department", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formValues.email}
              onChange={(event) => handleInputChange("email", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium text-zinc-700">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={formValues.phone}
              onChange={(event) => handleInputChange("phone", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="birth_date" className="text-sm font-medium text-zinc-700">
              Birth date
            </label>
            <input
              id="birth_date"
              type="date"
              value={formValues.birth_date}
              onChange={(event) => handleInputChange("birth_date", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="photo_url" className="text-sm font-medium text-zinc-700">
              Photo URL
            </label>
            <input
              id="photo_url"
              type="url"
              value={formValues.photo_url}
              onChange={(event) => handleInputChange("photo_url", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="hours_per_day" className="text-sm font-medium text-zinc-700">
              Hours per day
            </label>
            <input
              id="hours_per_day"
              type="number"
              step="0.01"
              min="0"
              value={formValues.hours_per_day}
              onChange={(event) => handleInputChange("hours_per_day", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="gross_salary" className="text-sm font-medium text-zinc-700">
              Gross salary
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="gross_salary"
                type="number"
                step="0.01"
                min="0"
                value={formValues.gross_salary}
                onChange={(event) => handleInputChange("gross_salary", event.target.value)}
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="net_salary" className="text-sm font-medium text-zinc-700">
              Net salary
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="net_salary"
                type="number"
                step="0.01"
                min="0"
                value={formValues.net_salary}
                onChange={(event) => handleInputChange("net_salary", event.target.value)}
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bonus" className="text-sm font-medium text-zinc-700">
              Bonus
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="bonus"
                type="number"
                step="0.01"
                min="0"
                value={formValues.bonus}
                onChange={(event) => handleInputChange("bonus", event.target.value)}
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="vouchers" className="text-sm font-medium text-zinc-700">
              Vouchers
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="vouchers"
                type="number"
                step="0.01"
                min="0"
                value={formValues.vouchers}
                onChange={(event) => handleInputChange("vouchers", event.target.value)}
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="employer_contributions" className="text-sm font-medium text-zinc-700">
              Employer contributions
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="employer_contributions"
                type="number"
                step="0.01"
                min="0"
                value={formValues.employer_contributions}
                onChange={(event) => handleInputChange("employer_contributions", event.target.value)}
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="monthly_hours" className="text-sm font-medium text-zinc-700">
              Monthly hours
            </label>
            <input
              id="monthly_hours"
              type="number"
              step="0.01"
              min="0"
              value={formValues.monthly_hours}
              onChange={(event) => handleInputChange("monthly_hours", event.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href={`/employees/${id}`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
