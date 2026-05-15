import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { APP_ROLE_LABELS } from "@/lib/roles";
import {
  ensureAdminContext,
  formatPostgrestError,
  getRoleFromRequest,
  normalizeEmail,
} from "./_shared";

type UsersPostBody = {
  email?: unknown;
  role?: unknown;
  temporaryPassword?: unknown;
};

function isMissingIsActiveColumnError(error: { message?: string } | null) {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return message.includes("is_active") && message.includes("column");
}

export async function GET() {
  try {
    const auth = await ensureAdminContext();
    if (!auth.ok) return auth.response;

    const { data: authUsersData, error: authUsersError } = await auth.adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authUsersError) {
      return NextResponse.json(
        { error: authUsersError.message || "Could not load auth users." },
        { status: 500 },
      );
    }

    const authUsers = authUsersData?.users ?? [];
    const authUserIds = authUsers.map((user) => user.id);

    const employeesByAuthUserId = new Map<
      string,
      {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        app_role: string | null;
        is_active: boolean | null;
      }
    >();

    if (authUserIds.length > 0) {
      const { data: employeesWithStatus, error: employeesWithStatusError } = await auth.adminClient
        .from("employees")
        .select("id, first_name, last_name, email, app_role, is_active, auth_user_id")
        .in("auth_user_id", authUserIds);

      let employees = employeesWithStatus;

      if (employeesWithStatusError && isMissingIsActiveColumnError(employeesWithStatusError)) {
        const { data: employeesWithoutStatus, error: employeesWithoutStatusError } = await auth.adminClient
          .from("employees")
          .select("id, first_name, last_name, email, app_role, auth_user_id")
          .in("auth_user_id", authUserIds);

        if (employeesWithoutStatusError) {
          return NextResponse.json(
            {
              error: formatPostgrestError(
                employeesWithoutStatusError,
                "Could not load linked employees.",
              ),
            },
            { status: 500 },
          );
        }

        employees = (employeesWithoutStatus ?? []).map((employee) => ({
          ...employee,
          is_active: null,
        }));
      } else if (employeesWithStatusError) {
        return NextResponse.json(
          { error: formatPostgrestError(employeesWithStatusError, "Could not load linked employees.") },
          { status: 500 },
        );
      }

      for (const employee of employees ?? []) {
        if (!employee.auth_user_id) continue;
        employeesByAuthUserId.set(employee.auth_user_id, {
          id: employee.id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          app_role: employee.app_role,
          is_active: employee.is_active,
        });
      }
    }

    const users = authUsers.map((authUser) => {
      const linkedEmployee = employeesByAuthUserId.get(authUser.id);
      const roleFromMetadata = getRoleFromRequest(authUser.user_metadata?.app_role);
      const role = getRoleFromRequest(linkedEmployee?.app_role) ?? roleFromMetadata ?? "employee";
      const isActive =
        typeof linkedEmployee?.is_active === "boolean"
          ? linkedEmployee.is_active
          : authUser.user_metadata?.is_active !== false;
      const status = !isActive ? "inactive" : linkedEmployee ? "active" : "pending";
      const linkedEmployeeName = [linkedEmployee?.first_name, linkedEmployee?.last_name]
        .filter((part) => typeof part === "string" && part.trim().length > 0)
        .join(" ");

      return {
        id: authUser.id,
        email: authUser.email ?? linkedEmployee?.email ?? null,
        role,
        roleLabel: APP_ROLE_LABELS[role],
        isActive,
        status,
        createdAt: authUser.created_at ?? new Date().toISOString(),
        linkedEmployeeId: linkedEmployee?.id ?? null,
        linkedEmployeeName: linkedEmployeeName || null,
      };
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await ensureAdminContext();
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => null)) as UsersPostBody | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const role = getRoleFromRequest(body.role);
    const temporaryPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: "Please provide a valid role." }, { status: 400 });
    }

    if (!temporaryPassword || temporaryPassword.length < 8) {
      return NextResponse.json(
        { error: "Temporary password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const { data: authUserData, error: authError } = await auth.adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        app_role: role,
        is_active: true,
      },
    });

    if (authError || !authUserData.user) {
      const message =
        authError?.message?.includes("already been registered")
          ? "A user with this email already exists in Supabase Auth."
          : authError?.message ?? "Could not create auth user.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const authUserId = authUserData.user.id;
    const { data: existingEmployee, error: existingEmployeeError } = await auth.adminClient
      .from("employees")
      .select("id, auth_user_id")
      .ilike("email", email)
      .maybeSingle();

    if (existingEmployeeError) {
      await auth.adminClient.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        {
          error: formatPostgrestError(
            existingEmployeeError,
            "Auth user was created but employee lookup failed.",
          ),
        },
        { status: 500 },
      );
    }

    if (existingEmployee?.auth_user_id && existingEmployee.auth_user_id !== authUserId) {
      await auth.adminClient.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { error: "Employee profile with this email is already linked to another auth account." },
        { status: 409 },
      );
    }

    let linkedEmployeeId: string | null = null;
    let upsertError: PostgrestError | null = null;

    if (existingEmployee) {
      const { error: updateWithStatusError } = await auth.adminClient
        .from("employees")
        .update({
          email,
          app_role: role,
          is_active: true,
          auth_user_id: authUserId,
        })
        .eq("id", existingEmployee.id);

      if (updateWithStatusError && isMissingIsActiveColumnError(updateWithStatusError)) {
        const { error: updateWithoutStatusError } = await auth.adminClient
          .from("employees")
          .update({
            email,
            app_role: role,
            auth_user_id: authUserId,
          })
          .eq("id", existingEmployee.id);
        upsertError = updateWithoutStatusError;
      } else {
        upsertError = updateWithStatusError;
      }
    }

    if (upsertError) {
      await auth.adminClient.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { error: formatPostgrestError(upsertError, "Could not link existing employee record.") },
        { status: 500 },
      );
    }

    if (existingEmployee) linkedEmployeeId = existingEmployee.id;
    return NextResponse.json({ success: true, linkedEmployeeId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
