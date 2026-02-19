"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Role } from "./types";

interface Props {
  children: ReactNode;
  requiredRole?: Role;
}

export function RequireAuth({ children, requiredRole }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      if (requiredRole) {
        const role: Role | undefined =
          user.user_metadata?.role ?? user.app_metadata?.role;
        if (role !== requiredRole) {
          router.replace(role === "ADMIN" ? "/dashboard" : "/reports");
          return;
        }
      }
      setReady(true);
    });
  }, [router, requiredRole]);

  if (!ready) return null;
  return <>{children}</>;
}
