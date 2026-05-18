import { NextResponse } from "next/server";
import { ensureAdminContext, generateTemporaryPassword } from "../../_shared";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await ensureAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    const { data: authUserData, error: authUserError } = await auth.adminClient.auth.admin.getUserById(id);
    if (authUserError || !authUserData.user) {
      return NextResponse.json(
        { error: authUserError?.message || "Auth user not found." },
        { status: 404 },
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const { error: updateError } = await auth.adminClient.auth.admin.updateUserById(id, {
      password: temporaryPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Could not update user password." },
        { status: 500 },
      );
    }

    return NextResponse.json({ temporaryPassword });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
