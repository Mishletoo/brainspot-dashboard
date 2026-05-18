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
    <div className="flex h-screen min-h-0 overflow-hidden">
      <Sidebar initialRole={initialRole} />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <main className="bs-scroll-fade min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
        {shouldShowRail && <TasksRail />}
      </div>
    </div>
  );
}
