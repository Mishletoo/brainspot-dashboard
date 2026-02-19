"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import type { Role } from "./types";

interface Props {
  requiredRole: Role;
  children: ReactNode;
}

export function RequireRole({ requiredRole, children }: Props) {
  const { auth, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!auth) {
      router.replace("/auth/login");
      return;
    }
    if (auth.role !== requiredRole) {
      router.replace("/dashboard");
    }
  }, [loading, auth, requiredRole, router]);

  if (loading) return null;
  if (!auth || auth.role !== requiredRole) return null;

  return <>{children}</>;
}
