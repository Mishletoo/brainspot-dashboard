"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

type TaskFormValues = {
  name: string;
  description: string;
};

const initialValues: TaskFormValues = {
  name: "",
  description: "",
};

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [formValues, setFormValues] = useState<TaskFormValues>(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchTask = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase.from("tasks").select("name, description").eq("id", id).single();

      if (error || !data) {
        setErrorMessage("Could not load task data.");
        setIsLoading(false);
        return;
      }

      setFormValues({
        name: data.name ?? "",
        description: data.description ?? "",
      });
      setIsLoading(false);
    };

    fetchTask();
  }, [id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const cleanName = formValues.name.trim();
    if (!cleanName) {
      setErrorMessage("Task name is required.");
      return;
    }

    setIsSaving(true);
    const cleanDescription = formValues.description.trim();

    const { error } = await supabase
      .from("tasks")
      .update({
        name: cleanName,
        description: cleanDescription || null,
      })
      .eq("id", id);

    if (error) {
      setErrorMessage("Could not update task. Please try again.");
      setIsSaving(false);
      return;
    }

    router.push(`/tasks/${id}`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-zinc-600">Loading task data...</p>
      </div>
    );
  }

  if (errorMessage && !isSaving && formValues.name === "" && formValues.description === "") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>
        <Link href={`/tasks/${id}`} className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to task details
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <Link href={`/tasks/${id}`} className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to task details
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Task</h1>
        <p className="mt-1 text-sm text-zinc-500">Update task name and description.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-zinc-700">
              Task name
            </label>
            <input
              id="name"
              type="text"
              value={formValues.name}
              onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="text-sm font-medium text-zinc-700">
              Description
            </label>
            <textarea
              id="description"
              rows={5}
              value={formValues.description}
              onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
              className={inputClassName}
            />
          </div>
        </div>

        {errorMessage && <p className="mt-4 text-sm text-rose-700">{errorMessage}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href={`/tasks/${id}`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
