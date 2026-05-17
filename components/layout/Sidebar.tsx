"use client";

import { useMemo } from "react";
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

export default function Sidebar({ initialRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleLinks = useMemo(
    () => navLinks.filter((link) => canAccessAppPath(link.href, initialRole)),
    [initialRole],
  );

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-zinc-200 bg-white px-4 py-6">
      <div className="mb-8 px-2">
        <span className="text-lg font-semibold text-zinc-900">Brainspot</span>
      </div>

      <nav className="flex flex-col gap-1">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
