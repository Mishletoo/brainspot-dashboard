import Sidebar from "@/components/layout/Sidebar";
import { resolveAppRole, type AppRole } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

async function getCurrentUserRole(): Promise<AppRole> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "employee";

  const { data: employeeByAuth } = await supabase
    .from("employees")
    .select("app_role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employeeByAuth) return resolveAppRole(employeeByAuth.app_role);
  if (!user.email) return "employee";

  const { data: employeeByEmail } = await supabase
    .from("employees")
    .select("app_role")
    .ilike("email", user.email)
    .maybeSingle();

  return resolveAppRole(employeeByEmail?.app_role);
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialRole = await getCurrentUserRole();

  return (
    <div className="flex min-h-screen">
      <Sidebar initialRole={initialRole} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

