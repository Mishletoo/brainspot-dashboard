import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { AppRole, isAppRole, resolveAppRole } from "@/lib/roles";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer";

type AuthContext =
  | {
      ok: true;
      adminClient: ReturnType<typeof createSupabaseAdminClient>;
      currentUserId: string;
    }
  | { ok: false; response: NextResponse };

export function getRoleFromRequest(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return isAppRole(value) ? value : null;
}

export async function ensureAdminContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  const { data: employeeByAuthId, error: employeeByAuthIdError } = await supabase
    .from("employees")
    .select("id, app_role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employeeByAuthIdError) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  let employee = employeeByAuthId;

  if (!employee && user.email) {
    const { data: employeeByEmail, error: employeeByEmailError } = await supabase
      .from("employees")
      .select("id, app_role, auth_user_id")
      .ilike("email", user.email)
      .maybeSingle();

    if (!employeeByEmailError && employeeByEmail) {
      if (!employeeByEmail.auth_user_id) {
        const { error: linkError } = await supabase
          .from("employees")
          .update({ auth_user_id: user.id })
          .eq("id", employeeByEmail.id)
          .is("auth_user_id", null);

        if (!linkError) {
          employee = { id: employeeByEmail.id, app_role: employeeByEmail.app_role };
        }
      } else if (employeeByEmail.auth_user_id === user.id) {
        employee = { id: employeeByEmail.id, app_role: employeeByEmail.app_role };
      }
    }
  }

  if (!employee) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  const { data: statusRow, error: statusError } = await supabase
    .from("employees")
    .select("is_active")
    .eq("id", employee.id)
    .maybeSingle();

  const isExplicitlyInactive = statusRow?.is_active === false;

  if (statusError && !isMissingIsActiveColumnError(statusError)) {
    console.warn("[users api] Could not read employees.is_active; proceeding for backward compatibility.");
  }

  if (isExplicitlyInactive || resolveAppRole(employee.app_role) !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return {
    ok: true,
    adminClient,
    currentUserId: user.id,
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function formatPostgrestError(error: PostgrestError | null, fallback: string) {
  if (!error) return fallback;
  return error.message ? `${fallback} ${error.message}` : fallback;
}

const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

export function generateTemporaryPassword(length = 14) {
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += TEMP_PASSWORD_ALPHABET[bytes[i]! % TEMP_PASSWORD_ALPHABET.length];
  }
  return password;
}

export function isMissingIsActiveColumnError(error: { message?: string } | null) {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return message.includes("is_active") && message.includes("column");
}
