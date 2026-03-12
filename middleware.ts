import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Paths that are allowed without a session */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname.startsWith("/favicon")) return true;
  return false;
}

/** Paths that employees (non-admin) are allowed to access */
const EMPLOYEE_ALLOWED_PATHS = ["/work-reports", "/profile", "/login", "/register"];

function isAllowedForEmployee(pathname: string): boolean {
  return EMPLOYEE_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
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
  let response = NextResponse.next({
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

  if (!user) {
    if (!isPublicPath(pathname)) {
      return redirectWithCookies(
        request,
        new URL("/login", request.url).toString(),
        response
      );
    }
    return response;
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("app_role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employeeError || !employee) {
    await supabase.auth.signOut();
    return redirectWithCookies(
      request,
      new URL("/login", request.url).toString(),
      response
    );
  }

  const appRole = employee.app_role === "admin" ? "admin" : "employee";

  if (appRole === "admin") {
    return response;
  }

  if (!isAllowedForEmployee(pathname)) {
    return redirectWithCookies(
      request,
      new URL("/work-reports", request.url).toString(),
      response
    );
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
