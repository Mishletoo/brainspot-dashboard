import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Настройки</h1>
        <p className="text-sm text-zinc-500">Настройки на профила и приложението.</p>
      </div>
      <Link
        href="/settings/users"
        className="w-fit rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Управление на потребители
      </Link>
    </div>
  );
}
