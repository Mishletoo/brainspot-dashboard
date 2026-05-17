"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TasksRail from "@/components/layout/TasksRail";
import type { AppRole } from "@/lib/roles";

type DashboardShellProps = {
  initialRole: AppRole;
  children: React.ReactNode;
};

export default function DashboardShell({ initialRole, children }: DashboardShellProps) {
  const pathname = usePathname();
  const shouldShowRail = useMemo(() => !pathname.startsWith("/work-reports"), [pathname]);

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar initialRole={initialRole} />
      <div className="flex min-w-0 flex-1 overflow-x-hidden">
        <main className="min-w-0 flex-1 overflow-x-hidden p-8">{children}</main>
        {shouldShowRail && <TasksRail />}
      </div>
    </div>
  );
}
