export type WorkdayHours = 4 | 6 | 8;

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  workdayHours: WorkdayHours;
  salaryFixed: number;
  bonusFixed: number;
  vouchersFixed: number;
  hourlyCost: number;
  isActive: boolean;
  createdAt: string;
}
