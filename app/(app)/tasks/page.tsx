"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Task } from "@/components/tasks/types";
import {
  createTaskRecord,
  loadTasks,
  saveTasks,
} from "@/components/tasks/storage";
import { loadServices } from "@/components/services/storage";
import type { Service } from "@/components/services/types";
import TaskEmptyState from "@/components/tasks/TaskEmptyState";
import TaskModal, { DeleteConfirmModal } from "@/components/tasks/TaskModal";
import TaskSearch from "@/components/tasks/TaskSearch";
import TaskTable from "@/components/tasks/TaskTable";

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; task: Task }
  | { type: "view"; task: Task }
  | { type: "delete"; task: Task };

export default function TasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState(
    searchParams.get("serviceId") ?? ""
  );
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  useEffect(() => {
    setTasks(loadTasks());
    setServices(loadServices());
  }, []);

  // Sync serviceFilter when URL param changes
  useEffect(() => {
    const sid = searchParams.get("serviceId") ?? "";
    setServiceFilter(sid);
  }, [searchParams]);

  const handleServiceFilterChange = (val: string) => {
    setServiceFilter(val);
    // Update URL so the filter is reflected in the address bar
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("serviceId", val);
    } else {
      params.delete("serviceId");
    }
    router.replace(`/tasks?${params.toString()}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    let result = tasks;
    if (serviceFilter) {
      result = result.filter((t) => t.serviceId === serviceFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const serviceMap = new Map(services.map((s) => [s.id, s.name.toLowerCase()]));
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (serviceMap.get(t.serviceId) ?? "").includes(q)
      );
    }
    return result;
  }, [tasks, services, search, serviceFilter]);

  const persist = (updated: Task[]) => {
    setTasks(updated);
    saveTasks(updated);
  };

  const handleSave = (data: Omit<Task, "id" | "createdAt">) => {
    if (modal.type === "add") {
      persist([...tasks, createTaskRecord(data)]);
    } else if (modal.type === "edit") {
      persist(
        tasks.map((t) =>
          t.id === modal.task.id ? { ...modal.task, ...data } : t
        )
      );
    }
    setModal({ type: "none" });
  };

  const handleDelete = () => {
    if (modal.type !== "delete") return;
    persist(tasks.filter((t) => t.id !== modal.task.id));
    setModal({ type: "none" });
  };

  const noServices = services.length === 0;
  const activeTaskInModal =
    modal.type === "edit" || modal.type === "view" || modal.type === "delete"
      ? modal.task
      : undefined;
  const deleteServiceName =
    modal.type === "delete"
      ? (services.find((s) => s.id === modal.task.serviceId)?.name ?? "Unknown")
      : "";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-2">
      {/* Page header */}
      <div className="flex items-start justify-between px-1 pt-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Tasks</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Define work templates per service.
          </p>
        </div>
        {!noServices && (
          <button
            onClick={() => setModal({ type: "add" })}
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className="h-3.5 w-3.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Task
          </button>
        )}
      </div>

      {/* No services — special empty state */}
      {noServices ? (
        <TaskEmptyState noServices />
      ) : tasks.length === 0 ? (
        <>
          <TaskSearch
            search={search}
            onSearchChange={setSearch}
            serviceFilter={serviceFilter}
            onServiceFilterChange={handleServiceFilterChange}
            services={services}
          />
          <TaskEmptyState onAdd={() => setModal({ type: "add" })} />
        </>
      ) : (
        <>
          <TaskSearch
            search={search}
            onSearchChange={setSearch}
            serviceFilter={serviceFilter}
            onServiceFilterChange={handleServiceFilterChange}
            services={services}
          />
          {filtered.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-[#1c212b]">
              <p className="text-sm text-zinc-500">No tasks match your filters.</p>
            </div>
          ) : (
            <TaskTable
              tasks={filtered}
              services={services}
              onView={(t) => setModal({ type: "view", task: t })}
              onEdit={(t) => setModal({ type: "edit", task: t })}
              onDelete={(t) => setModal({ type: "delete", task: t })}
            />
          )}
        </>
      )}

      {/* Add / Edit / View modal */}
      {(modal.type === "add" ||
        modal.type === "edit" ||
        modal.type === "view") && (
        <TaskModal
          mode={modal.type}
          task={activeTaskInModal}
          services={services}
          existingTasks={tasks}
          defaultServiceId={serviceFilter || undefined}
          onClose={() => setModal({ type: "none" })}
          onSave={handleSave}
        />
      )}

      {/* Delete confirmation */}
      {modal.type === "delete" && (
        <DeleteConfirmModal
          task={modal.task}
          serviceName={deleteServiceName}
          onClose={() => setModal({ type: "none" })}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
