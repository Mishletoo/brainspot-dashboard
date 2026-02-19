"use client";

import { useCallback, useEffect, useState } from "react";
import { loadAuth, clearAuth } from "./storage";
import type { AuthRecord } from "./types";

export function useAuth() {
  const [auth, setAuth] = useState<AuthRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuth(loadAuth());
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    window.location.href = "/auth/login";
  }, []);

  return { auth, loading, logout };
}
