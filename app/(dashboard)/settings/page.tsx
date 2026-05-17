import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Настройки</h1>
        <p className="text-sm text-[var(--color-bs-muted)]">Настройки на профила и приложението.</p>
      </div>
      <Link
        href="/settings/users"
        className="bs-btn w-fit px-4 py-2 text-sm font-medium"
      >
        Управление на потребители
      </Link>
    </div>
  );
}
