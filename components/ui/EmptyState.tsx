import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  /** Use 'compact' for inline sections (e.g. client detail tables). */
  variant?: "default" | "compact" | "dark" | "compact-dark";
};

export function EmptyState({ title, description, actionHref, actionLabel, variant = "default" }: EmptyStateProps) {
  const isCompact = variant === "compact";
  const isDark = variant === "dark";
  const isCompactDark = variant === "compact-dark";

  return (
    <div
      className={
        isCompact
          ? "flex flex-col items-center justify-center gap-3 px-4 py-8 text-center"
          : isCompactDark
            ? "flex flex-col items-center justify-center gap-3 px-4 py-8 text-center"
          : isDark
            ? "bs-surface-card flex flex-col items-center justify-center gap-4 rounded-xl px-6 py-12 text-center"
          : "flex flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center"
      }
    >
      <p className={`text-sm font-medium ${isDark || isCompactDark ? "text-[var(--color-bs-text)]" : "text-zinc-900"}`}>
        {title}
      </p>
      <p
        className={`max-w-sm text-sm ${
          isDark || isCompactDark ? "text-[var(--color-bs-muted)]" : "text-zinc-500"
        }`}
      >
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className={`mt-1 px-4 py-2 text-sm font-medium transition-colors ${
            isDark || isCompactDark ? "bs-btn-primary" : "rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
          }`}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
