import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login", request.url));
}
