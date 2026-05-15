"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessAppPath, resolveAppRole, type AppRole } from "@/lib/roles";
import { supabase } from "@/lib/supabaseClient";

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

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<AppRole>("employee");

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setRole("employee");
        return;
      }

      const { data: employeeByAuth } = await supabase
        .from("employees")
        .select("app_role, is_active")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (employeeByAuth) {
        if (isMounted) {
          setRole(resolveAppRole(employeeByAuth.app_role));
        }
        return;
      }

      if (!user.email) {
        if (isMounted) setRole("employee");
        return;
      }

      const { data: employeeByEmail } = await supabase
        .from("employees")
        .select("app_role, is_active")
        .ilike("email", user.email)
        .maybeSingle();

      if (isMounted) {
        setRole(resolveAppRole(employeeByEmail?.app_role));
      }
    }

    void loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleLinks = useMemo(
    () => navLinks.filter((link) => canAccessAppPath(link.href, role)),
    [role],
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
