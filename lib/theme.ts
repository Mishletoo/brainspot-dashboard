/**
 * Brainspot design tokens.
 * Use these in component className strings as Tailwind arbitrary values,
 * e.g. bg-[#c4db57] or reference the exported constants for dynamic logic.
 */

export const colors = {
  accent: "#c4db57",
  accentHover: "#d4eb67",
  bgMain: "#0f1116",
  bgSurface: "#161a22",
  bgCard: "#1c212b",
  textMain: "#ffffff",
  textMuted: "#9ca3af",
  textSubtle: "#6b7280",
  border: "rgba(255,255,255,0.06)",
} as const;

/** Shared Tailwind class snippets for consistent component styling */
export const tw = {
  // Buttons
  btnPrimary:
    "rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300",
  btnGhost:
    "rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200",
  btnNeutral:
    "rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100",
  btnDestructive:
    "rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-700/60 hover:text-zinc-300",

  // Badges
  badgeNeutral:
    "inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300",
  badgeNeutralMuted:
    "inline-flex items-center gap-1.5 rounded-full bg-zinc-800/60 px-2 py-0.5 text-xs font-medium text-zinc-500",

  // Form inputs
  input:
    "w-full rounded-xl border border-zinc-700 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30",
  inputError:
    "w-full rounded-xl border border-red-500/60 bg-[#0f1116] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30",
  label: "mb-1.5 block text-xs font-medium text-zinc-400",

  // Table
  tableCard: "overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#1c212b] shadow-xl",
  tableHeaderCell:
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500",

  // Modal
  modalOverlay:
    "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm",
  modalCard:
    "w-full rounded-2xl border border-white/[0.06] bg-[#1c212b] shadow-2xl",
} as const;

export default { colors, tw };
