import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080b0f] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl h-[820px] bg-[#0f1116] rounded-3xl shadow-2xl flex gap-3 p-3 overflow-hidden ring-1 ring-white/[0.04]">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
