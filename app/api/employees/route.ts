import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdnhka3l6cG9tb3BobXBmc3J1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA2NjY0MywiZXhwIjoyMDg4NjQyNjQzfQ.Mr4YSSg0JWPcBDBRHiy9oXuampyCKx7v0OHX3E6q_4Q";

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    throw new Error(`Missing Supabase configuration: ${missing.join(", ")}`);
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

async function getAuthedClients() {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (userError) {
      console.error("[employees] Failed to get current user", userError);
    }
    return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("app_role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employeeError || !employee || employee.app_role !== "admin") {
    if (employeeError) {
      console.error(
        "[employees] Failed to load employee record for auth check",
        employeeError,
      );
    }
    return { errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

export async function GET(request: Request) {
  try {
    const { supabaseAdmin, errorResponse } = await getAuthedClients();
    if (errorResponse || !supabaseAdmin) return errorResponse;

    const url = new URL(request.url ?? "");
    const id = url.searchParams.get("id");

    if (id) {
      const { data, error } = await supabaseAdmin
        .from("employees")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(
          "[employees GET] Failed to load single employee from Supabase",
          error,
        );
        return NextResponse.json(
          { error: "Could not load employee from database." },
          { status: 404 },
        );
      }

      if (!data) {
        return NextResponse.json(
          { error: "Employee not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({ employee: data });
    }

    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("id, first_name, last_name, position, department, email, phone")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[employees GET] Failed to load employees from Supabase", error);
      return NextResponse.json(
        { error: "Could not load employees from database." },
        { status: 500 },
      );
    }

    return NextResponse.json({ employees: data ?? [] });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unexpected server error while loading employees.";
    console.error("[employees GET] Unexpected error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabaseAdmin, errorResponse } = await getAuthedClients();
    if (errorResponse || !supabaseAdmin) return errorResponse;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { id, ...payload } = body as { id?: string; [key: string]: unknown };

    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "Missing employee id." }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};
    const allowedKeys = [
      "first_name",
      "last_name",
      "position",
      "department",
      "email",
      "phone",
      "birth_date",
      "photo_url",
      "hours_per_day",
      "gross_salary",
      "net_salary",
      "bonus",
      "vouchers",
      "employer_contributions",
      "monthly_hours",
    ];

    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        updatePayload[key] = (payload as Record<string, unknown>)[key];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("employees")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      console.error("[employees PATCH] Failed to update employee", error);
      return NextResponse.json(
        { error: "Could not update employee. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unexpected server error while updating employee.";
    console.error("[employees PATCH] Unexpected error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
