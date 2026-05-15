export const APP_ROLES = ["admin", "finance_admin", "manager", "employee"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  finance_admin: "Finance Admin",
  manager: "Manager",
  employee: "Employee",
};

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function resolveAppRole(value: unknown): AppRole {
  if (typeof value !== "string") return "employee";
  return isAppRole(value) ? value : "employee";
}

const FINANCE_ADMIN_ALLOWED_BASE_PATHS = ["/", "/finance", "/invoices", "/reports", "/profile"] as const;
const MANAGER_ALLOWED_BASE_PATHS = ["/", "/clients", "/projects", "/tasks", "/work-reports", "/reports", "/profile"] as const;
const EMPLOYEE_ALLOWED_BASE_PATHS = ["/", "/work-reports", "/tasks", "/profile"] as const;

function pathMatchesBase(pathname: string, basePath: string): boolean {
  if (basePath === "/") return pathname === "/";
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function canAccessAppPath(pathname: string, role: AppRole): boolean {
  if (role === "admin") return true;

  const allowedBasePaths =
    role === "finance_admin"
      ? FINANCE_ADMIN_ALLOWED_BASE_PATHS
      : role === "manager"
        ? MANAGER_ALLOWED_BASE_PATHS
        : EMPLOYEE_ALLOWED_BASE_PATHS;

  return allowedBasePaths.some((basePath) => pathMatchesBase(pathname, basePath));
}

const ADMIN_ONLY_API_BASE_PATHS = ["/api/users", "/api/employees", "/api/finance", "/api/admin"] as const;

export function isAdminOnlyApiPath(pathname: string): boolean {
  return ADMIN_ONLY_API_BASE_PATHS.some((basePath) => pathMatchesBase(pathname, basePath));
}
