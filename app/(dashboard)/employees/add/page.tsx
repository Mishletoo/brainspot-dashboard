 "use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

export default function AddEmployeePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const toNullableText = (value: FormDataEntryValue | null) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed === "" ? null : trimmed;
  };

  const toNullableNumber = (value: FormDataEntryValue | null) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (text === "") return null;

    const parsed = Number(text);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    const employeeData = {
      first_name: toNullableText(formData.get("first_name")),
      last_name: toNullableText(formData.get("last_name")),
      position: toNullableText(formData.get("position")),
      department: toNullableText(formData.get("department")),
      email: toNullableText(formData.get("email")),
      phone: toNullableText(formData.get("phone")),
      birth_date: toNullableText(formData.get("birth_date")),
      photo_url: toNullableText(formData.get("photo_url")),
      hours_per_day: toNullableNumber(formData.get("hours_per_day")),
      gross_salary: toNullableNumber(formData.get("gross_salary")),
      net_salary: toNullableNumber(formData.get("net_salary")),
      employer_contributions: toNullableNumber(formData.get("employer_contributions")),
      bonus: toNullableNumber(formData.get("bonus")),
      vouchers: toNullableNumber(formData.get("vouchers")),
      monthly_hours: toNullableNumber(formData.get("monthly_hours")),
    };

    const { error } = await supabase.from("employees").insert(employeeData);

    if (error) {
      setErrorMessage("Неуспешно запазване на служителя. Моля, опитайте отново.");
      setIsSaving(false);
      return;
    }

    router.push("/employees");
  };

  const handleCancel = () => {
    router.push("/employees");
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Добавяне на служител</h1>
        <p className="mt-1 text-sm text-zinc-500">Попълнете данните за служителя.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="first_name" className="text-sm font-medium text-zinc-700">
              Име
            </label>
            <input id="first_name" name="first_name" type="text" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="last_name" className="text-sm font-medium text-zinc-700">
              Фамилия
            </label>
            <input id="last_name" name="last_name" type="text" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="position" className="text-sm font-medium text-zinc-700">
              Позиция
            </label>
            <input id="position" name="position" type="text" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="department" className="text-sm font-medium text-zinc-700">
              Отдел
            </label>
            <input id="department" name="department" type="text" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Имейл
            </label>
            <input id="email" name="email" type="email" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium text-zinc-700">
              Телефон
            </label>
            <input id="phone" name="phone" type="tel" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="birth_date" className="text-sm font-medium text-zinc-700">
              Дата на раждане
            </label>
            <input id="birth_date" name="birth_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="photo_url" className="text-sm font-medium text-zinc-700">
              Снимка (URL)
            </label>
            <input id="photo_url" name="photo_url" type="url" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="hours_per_day" className="text-sm font-medium text-zinc-700">
              Часове на ден
            </label>
            <input
              id="hours_per_day"
              name="hours_per_day"
              type="number"
              step="0.01"
              min="0"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="gross_salary" className="text-sm font-medium text-zinc-700">
              Брутна заплата
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="gross_salary"
                name="gross_salary"
                type="number"
                step="0.01"
                min="0"
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="net_salary" className="text-sm font-medium text-zinc-700">
              Нетна заплата
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="net_salary"
                name="net_salary"
                type="number"
                step="0.01"
                min="0"
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bonus" className="text-sm font-medium text-zinc-700">
              Бонус
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="bonus"
                name="bonus"
                type="number"
                step="0.01"
                min="0"
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="vouchers" className="text-sm font-medium text-zinc-700">
              Ваучери
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="vouchers"
                name="vouchers"
                type="number"
                step="0.01"
                min="0"
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="employer_contributions" className="text-sm font-medium text-zinc-700">
              Осигуровки от работодател
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                €
              </span>
              <input
                id="employer_contributions"
                name="employer_contributions"
                type="number"
                step="0.01"
                min="0"
                className={`${inputClassName} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="monthly_hours" className="text-sm font-medium text-zinc-700">
              Месечни часове
            </label>
            <input
              id="monthly_hours"
              name="monthly_hours"
              type="number"
              step="0.01"
              min="0"
              className={inputClassName}
            />
          </div>
        </div>

        {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Отказ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {isSaving ? "Запазване..." : "Запази служителя"}
          </button>
        </div>
      </form>
    </div>
  );
}
