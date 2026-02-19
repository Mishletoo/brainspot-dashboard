"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { loadAuth, clearAuth } from "./storage";
import type { AuthRecord, Role } from "./types";

function normalizeRole(raw: string | null | undefined): Role {
  if (raw?.toLowerCase() === "admin") return "ADMIN";
  return "EMPLOYEE";
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        console.log("[useAuth] user.id =", user.id);
        console.log("[useAuth] profile =", profile);
        console.log("[useAuth] error =", error);

        let role: Role = "EMPLOYEE";

        if (error) {
          if (error.code === "PGRST116") {
            // No profile row yet — create one with default role.
            const { error: upsertError } = await supabase
              .from("profiles")
              .upsert({ user_id: user.id, role: "employee" });

            if (upsertError) {
              console.error("[useAuth] Failed to upsert profile:", upsertError);
            }
            // role stays "employee" regardless of upsert success
          } else {
            console.error("[useAuth] Failed to fetch profile:", error);
          }
        } else {
          role = normalizeRole(profile?.role);
        }

        setAuth({
          employeeId: user.id,
          email: user.email ?? "",
          role,
          loggedInAt: new Date().toISOString(),
        });
      } else {
        setAuth(loadAuth());
      }
      setLoading(false);
    });
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut();
    clearAuth();
    window.location.href = "/auth/login";
  }, []);

  return { auth, loading, logout };
}
