import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer";
import { resolveAppRole } from "@/lib/roles";

function isMissingIsActiveColumnError(error: { message?: string } | null) {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return message.includes("is_active") && message.includes("column");
}

async function getAuthedClients() {
  const supabaseAdmin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();

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
    .select("id, app_role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employeeError || !employee) {
    if (employeeError) {
      console.error(
        "[employees] Failed to load employee record for auth check",
        employeeError,
      );
    }
    return { errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (employee.is_active === false) {
    return { errorResponse: NextResponse.json({ error: "Account is inactive" }, { status: 403 }) };
  }

  if (resolveAppRole(employee.app_role) !== "admin") {
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

    const { data: employeesWithStatus, error: employeesWithStatusError } = await supabaseAdmin
      .from("employees")
      .select(
        "id, first_name, last_name, position, department, email, phone, auth_user_id, is_active, hours_per_day, gross_salary, net_salary, employer_contributions, vouchers, bonus, monthly_hours, monthly_cost, hourly_cost",
      )
      .order("created_at", { ascending: false });

    if (employeesWithStatusError && isMissingIsActiveColumnError(employeesWithStatusError)) {
      const { data: employeesWithoutStatus, error: employeesWithoutStatusError } = await supabaseAdmin
        .from("employees")
        .select(
          "id, first_name, last_name, position, department, email, phone, auth_user_id, hours_per_day, gross_salary, net_salary, employer_contributions, vouchers, bonus, monthly_hours, monthly_cost, hourly_cost",
        )
        .order("created_at", { ascending: false });

      if (employeesWithoutStatusError) {
        console.error("[employees GET] Failed to load employees from Supabase", employeesWithoutStatusError);
        return NextResponse.json(
          { error: "Could not load employees from database." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        employees: (employeesWithoutStatus ?? []).map((employee) => ({
          ...employee,
          is_active: null,
        })),
      });
    }

    if (employeesWithStatusError) {
      console.error("[employees GET] Failed to load employees from Supabase", employeesWithStatusError);
      return NextResponse.json(
        { error: "Could not load employees from database." },
        { status: 500 },
      );
    }

    return NextResponse.json({ employees: employeesWithStatus ?? [] });
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
