"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadAuth } from "@/components/auth/storage";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const auth = loadAuth();
    if (auth) {
      router.replace(auth.role === "ADMIN" ? "/dashboard" : "/reports");
    } else {
      router.replace("/auth/login");
    }
  }, [router]);

  return null;
}
