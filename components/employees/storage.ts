import type { Employee, WorkdayHours } from "./types";
import { setPassword } from "@/components/auth/storage";

const EMPLOYEES_KEY = "brainspot_employees_v1";
const WORKING_DAYS_IN_MONTH = 20;

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function computeHourlyCost(
  salaryFixed: number,
  bonusFixed: number,
  vouchersFixed: number,
  workdayHours: number
): number {
  const total = salaryFixed + bonusFixed + vouchersFixed;
  const monthlyHours = workdayHours * WORKING_DAYS_IN_MONTH;
  return monthlyHours > 0 ? total / monthlyHours : 0;
}

export function loadEmployees(): Employee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Employee[];
  } catch {
    return [];
  }
}

export function saveEmployees(employees: Employee[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  } catch {
    // ignore quota / security errors
  }
}

export function createEmployeeRecord(
  data: Omit<Employee, "id" | "createdAt">
): Employee {
  return { ...data, id: genId(), createdAt: new Date().toISOString() };
}

/**
 * Seeds a default ADMIN account if no employees exist yet.
 * Default credentials: anna@digitalnosti.bg / admin123
 * The seed id matches the legacy demo id so existing reports remain linked.
 */
export function seedDefaultAdminIfNeeded(): void {
  if (typeof window === "undefined") return;
  const employees = loadEmployees();
  if (employees.length > 0) return;

  const hourlyCost = computeHourlyCost(3000, 0, 200, 8);
  const admin: Employee = {
    id: "emp_anna_demo",
    fullName: "Anna",
    email: "anna@digitalnosti.bg",
    role: "ADMIN",
    workdayHours: 8 as WorkdayHours,
    salaryFixed: 3000,
    bonusFixed: 0,
    vouchersFixed: 200,
    hourlyCost,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  saveEmployees([admin]);
  setPassword("emp_anna_demo", "admin123");
}
