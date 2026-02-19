"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth } from "./storage";
import type { Role } from "./types";

interface Props {
  children: ReactNode;
  requiredRole?: Role;
}

export function RequireAuth({ children, requiredRole }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/auth/login");
      return;
    }
    if (requiredRole && auth.role !== requiredRole) {
      router.replace(auth.role === "ADMIN" ? "/dashboard" : "/reports");
      return;
    }
    setReady(true);
  }, [router, requiredRole]);

  if (!ready) return null;
  return <>{children}</>;
}
