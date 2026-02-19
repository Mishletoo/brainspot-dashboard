import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/dashboard/Header";
import QuickActions from "@/components/dashboard/QuickActions";
import { createServerClient } from "@/lib/supabase/server";
import PromoCard from "@/components/dashboard/PromoCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import RightPanel from "@/components/dashboard/RightPanel";

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  console.log("USER:", data)

  const user = data.user
  if (!user) redirect("/auth/login")

  return (
    <div className="flex h-full gap-3 overflow-hidden">

      {/* Main column */}
      <div className="flex flex-1 flex-col gap-3 min-w-0 overflow-y-auto pr-1">

        {/* Auth status bar */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#161a22] px-4 py-2.5 text-sm">
          {user ? (
            <>
              <span className="text-zinc-400">
                Logged in as{" "}
                <span className="font-medium text-zinc-100">{user.email}</span>
              </span>
              <Link
                href="/auth/logout"
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100"
              >
                Logout
              </Link>
            </>
          ) : (
            <>
              <span className="text-zinc-500">Not signed in</span>
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-lg bg-lime-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-lime-300"
                >
                  Register
                </Link>
              </div>
            </>
          )}
        </div>

        <Header />
        <QuickActions />
        <PromoCard />
        <RecentActivity />
      </div>

      {/* Right panel */}
      <RightPanel />
    </div>
  );
}
