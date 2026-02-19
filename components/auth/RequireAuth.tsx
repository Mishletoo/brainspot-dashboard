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

      const role: string | null =
        user?.app_metadata?.role ?? user?.user_metadata?.role ?? null;

      if (process.env.NODE_ENV !== "production") {
        console.log("ROLE", role, user?.app_metadata, user?.user_metadata);
      }

      if (requiredRole) {
        if (role?.toLowerCase() !== requiredRole.toLowerCase()) {
          router.replace(role?.toLowerCase() === "admin" ? "/dashboard" : "/reports");
          return;
        }
      }
      setReady(true);
    });
  }, [router, requiredRole]);

  if (!ready) return null;
  return <>{children}</>;
}
