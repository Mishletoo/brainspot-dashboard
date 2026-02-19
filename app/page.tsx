"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const role = user.user_metadata?.role ?? user.app_metadata?.role;
        router.replace(role === "ADMIN" ? "/dashboard" : "/reports");
      } else {
        router.replace("/auth/login");
      }
    });
  }, [router]);

  return null;
}
