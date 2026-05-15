"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { APP_ROLES, APP_ROLE_LABELS, AppRole } from "@/lib/roles";

type UserRow = {
  id: string;
  email: string | null;
  role: AppRole;
  roleLabel: string;
  isActive: boolean;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  linkedEmployeeId: string | null;
  linkedEmployeeName: string | null;
};

type CreateUserForm = {
  email: string;
  role: AppRole;
  temporaryPassword: string;
};

const initialForm: CreateUserForm = {
  email: "",
  role: "employee",
  temporaryPassword: "",
};

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("bg-BG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: UserRow["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "inactive":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<CreateUserForm>(initialForm);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.email.trim().length > 0 &&
      form.temporaryPassword.trim().length >= 8 &&
      !isSubmitting
    );
  }, [form.email, form.temporaryPassword, isSubmitting]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const response = await fetch("/api/users", { method: "GET" });
    const payload = (await response.json().catch(() => null)) as
      | { users?: UserRow[]; error?: string }
      | null;

    if (!response.ok) {
      setUsers([]);
      setErrorMessage(payload?.error ?? "Неуспешно зареждане на потребители.");
      setIsLoading(false);
      return;
    }

    setUsers(payload?.users ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        role: form.role,
        temporaryPassword: form.temporaryPassword,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Потребителят не беше създаден.");
      setIsSubmitting(false);
      return;
    }

    setForm(initialForm);
    setSuccessMessage("Потребителят е създаден успешно.");
    setIsSubmitting(false);
    await loadUsers();
  };

  const handleRoleChange = async (userId: string, role: AppRole) => {
    setBusyRowId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Ролята не беше обновена.");
      setBusyRowId(null);
      return;
    }

    setSuccessMessage("Ролята е обновена.");
    setBusyRowId(null);
    await loadUsers();
  };

  const handleStatusToggle = async (user: UserRow) => {
    setBusyRowId(user.id);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Статусът не беше обновен.");
      setBusyRowId(null);
      return;
    }

    setSuccessMessage(user.isActive ? "Потребителят е деактивиран." : "Потребителят е активиран.");
    setBusyRowId(null);
    await loadUsers();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Управление на потребители</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Създавайте потребители за вход и управлявайте роли и достъп до системата.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-zinc-900">Нов потребител</h2>
        <form onSubmit={handleCreateUser} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="user_email" className="text-sm font-medium text-zinc-700">
              Имейл
            </label>
            <input
              id="user_email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              placeholder="staff@brainspot.bg"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="user_role" className="text-sm font-medium text-zinc-700">
              Роля
            </label>
            <select
              id="user_role"
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  role: event.target.value as AppRole,
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              disabled={isSubmitting}
            >
              {APP_ROLES.map((role) => (
                <option key={role} value={role}>
                  {APP_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="temporary_password" className="text-sm font-medium text-zinc-700">
              Временна парола
            </label>
            <input
              id="temporary_password"
              type="text"
              value={form.temporaryPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, temporaryPassword: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              disabled={isSubmitting}
            />
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Създаване..." : "Създай потребител"}
            </button>
          </div>
        </form>
      </section>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Имейл</th>
              <th className="px-4 py-3 font-medium">Роля</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Свързан служител</th>
              <th className="px-4 py-3 font-medium">Създадено</th>
              <th className="px-4 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-4 text-zinc-600" colSpan={6}>
                  Зареждане...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-zinc-600" colSpan={6}>
                  Все още няма потребители.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isRowBusy = busyRowId === user.id;
                return (
                  <tr key={user.id} className="border-b border-zinc-100 align-top last:border-b-0">
                    <td className="px-4 py-3 text-zinc-900">{user.email ?? "-"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(event) => handleRoleChange(user.id, event.target.value as AppRole)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                        disabled={isRowBusy}
                      >
                        {APP_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {APP_ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(user.status)}`}
                      >
                        {user.status === "active"
                          ? "активен"
                          : user.status === "inactive"
                            ? "неактивен"
                            : "чака свързване"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {user.linkedEmployeeName ?? user.linkedEmployeeId ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{formatCreatedAt(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(user)}
                          disabled={isRowBusy}
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {user.isActive ? "Деактивирай" : "Активирай"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
