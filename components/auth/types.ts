export type Role = "ADMIN" | "EMPLOYEE";

export interface AuthRecord {
  employeeId: string;
  email: string;
  role: Role;
  loggedInAt: string;
}
