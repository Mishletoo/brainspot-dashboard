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
