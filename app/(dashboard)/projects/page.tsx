export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-4 text-[var(--color-bs-text)]">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Проекти</h1>
        <p className="text-sm text-[var(--color-bs-muted)]">Активни и приключени проекти на компанията.</p>
      </div>
      <div className="bs-surface-card rounded-xl p-6">
        <p className="text-sm text-[var(--color-bs-muted)]">
          Страницата е визуално синхронизирана с graphite темата.
        </p>
      </div>
    </div>
  );
}
