"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { setPassword } from "@/components/auth/storage";
import type { Employee } from "@/components/employees/types";
import {
  computeHourlyCost,
  createEmployeeRecord,
  loadEmployees,
  saveEmployees,
} from "@/components/employees/storage";
import { EmployeeEmptyState } from "@/components/employees/EmployeeEmptyState";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { EmployeeModal } from "@/components/employees/EmployeeModal";

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; employee: Employee };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  useEffect(() => {
    setEmployees(loadEmployees());
  }, []);

  function persistEmployees(updated: Employee[]) {
    setEmployees(updated);
    saveEmployees(updated);
  }

  function handleSave(
    data: {
      fullName: string;
      email: string;
      role: "ADMIN" | "EMPLOYEE";
      workdayHours: 4 | 6 | 8;
      salaryFixed: number;
      bonusFixed: number;
      vouchersFixed: number;
    },
    password?: string
  ) {
    const hourlyCost = computeHourlyCost(
      data.salaryFixed,
      data.bonusFixed,
      data.vouchersFixed,
      data.workdayHours
    );

    if (modal.type === "add") {
      const newEmployee = createEmployeeRecord({
        ...data,
        hourlyCost,
        isActive: true,
      });
      persistEmployees([...employees, newEmployee]);
      if (password) {
        setPassword(newEmployee.id, password);
      }
    } else if (modal.type === "edit") {
      const updated = employees.map((e) =>
        e.id === modal.employee.id
          ? { ...e, ...data, hourlyCost }
          : e
      );
      persistEmployees(updated);
    }

    setModal({ type: "none" });
  }

  function handleToggleActive(employee: Employee) {
    const updated = employees.map((e) =>
      e.id === employee.id ? { ...e, isActive: !e.isActive } : e
    );
    persistEmployees(updated);
  }

  function handleResetPassword(employeeId: string, newPassword: string) {
    setPassword(employeeId, newPassword);
  }

  return (
    <RequireAuth requiredRole="ADMIN">
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
        {/* Header */}
        <div className="flex items-start justify-between px-1 pt-2">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Employees</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Manage your team members, roles, and compensation.
            </p>
          </div>
          {employees.length > 0 && (
            <button
              onClick={() => setModal({ type: "add" })}
              className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="h-3.5 w-3.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Employee
            </button>
          )}
        </div>

        {/* Content */}
        {employees.length === 0 ? (
          <EmployeeEmptyState onAdd={() => setModal({ type: "add" })} />
        ) : (
          <EmployeeTable
            employees={employees}
            showCompensation={true}
            onEdit={(emp) => setModal({ type: "edit", employee: emp })}
            onToggleActive={handleToggleActive}
          />
        )}

        {/* Modals */}
        {modal.type === "add" && (
          <EmployeeModal
            mode="add"
            onClose={() => setModal({ type: "none" })}
            onSave={handleSave}
          />
        )}

        {modal.type === "edit" && (
          <EmployeeModal
            mode="edit"
            employee={modal.employee}
            onClose={() => setModal({ type: "none" })}
            onSave={handleSave}
            onResetPassword={handleResetPassword}
          />
        )}
      </div>
    </RequireAuth>
  );
}
