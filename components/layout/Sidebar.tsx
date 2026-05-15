"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessAppPath, type AppRole } from "@/lib/roles";

const navLinks = [
  { label: "Dashboard", href: "/" },
  { label: "Employees", href: "/employees" },
  { label: "Clients", href: "/clients" },
  { label: "Tasks", href: "/tasks" },
  { label: "Work Reports", href: "/work-reports" },
  { label: "Contracts", href: "/contracts" },
  { label: "Invoices", href: "/invoices" },
  { label: "Services", href: "/services" },
  { label: "Projects", href: "/projects" },
  { label: "Finance", href: "/finance" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
  { label: "Manage Users", href: "/settings/users" },
  { label: "Profile", href: "/profile" },
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
