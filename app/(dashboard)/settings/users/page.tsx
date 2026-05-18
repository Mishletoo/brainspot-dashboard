"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "@/components/ui";
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

type PasswordModalState = {
  email: string | null;
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
      return "bs-status-success";
    case "inactive":
      return "bs-status-danger";
    default:
      return "bs-status-warning";
  }
}

type UserRowActionsProps = {
  user: UserRow;
  currentUserId: string | null;
  isBusy: boolean;
  onToggleStatus: (user: UserRow) => void;
  onResetPassword: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
};

function UserRowActions({
  user,
  currentUserId,
  isBusy,
  onToggleStatus,
  onResetPassword,
  onDelete,
}: UserRowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isSelf = currentUserId != null && user.id === currentUserId;

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const actionItems = [
    {
      key: "toggle",
      label: user.isActive ? "Деактивирай" : "Активирай",
      onClick: () => onToggleStatus(user),
      destructive: false,
    },
    {
      key: "password",
      label: "Нова парола",
      onClick: () => onResetPassword(user),
      destructive: false,
    },
    {
      key: "delete",
      label: "Изтрий",
      onClick: () => onDelete(user),
      destructive: true,
    },
  ].filter((item) => !(item.key === "delete" && isSelf));

  const runAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const compactButtonClass =
    "bs-btn whitespace-nowrap px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50";
  const destructiveButtonClass =
    "inline-flex items-center whitespace-nowrap rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <div className="hidden min-w-0 flex-wrap gap-1 xl:flex">
        <button
          type="button"
          onClick={() => onToggleStatus(user)}
          disabled={isBusy}
          className={compactButtonClass}
        >
          {user.isActive ? "Деактивирай" : "Активирай"}
        </button>
        <button
          type="button"
          onClick={() => onResetPassword(user)}
          disabled={isBusy}
          className={compactButtonClass}
        >
          Нова парола
        </button>
        {!isSelf && (
          <button
            type="button"
            onClick={() => onDelete(user)}
            disabled={isBusy}
            className={destructiveButtonClass}
          >
            Изтрий
          </button>
        )}
      </div>

      <div ref={menuRef} className="relative xl:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          disabled={isBusy}
          className={compactButtonClass}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          Действия ▾
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[10.5rem] overflow-hidden rounded-lg border border-[var(--color-bs-border-soft)] bg-[#121417] py-1 shadow-xl"
          >
            {actionItems.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => runAction(item.onClick)}
                disabled={isBusy}
                className={`block w-full px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50 ${
                  item.destructive ? "text-rose-200" : "text-[var(--color-bs-text)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [form, setForm] = useState<CreateUserForm>(initialForm);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserRow | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [passwordModal, setPasswordModal] = useState<PasswordModalState | null>(null);

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
      | { users?: UserRow[]; currentUserId?: string; error?: string }
      | null;

    if (!response.ok) {
      setUsers([]);
      setCurrentUserId(null);
      setErrorMessage(payload?.error ?? "Неуспешно зареждане на потребители.");
      setIsLoading(false);
      return;
    }

    setUsers(payload?.users ?? []);
    setCurrentUserId(payload?.currentUserId ?? null);
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
      setToast({ message: payload?.error ?? "Ролята не беше обновена.", variant: "error" });
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
      setToast({ message: payload?.error ?? "Статусът не беше обновен.", variant: "error" });
      setBusyRowId(null);
      return;
    }

    setSuccessMessage(user.isActive ? "Потребителят е деактивиран." : "Потребителят е активиран.");
    setBusyRowId(null);
    await loadUsers();
  };

  const handleResetPassword = async (user: UserRow) => {
    setBusyRowId(user.id);

    const response = await fetch(`/api/users/${user.id}/reset-password`, { method: "POST" });
    const payload = (await response.json().catch(() => null)) as
      | { temporaryPassword?: string; error?: string }
      | null;

    setBusyRowId(null);

    if (!response.ok || !payload?.temporaryPassword) {
      setToast({
        message: payload?.error ?? "Паролата не беше генерирана.",
        variant: "error",
      });
      return;
    }

    setPasswordModal({
      email: user.email,
      temporaryPassword: payload.temporaryPassword,
    });
  };

  const handleCopyPassword = async () => {
    if (!passwordModal?.temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(passwordModal.temporaryPassword);
      setToast({ message: "Паролата е копирана.", variant: "success" });
    } catch {
      setToast({ message: "Копирането не беше успешно.", variant: "error" });
    }
  };

  const closePasswordModal = () => {
    setPasswordModal(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;

    setIsDeletingUser(true);

    const response = await fetch(`/api/users/${deleteConfirmUser.id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setToast({
        message: payload?.error ?? "Потребителят не беше изтрит.",
        variant: "error",
      });
      setIsDeletingUser(false);
      return;
    }

    setDeleteConfirmUser(null);
    setIsDeletingUser(false);
    setToast({ message: "Потребителят е изтрит завинаги.", variant: "success" });
    await loadUsers();
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Управление на потребители</h1>
        <p className="mt-1 text-sm text-[var(--color-bs-muted)]">
          Създавайте потребители за вход и управлявайте роли и достъп до системата.
        </p>
      </div>

      <section className="bs-surface-card rounded-xl p-5">
        <h2 className="text-sm font-medium text-[var(--color-bs-text)]">Нов потребител</h2>
        <form onSubmit={handleCreateUser} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="user_email" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Имейл
            </label>
            <input
              id="user_email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="bs-input mt-1 w-full px-3 py-2 text-sm"
              placeholder="staff@brainspot.bg"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="user_role" className="text-sm font-medium text-[var(--color-bs-muted)]">
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
              className="bs-input mt-1 w-full px-3 py-2 text-sm"
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
            <label htmlFor="temporary_password" className="text-sm font-medium text-[var(--color-bs-muted)]">
              Временна парола
            </label>
            <input
              id="temporary_password"
              type="text"
              value={form.temporaryPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, temporaryPassword: event.target.value }))
              }
              className="bs-input mt-1 w-full px-3 py-2 text-sm"
              disabled={isSubmitting}
            />
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="bs-btn-primary px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Създаване..." : "Създай потребител"}
            </button>
          </div>
        </form>
      </section>

      {errorMessage && (
        <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-200">
          {successMessage}
        </div>
      )}

      <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-bs-border-soft)] bg-[rgba(18,20,23,0.74)] shadow-[0_18px_36px_-28px_rgba(0,0,0,0.9)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-bs-border-soft)] bg-white/5 text-[var(--color-bs-subtle)]">
              <tr>
                <th className="px-4 py-3 font-medium">Имейл</th>
                <th className="px-4 py-3 font-medium">Роля</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="hidden min-[1100px]:table-cell px-4 py-3 font-medium">Свързан служител</th>
                <th className="hidden lg:table-cell px-4 py-3 font-medium">Създадено</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-[var(--color-bs-muted)]" colSpan={6}>
                    Зареждане...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-[var(--color-bs-muted)]" colSpan={6}>
                    Все още няма потребители.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isRowBusy = busyRowId === user.id;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--color-bs-border-soft)]/80 align-top last:border-b-0"
                    >
                      <td className="max-w-[12rem] truncate px-4 py-3 text-[var(--color-bs-text)]">
                        {user.email ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(event) => handleRoleChange(user.id, event.target.value as AppRole)}
                          className="bs-input max-w-[9.5rem] rounded-md px-2 py-1 text-sm"
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
                      <td className="hidden min-[1100px]:table-cell max-w-[10rem] truncate px-4 py-3 text-[var(--color-bs-muted)]">
                        {user.linkedEmployeeName ?? user.linkedEmployeeId ?? "-"}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-[var(--color-bs-muted)] lg:table-cell">
                        {formatCreatedAt(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <UserRowActions
                          user={user}
                          currentUserId={currentUserId}
                          isBusy={isRowBusy}
                          onToggleStatus={(target) => void handleStatusToggle(target)}
                          onResetPassword={(target) => void handleResetPassword(target)}
                          onDelete={setDeleteConfirmUser}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}

      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
          >
            <h2 id="delete-user-title" className="text-lg font-semibold text-white">
              Изтриване на потребител
            </h2>
            <p className="mt-3 text-sm text-zinc-300">
              Сигурни ли сте, че искате да изтриете този потребител завинаги? Това действие не може да
              бъде отменено.
            </p>
            {deleteConfirmUser.email && (
              <p className="mt-2 text-sm font-medium text-zinc-100">{deleteConfirmUser.email}</p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                disabled={isDeletingUser}
                className="inline-flex justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeletingUser}
                className="inline-flex justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeletingUser ? "Изтриване..." : "Изтрий завинаги"}
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-password-title"
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
          >
            <h2 id="new-password-title" className="text-lg font-semibold text-white">
              Нова временна парола
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              {passwordModal.email
                ? `Потребител: ${passwordModal.email}`
                : "Копирайте паролата и я предайте на потребителя."}
            </p>
            <p className="mt-3 text-xs text-zinc-400">
              Паролата се показва само веднъж. След затваряне на прозореца няма да бъде достъпна отново.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                readOnly
                value={passwordModal.temporaryPassword}
                className="bs-input min-w-0 flex-1 px-3 py-2 font-mono text-sm"
                aria-label="Нова временна парола"
              />
              <button
                type="button"
                onClick={() => void handleCopyPassword()}
                className="bs-btn shrink-0 px-3 py-2 text-sm font-medium"
              >
                Копирай парола
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closePasswordModal}
                className="inline-flex justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
              >
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
