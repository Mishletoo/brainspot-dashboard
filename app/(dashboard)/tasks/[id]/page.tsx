"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("bg-BG");
}

function getDeleteErrorMessage(error: { code?: string; message?: string; details?: string; hint?: string }) {
  const errorText = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  if (error.code === "23503" && errorText.includes("work_report_items")) {
    return "Тази задача вече се използва в work_report_items и не може да бъде изтрита.";
  }

  if (error.code === "23503") {
    return "Тази задача се използва в други записи и не може да бъде изтрита.";
  }

  return "Не успяхме да изтрием задачата. Моля, опитайте отново.";
}

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase.from("tasks").select("id, name, description, created_at").eq("id", id).single();

      if (error || !data) {
        setTask(null);
        setErrorMessage("Не успяхме да заредим задачата.");
        setIsLoading(false);
        return;
      }

      setTask(data);
      setIsLoading(false);
    };

    fetchTask();
  }, [id]);

  const handleDelete = async () => {
    const isConfirmed = window.confirm("Сигурни ли сте, че искате да изтриете тази задача?");
    if (!isConfirmed) return;

    setDeleteErrorMessage("");
    setIsDeleting(true);

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      setDeleteErrorMessage(getDeleteErrorMessage(error));
      setIsDeleting(false);
      return;
    }

    router.push("/tasks");
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-zinc-600">Loading task...</p>
      </div>
    );
  }

  if (errorMessage || !task) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {errorMessage || "Task not found."}
        </div>
        <Link href="/tasks" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/tasks" className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
            ← Back to tasks
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">{task.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">Детайли за избраната задача.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/tasks/${task.id}/edit`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {deleteErrorMessage && <p className="mb-4 text-sm text-rose-700">{deleteErrorMessage}</p>}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-700">Task details</h2>
        </div>
        <dl className="divide-y divide-zinc-100">
          <DetailRow label="Task name" value={task.name} />
          <DetailRow label="Description" value={task.description} />
          <DetailRow label="Created at" value={formatDate(task.created_at)} />
        </dl>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-right text-sm text-zinc-900">{value ?? "-"}</dd>
    </div>
  );
}
