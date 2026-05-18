import { NextResponse } from "next/server";
import {
  ensureAdminContext,
  formatPostgrestError,
  getRoleFromRequest,
  isMissingIsActiveColumnError,
} from "../_shared";

type UsersPatchBody = {
  role?: unknown;
  isActive?: unknown;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await ensureAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as UsersPatchBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const metadataPayload: Record<string, unknown> = {};
    const employeePayload: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(body, "role")) {
      const role = getRoleFromRequest(body.role);
      if (!role) {
        return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
      }
      metadataPayload.app_role = role;
      employeePayload.app_role = role;
    }

    if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
      }
      metadataPayload.is_active = body.isActive;
      employeePayload.is_active = body.isActive;
    }

    if (Object.keys(metadataPayload).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    if (id === auth.currentUserId && metadataPayload.is_active === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own admin account." },
        { status: 400 },
      );
    }

    const { data: authUserData, error: authUserError } = await auth.adminClient.auth.admin.getUserById(id);
    if (authUserError || !authUserData.user) {
      return NextResponse.json(
        { error: authUserError?.message || "Auth user not found." },
        { status: 404 },
      );
    }

    const mergedMetadata = {
      ...(authUserData.user.user_metadata ?? {}),
      ...metadataPayload,
    };
    const { error: metadataError } = await auth.adminClient.auth.admin.updateUserById(id, {
      user_metadata: mergedMetadata,
    });
    if (metadataError) {
      return NextResponse.json(
        { error: metadataError.message || "Could not update auth user metadata." },
        { status: 500 },
      );
    }

    if (Object.keys(employeePayload).length > 0) {
      const { error: employeeUpdateError } = await auth.adminClient
        .from("employees")
        .update(employeePayload)
        .eq("auth_user_id", id);
      if (employeeUpdateError) {
        if (
          isMissingIsActiveColumnError(employeeUpdateError) &&
          Object.prototype.hasOwnProperty.call(employeePayload, "is_active")
        ) {
          const fallbackEmployeePayload = { ...employeePayload };
          delete fallbackEmployeePayload.is_active;

          if (Object.keys(fallbackEmployeePayload).length > 0) {
            const { error: fallbackEmployeeUpdateError } = await auth.adminClient
              .from("employees")
              .update(fallbackEmployeePayload)
              .eq("auth_user_id", id);
            if (fallbackEmployeeUpdateError) {
              return NextResponse.json(
                {
                  error: formatPostgrestError(
                    fallbackEmployeeUpdateError,
                    "Could not sync linked employee status.",
                  ),
                },
                { status: 500 },
              );
            }
          }

          return NextResponse.json({ success: true });
        }

        return NextResponse.json(
          { error: formatPostgrestError(employeeUpdateError, "Could not sync linked employee status.") },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await ensureAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    if (id === auth.currentUserId) {
      return NextResponse.json(
        { error: "Не можете да изтриете собствения си admin акаунт." },
        { status: 400 },
      );
    }

    const { data: authUserData, error: authUserError } = await auth.adminClient.auth.admin.getUserById(id);
    if (authUserError || !authUserData.user) {
      return NextResponse.json(
        { error: authUserError?.message || "Auth user not found." },
        { status: 404 },
      );
    }

    const unlinkPayload: Record<string, unknown> = { auth_user_id: null, is_active: false };
    const { error: unlinkError } = await auth.adminClient
      .from("employees")
      .update(unlinkPayload)
      .eq("auth_user_id", id);

    if (unlinkError) {
      if (isMissingIsActiveColumnError(unlinkError)) {
        const { error: fallbackUnlinkError } = await auth.adminClient
          .from("employees")
          .update({ auth_user_id: null })
          .eq("auth_user_id", id);

        if (fallbackUnlinkError) {
          return NextResponse.json(
            { error: formatPostgrestError(fallbackUnlinkError, "Could not unlink employee record.") },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: formatPostgrestError(unlinkError, "Could not unlink employee record.") },
          { status: 500 },
        );
      }
    }

    const { error: deleteAuthError } = await auth.adminClient.auth.admin.deleteUser(id);
    if (deleteAuthError) {
      return NextResponse.json(
        { error: deleteAuthError.message || "Could not delete auth user." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
