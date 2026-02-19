"use client";

import { useEffect, useState } from "react";
import { loadAuth } from "@/components/auth/storage";
import { loadEmployees } from "@/components/employees/storage";

export default function Header() {
  const [displayName, setDisplayName] = useState("there");

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) return;
    const employees = loadEmployees();
    const emp = employees.find((e) => e.id === auth.employeeId);
    if (emp) {
      setDisplayName(emp.fullName.split(" ")[0]);
    } else {
      setDisplayName(auth.email.split("@")[0]);
    }
  }, []);

  return (
    <div className="flex items-start justify-between pt-2 px-1">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Hello {displayName} 👋</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Welcome back — here&apos;s what&apos;s happening today.</p>
      </div>

      <button className="flex items-center gap-2 rounded-full border border-zinc-700 bg-[#1c212b] px-4 py-1.5 text-xs font-medium text-zinc-300 hover:border-lime-400/40 hover:text-zinc-100 transition flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        Notifications
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-lime-400 text-[9px] font-bold text-zinc-900">
          3
        </span>
      </button>
    </div>
  );
}
