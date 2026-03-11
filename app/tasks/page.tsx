"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabaseClient";

type Task = {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("bg-BG");
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });

      if (error) {
        setTasks([]);
        setErrorMessage("Не успяхме да заредим задачите. Моля, опитайте отново.");
        setIsLoading(false);
        return;
      }

      const mappedTasks: Task[] = (data ?? []).map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: String(item.name ?? "Без име"),
        description: typeof item.description === "string" ? item.description : null,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
      }));

      setTasks(mappedTasks);
      setIsLoading(false);
    };

    fetchTasks();
  }, []);

  const getDeleteErrorMessage = (error: { code?: string; message?: string; details?: string; hint?: string }) => {
    const errorText = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
    if (error.code === "23503" && errorText.includes("work_report_items")) {
      return "Тази задача вече се използва в work_report_items и не може да бъде изтрита.";
    }

    if (error.code === "23503") {
      return "Тази задача се използва в други записи и не може да бъде изтрита.";
    }

    return "Не успяхме да изтрием задачата. Моля, опитайте отново.";
  };

  const handleDeleteTask = async (taskId: string) => {
    const isConfirmed = window.confirm("Сигурни ли сте, че искате да изтриете тази задача?");
    if (!isConfirmed) return;

    setErrorMessage("");
    setDeletingTaskId(taskId);

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      setErrorMessage(getDeleteErrorMessage(error));
      setDeletingTaskId(null);
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setDeletingTaskId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Задачи</h1>
          <p className="text-sm text-zinc-500">Списък с всички задачи и кратко описание.</p>
        </div>
        <Link
          href="/tasks/add"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Add task
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Loading tasks...</div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && tasks.length === 0 && (
        <EmptyState
          title="Все още няма задачи"
          description="Добавете първата задача, за да започнете да отчитате работа по клиенти и услуги."
          actionHref="/tasks/add"
          actionLabel="Add task"
        />
      )}

      {!isLoading && !errorMessage && tasks.length > 0 && (
        <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Задача</th>
                <th className="px-4 py-3 font-medium">Описание</th>
                <th className="px-4 py-3 font-medium">Създадена на</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">{task.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{task.description || "-"}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(task.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tasks/${task.id}/edit`}
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        disabled={deletingTaskId === task.id}
                        className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingTaskId === task.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
