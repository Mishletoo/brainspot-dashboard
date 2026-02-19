import AppShell from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/auth/RequireAuth";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
