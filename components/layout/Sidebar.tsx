"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/useAuth";

const NAV_ALL = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["ADMIN", "EMPLOYEE"] as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Clients",
    href: "/clients",
    roles: ["ADMIN"] as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-1a6 6 0 0 1 6-6h0" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-1a6 6 0 0 0-5-5.92" />
      </svg>
    ),
  },
  {
    label: "Services",
    href: "/services",
    roles: ["ADMIN"] as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    label: "Tasks",
    href: "/tasks",
    roles: ["ADMIN"] as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: "Employees",
    href: "/employees",
    roles: ["ADMIN"] as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    roles: ["ADMIN", "EMPLOYEE"] as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M2 20h20" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    roles: ["ADMIN", "EMPLOYEE"] as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const ADMIN_NAV = [
  {
    label: "Reports",
    href: "/admin/reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: "Client Reports",
    href: "/admin/client-reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M2 20h20" />
      </svg>
    ),
  },
];

function NavItem({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-lime-400 text-zinc-900 shadow-sm shadow-lime-400/20"
          : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const { auth, logout } = useAuth();
  const role = auth?.role ?? "EMPLOYEE";

  const visibleNav = NAV_ALL.filter((item) =>
    item.roles.some((r) => r === role)
  );
  const isAdmin = role === "ADMIN";

  return (
    <aside className="flex w-52 flex-shrink-0 flex-col rounded-2xl bg-[#161a22] p-4 ring-1 ring-white/[0.04]">
      {/* Brand */}
      <div className="mb-6 flex items-center gap-2.5 px-1">
        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src="/brand/brainspot-icon.png"
            alt="Brainspot"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight text-zinc-100">Brainspot</span>
          <span className="text-[10px] font-medium text-zinc-500 tracking-wide">Dashboard</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {visibleNav.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* Admin section */}
        {isAdmin && (
          <div className="mt-3 border-t border-white/[0.05] pt-3">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              Admin
            </p>
            {ADMIN_NAV.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        )}
      </nav>

      {/* User info + Logout */}
      <div className="mt-4 border-t border-white/[0.05] pt-3">
        {auth && (
          <div className="mb-2 px-3">
            <p className="truncate text-xs font-medium text-zinc-300">
              {auth.email}
            </p>
            <p className="text-[10px] text-zinc-600">
              {auth.role === "ADMIN" ? "Admin" : "Employee"}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 flex-shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
