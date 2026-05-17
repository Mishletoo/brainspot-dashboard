"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessAppPath, type AppRole } from "@/lib/roles";

const navLinks = [
  { label: "Табло", href: "/" },
  { label: "Служители", href: "/employees" },
  { label: "Клиенти", href: "/clients" },
  { label: "Отчети за работа", href: "/work-reports" },
  { label: "Договори", href: "/contracts" },
  { label: "Фактури", href: "/invoices" },
  { label: "Услуги", href: "/services" },
  { label: "Проекти", href: "/projects" },
  { label: "Финанси", href: "/finance" },
  { label: "Справки", href: "/reports" },
  { label: "Настройки", href: "/settings" },
  { label: "Управление на потребители", href: "/settings/users" },
  { label: "Профил", href: "/profile" },
];

type SidebarProps = {
  initialRole: AppRole;
};

function NavIcon({ href }: { href: string }) {
  const baseProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4 shrink-0",
    "aria-hidden": true,
  };

  if (href === "/") {
    return (
      <svg {...baseProps}>
        <path d="M3 11.2 12 4l9 7.2" />
        <path d="M5.5 10.8V20h13V10.8" />
      </svg>
    );
  }

  if (href.startsWith("/employees") || href === "/settings/users" || href === "/users") {
    return (
      <svg {...baseProps}>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
        <circle cx="17.2" cy="9.5" r="2" />
      </svg>
    );
  }

  if (href.startsWith("/clients")) {
    return (
      <svg {...baseProps}>
        <path d="M4 20h16" />
        <path d="M6 20V7.5h5V20" />
        <path d="M13 20v-11h5v11" />
        <path d="M7.8 10.5h1.4M7.8 13.2h1.4M14.8 12h1.4M14.8 14.7h1.4" />
      </svg>
    );
  }

  if (href.startsWith("/work-reports") || href.startsWith("/reports")) {
    return (
      <svg {...baseProps}>
        <path d="M5 20V7.8A1.8 1.8 0 0 1 6.8 6h8.4L19 9.8V20" />
        <path d="M15.2 6v3.8H19" />
        <path d="M8 13h8M8 16h6" />
      </svg>
    );
  }

  if (href.startsWith("/contracts")) {
    return (
      <svg {...baseProps}>
        <rect x="4.5" y="5" width="15" height="15" rx="2.2" />
        <path d="m8.2 12 2.1 2.1 5.5-5.5" />
      </svg>
    );
  }

  if (href.startsWith("/invoices") || href.startsWith("/finance")) {
    return (
      <svg {...baseProps}>
        <rect x="3.8" y="6" width="16.4" height="12" rx="2.2" />
        <path d="M3.8 10.2h16.4" />
        <circle cx="8.8" cy="14.1" r="1.1" />
      </svg>
    );
  }

  if (href.startsWith("/services")) {
    return (
      <svg {...baseProps}>
        <path d="M12 3.5 20 8v8L12 20.5 4 16V8l8-4.5Z" />
        <path d="m4 8 8 4.5L20 8" />
      </svg>
    );
  }

  if (href.startsWith("/projects")) {
    return (
      <svg {...baseProps}>
        <path d="M3.8 8.2h16.4v10.3a1.7 1.7 0 0 1-1.7 1.7H5.5a1.7 1.7 0 0 1-1.7-1.7V8.2Z" />
        <path d="M8.2 8.2V6.4A1.4 1.4 0 0 1 9.6 5h4.8a1.4 1.4 0 0 1 1.4 1.4v1.8" />
      </svg>
    );
  }

  if (href.startsWith("/settings") || href.startsWith("/profile")) {
    return (
      <svg {...baseProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.8 14.2-.7.4a1.3 1.3 0 0 0-.7 1.2v.8a1 1 0 0 1-1 1H16a1.3 1.3 0 0 0-1.2.7l-.4.7a1 1 0 0 1-.9.5h-3a1 1 0 0 1-.9-.5l-.4-.7a1.3 1.3 0 0 0-1.2-.7h-.8a1 1 0 0 1-1-1v-.8a1.3 1.3 0 0 0-.7-1.2l-.7-.4a1 1 0 0 1-.5-.9v-2.4a1 1 0 0 1 .5-.9l.7-.4A1.3 1.3 0 0 0 6.2 8v-.8a1 1 0 0 1 1-1H8a1.3 1.3 0 0 0 1.2-.7l.4-.7a1 1 0 0 1 .9-.5h3a1 1 0 0 1 .9.5l.4.7a1.3 1.3 0 0 0 1.2.7h.8a1 1 0 0 1 1 1V8a1.3 1.3 0 0 0 .7 1.2l.7.4a1 1 0 0 1 .5.9v2.4a1 1 0 0 1-.5.9Z" />
      </svg>
    );
  }

  return (
    <svg {...baseProps}>
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

export default function Sidebar({ initialRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleLinks = useMemo(
    () => navLinks.filter((link) => canAccessAppPath(link.href, initialRole)),
    [initialRole],
  );

  return (
    <aside className="relative flex h-screen w-56 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0d0f12]/95 px-3 py-4 text-slate-200 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/18 to-transparent"
      />

      <div className="mb-5 flex items-center gap-2.5 px-2 py-1">
        <Image
          src="/logos/brain_spot_logo-05.png"
          alt="Brainspot"
          width={36}
          height={36}
          priority
          className="h-[36px] w-[36px] object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-100">Brainspot</p>
          <p className="truncate text-[11px] text-slate-400">Dashboard</p>
        </div>
      </div>

      <nav className="bs-scroll-fade flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {visibleLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "border-white/20 bg-gradient-to-r from-[#272a30]/74 via-[#20242b]/72 to-[#1a1e25]/68 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                  : "border-transparent text-slate-300 hover:border-white/15 hover:bg-white/[0.05] hover:text-slate-100"
              }`}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--color-bs-accent)]"
                  style={{ boxShadow: "0 0 12px rgb(var(--color-bs-accent-rgb) / 0.6)" }}
                />
              )}
              <span
                className={`flex items-center ${
                  isActive ? "text-[var(--color-bs-accent)]" : "text-slate-400 group-hover:text-slate-200"
                }`}
              >
                <NavIcon href={link.href} />
              </span>
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[11px] text-slate-400">Brainspot internal system</p>
      </div>
    </aside>
  );
}
