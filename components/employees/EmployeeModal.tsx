"use client";

import { useEffect, useMemo, useState } from "react";
import type { Employee, WorkdayHours } from "./types";
import { computeHourlyCost, loadEmployees } from "./storage";
import { formatEUR, CURRENCY_SYMBOL } from "@/lib/money";

interface EmployeeFormData {
  fullName: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  workdayHours: WorkdayHours;
  salaryFixed: number;
  bonusFixed: number;
  vouchersFixed: number;
}

interface Props {
  mode: "add" | "edit";
  employee?: Employee;
  onClose: () => void;
  onSave: (data: EmployeeFormData, password?: string) => void;
  onResetPassword?: (employeeId: string, newPassword: string) => void;
}

const WORKDAY_OPTIONS: WorkdayHours[] = [4, 6, 8];

export function EmployeeModal({
  mode,
  employee,
  onClose,
  onSave,
  onResetPassword,
}: Props) {
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">(
    employee?.role ?? "EMPLOYEE"
  );
  const [workdayHours, setWorkdayHours] = useState<WorkdayHours>(
    employee?.workdayHours ?? 8
  );
  const [salaryFixed, setSalaryFixed] = useState(
    employee?.salaryFixed?.toString() ?? ""
  );
  const [bonusFixed, setBonusFixed] = useState(
    employee?.bonusFixed?.toString() ?? "0"
  );
  const [vouchersFixed, setVouchersFixed] = useState(
    employee?.vouchersFixed?.toString() ?? "200"
  );
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [showResetSection, setShowResetSection] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const computedCost = useMemo(() => {
    const s = parseFloat(salaryFixed) || 0;
    const b = parseFloat(bonusFixed) || 0;
    const v = parseFloat(vouchersFixed) || 0;
    return computeHourlyCost(s, b, v, workdayHours);
  }, [salaryFixed, bonusFixed, vouchersFixed, workdayHours]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!fullName.trim()) next.fullName = "Name is required.";

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      next.email = "Enter a valid email.";
    } else {
      const existing = loadEmployees().find(
        (e) =>
          e.email.toLowerCase() === emailTrimmed &&
          e.id !== employee?.id
      );
      if (existing) next.email = "This email is already in use.";
    }

    if (!salaryFixed.trim() || isNaN(parseFloat(salaryFixed))) {
      next.salaryFixed = "Salary is required.";
    }
    if (mode === "add" && !password.trim()) {
      next.password = "Password is required.";
    }
    if (mode === "add" && password.trim().length < 6) {
      next.password = "Password must be at least 6 characters.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: EmployeeFormData = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      workdayHours,
      salaryFixed: parseFloat(salaryFixed) || 0,
      bonusFixed: parseFloat(bonusFixed) || 0,
      vouchersFixed: parseFloat(vouchersFixed) || 0,
    };

    onSave(data, mode === "add" ? password : undefined);
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPassword.trim() || resetPassword.trim().length < 6) return;
    if (employee && onResetPassword) {
      onResetPassword(employee.id, resetPassword.trim());
      setResetPassword("");
      setShowResetSection(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-100">
            {mode === "add" ? "Add Employee" : "Edit Employee"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maria Ivanova"
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@digitalnosti.bg"
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Role + Workday hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "ADMIN" | "EMPLOYEE")
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400">
                  Hours / Day
                </label>
                <select
                  value={workdayHours}
                  onChange={(e) =>
                    setWorkdayHours(Number(e.target.value) as WorkdayHours)
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
                >
                  {WORKDAY_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compensation section */}
            <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/20 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Compensation (Admin only)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">
                    Salary net ({CURRENCY_SYMBOL}) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={salaryFixed}
                    onChange={(e) => setSalaryFixed(e.target.value)}
                    placeholder="3000"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
                  />
                  {errors.salaryFixed && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.salaryFixed}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400">
                    Bonus ({CURRENCY_SYMBOL})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={bonusFixed}
                    onChange={(e) => setBonusFixed(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400">
                    Vouchers ({CURRENCY_SYMBOL})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={vouchersFixed}
                    onChange={(e) => setVouchersFixed(e.target.value)}
                    placeholder="200"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
                  />
                </div>
              </div>
              {/* Computed cost */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
                <span className="text-xs text-zinc-500">
                  Computed hourly cost
                  <span className="ml-1 text-zinc-600">
                    (salary+bonus+vouchers) / (h/day × 20 days)
                  </span>
                </span>
                <span className="font-mono text-sm font-semibold text-lime-400">
                  {formatEUR(computedCost)}/h
                </span>
              </div>
            </div>

            {/* Password (add mode only) */}
            {mode === "add" && (
              <div>
                <label className="block text-xs font-medium text-zinc-400">
                  Initial Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">{errors.password}</p>
                )}
              </div>
            )}
          </form>

          {/* Password reset (edit mode only) */}
          {mode === "edit" && onResetPassword && (
            <div className="mt-5 border-t border-zinc-800 pt-4">
              {!showResetSection ? (
                <button
                  type="button"
                  onClick={() => setShowResetSection(true)}
                  className="text-xs text-zinc-500 underline-offset-2 transition hover:text-zinc-300 hover:underline"
                >
                  Reset password
                </button>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-400">
                    New Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="flex-1 rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
                    />
                    <button
                      type="submit"
                      disabled={resetPassword.trim().length < 6}
                      className="rounded-xl bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-600 disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetSection(false);
                        setResetPassword("");
                      }}
                      className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="employee-form"
            className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
          >
            {mode === "add" ? "Add Employee" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
