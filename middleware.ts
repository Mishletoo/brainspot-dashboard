import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAppPath, isAdminOnlyApiPath, resolveAppRole } from "@/lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Paths that are allowed without a session */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname.startsWith("/favicon")) return true;
  return false;
}

function isMissingIsActiveColumnError(error: { message?: string } | null) {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return message.includes("is_active") && message.includes("column");
}

function redirectWithCookies(
  request: NextRequest,
  url: string,
  sessionResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: object) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: object) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith("/api/");

  if (!user) {
    if (!isPublicPath(pathname)) {
      if (isApiRequest) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      return redirectWithCookies(
        request,
        new URL("/login", request.url).toString(),
        response
      );
    }
    return response;
  }

  const { data: employeeByAuthId, error: employeeByAuthIdError } = await supabase
    .from("employees")
    .select("id, app_role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employeeByAuthIdError) {
    if (!isPublicPath(pathname)) {
      if (isApiRequest) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      return redirectWithCookies(
        request,
        new URL("/login", request.url).toString(),
        response
      );
    }
    return response;
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
    if (!isPublicPath(pathname)) {
      if (isApiRequest) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      return redirectWithCookies(
        request,
        new URL("/login", request.url).toString(),
        response
      );
    }
    return response;
  }

  const { data: statusRow, error: statusError } = await supabase
    .from("employees")
    .select("is_active")
    .eq("id", employee.id)
    .maybeSingle();

  const isExplicitlyInactive = statusRow?.is_active === false;

  if (statusError && !isMissingIsActiveColumnError(statusError)) {
    console.warn("[middleware] Could not read employees.is_active; allowing access for backward compatibility.");
  }

  if (isExplicitlyInactive) {
    if (!isPublicPath(pathname)) {
      if (isApiRequest) {
        return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
      }
      return redirectWithCookies(
        request,
        new URL("/login", request.url).toString(),
        response
      );
    }
    return response;
  }

  const role = resolveAppRole(employee.app_role);

  if (!isPublicPath(pathname) && isApiRequest && isAdminOnlyApiPath(pathname) && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isPublicPath(pathname) && !isApiRequest && !canAccessAppPath(pathname, role)) {
    return redirectWithCookies(request, new URL("/", request.url).toString(), response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
