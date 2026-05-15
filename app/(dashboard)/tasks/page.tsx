"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PersonalTask = {
  id: string;
  employee_id: string;
  title: string;
  details: string | null;
  due_date: string | null;
  is_important: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TaskEditorValues = {
  title: string;
  details: string;
  dueDate: string;
  isImportant: boolean;
};

const initialEditorValues: TaskEditorValues = {
  title: "",
  details: "",
  dueDate: "",
  isImportant: false,
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function formatDueDate(dateValue: string | null) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dueGroupKey(dueDate: string | null) {
  if (!dueDate) return "none";
  const today = todayIsoDate();
  const tomorrow = tomorrowIsoDate();
  if (dueDate === today) return "today";
  if (dueDate === tomorrow) return "tomorrow";
  return `date:${dueDate}`;
}

function dueGroupLabel(key: string) {
  if (key === "today") return "Днес";
  if (key === "tomorrow") return "Утре";
  if (key === "none") return "Без дата";
  return formatDueDate(key.replace("date:", ""));
}

function sortGroupKeys(a: string, b: string) {
  const order = (value: string) => {
    if (value === "today") return 0;
    if (value === "tomorrow") return 1;
    if (value.startsWith("date:")) return 2;
    return 3;
  };

  const diff = order(a) - order(b);
  if (diff !== 0) return diff;

  if (a.startsWith("date:") && b.startsWith("date:")) {
    return a.localeCompare(b);
  }
  return 0;
}

function taskPreview(details: string | null) {
  if (!details) return "";
  if (details.length <= 90) return details;
  return `${details.slice(0, 90)}...`;
}

export default function TasksPage() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showAddEditor, setShowAddEditor] = useState(false);
  const [addValues, setAddValues] = useState<TaskEditorValues>(initialEditorValues);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<TaskEditorValues>(initialEditorValues);

  const [showCompleted, setShowCompleted] = useState(true);

  const loadTasks = async (resolvedEmployeeId: string) => {
    const { data, error } = await supabase
      .from("personal_tasks")
      .select("id, employee_id, title, details, due_date, is_important, completed_at, created_at, updated_at")
      .eq("employee_id", resolvedEmployeeId)
      .order("is_important", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setTasks([]);
      setErrorMessage("Не успяхме да заредим личните задачи. Моля, опитайте отново.");
      return;
    }

    setTasks((data ?? []) as PersonalTask[]);
  };

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setEmployeeId(null);
        setTasks([]);
        setErrorMessage("Няма активна сесия.");
        setIsLoading(false);
        return;
      }

      const { data: employeeByAuth } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      let resolvedEmployeeId = employeeByAuth?.id ? String(employeeByAuth.id) : null;

      if (!resolvedEmployeeId && user.email) {
        const { data: employeeByEmail } = await supabase
          .from("employees")
          .select("id")
          .ilike("email", user.email)
          .maybeSingle();
        resolvedEmployeeId = employeeByEmail?.id ? String(employeeByEmail.id) : null;
      }

      if (!resolvedEmployeeId) {
        setEmployeeId(null);
        setTasks([]);
        setErrorMessage("Не е намерен служителски профил за текущия потребител.");
        setIsLoading(false);
        return;
      }

      setEmployeeId(resolvedEmployeeId);
      await loadTasks(resolvedEmployeeId);
      setIsLoading(false);
    };

    void bootstrap();
  }, []);

  const activeTasks = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed_at)
        .sort((a, b) => {
          if (a.is_important !== b.is_important) return a.is_important ? -1 : 1;
          const aDue = a.due_date ?? "9999-12-31";
          const bDue = b.due_date ?? "9999-12-31";
          if (aDue !== bDue) return aDue.localeCompare(bDue);
          return b.created_at.localeCompare(a.created_at);
        }),
    [tasks]
  );

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((task) => Boolean(task.completed_at))
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
    [tasks]
  );

  const groupedActiveTasks = useMemo(() => {
    const groups = new Map<string, PersonalTask[]>();
    for (const task of activeTasks) {
      const key = dueGroupKey(task.due_date);
      const current = groups.get(key) ?? [];
      current.push(task);
      groups.set(key, current);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => sortGroupKeys(a, b));
  }, [activeTasks]);

  const resetAddEditor = () => {
    setShowAddEditor(false);
    setAddValues(initialEditorValues);
  };

  const startEditTask = (task: PersonalTask) => {
    setEditingTaskId(task.id);
    setEditValues({
      title: task.title,
      details: task.details ?? "",
      dueDate: task.due_date ?? "",
      isImportant: task.is_important,
    });
  };

  const handleAddTask = async () => {
    if (!employeeId) return;
    const title = addValues.title.trim();
    if (!title) {
      setErrorMessage("Заглавието е задължително.");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    const { error } = await supabase.from("personal_tasks").insert({
      employee_id: employeeId,
      title,
      details: addValues.details.trim() || null,
      due_date: addValues.dueDate || null,
      is_important: addValues.isImportant,
    });

    if (error) {
      setErrorMessage(`Не успяхме да добавим задача. ${error.message}`);
      setIsSaving(false);
      return;
    }

    await loadTasks(employeeId);
    resetAddEditor();
    setIsSaving(false);
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!employeeId) return;
    const title = editValues.title.trim();
    if (!title) {
      setErrorMessage("Заглавието е задължително.");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    const { error } = await supabase
      .from("personal_tasks")
      .update({
        title,
        details: editValues.details.trim() || null,
        due_date: editValues.dueDate || null,
        is_important: editValues.isImportant,
      })
      .eq("id", taskId);

    if (error) {
      setErrorMessage(`Не успяхме да обновим задачата. ${error.message}`);
      setIsSaving(false);
      return;
    }

    await loadTasks(employeeId);
    setEditingTaskId(null);
    setIsSaving(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!employeeId) return;
    setErrorMessage("");
    setIsSaving(true);
    const { error } = await supabase.from("personal_tasks").delete().eq("id", taskId);
    if (error) {
      setErrorMessage(`Не успяхме да изтрием задачата. ${error.message}`);
      setIsSaving(false);
      return;
    }
    await loadTasks(employeeId);
    setEditingTaskId(null);
    setIsSaving(false);
  };

  const toggleCompleted = async (task: PersonalTask) => {
    if (!employeeId) return;
    setErrorMessage("");
    const nextCompletedAt = task.completed_at ? null : new Date().toISOString();
    const { error } = await supabase.from("personal_tasks").update({ completed_at: nextCompletedAt }).eq("id", task.id);
    if (error) {
      setErrorMessage(`Не успяхме да обновим задачата. ${error.message}`);
      return;
    }
    await loadTasks(employeeId);
  };

  const toggleImportant = async (task: PersonalTask) => {
    if (!employeeId) return;
    const { error } = await supabase.from("personal_tasks").update({ is_important: !task.is_important }).eq("id", task.id);
    if (error) {
      setErrorMessage(`Не успяхме да маркираме задачата. ${error.message}`);
      return;
    }
    await loadTasks(employeeId);
  };

  const renderTaskEditor = (
    values: TaskEditorValues,
    setValues: Dispatch<SetStateAction<TaskEditorValues>>,
    onSave: () => void,
    onCancel: () => void,
    options?: { onDelete?: () => void; canDelete?: boolean }
  ) => (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <input
        type="text"
        value={values.title}
        onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
        placeholder="Заглавие"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
      />
      <textarea
        rows={3}
        value={values.details}
        onChange={(event) => setValues((prev) => ({ ...prev, details: event.target.value }))}
        placeholder="Детайли"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setValues((prev) => ({ ...prev, dueDate: todayIsoDate() }))}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Днес
        </button>
        <button
          type="button"
          onClick={() => setValues((prev) => ({ ...prev, dueDate: tomorrowIsoDate() }))}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Утре
        </button>
        <label className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700">
          Избери дата
          <input
            type="date"
            value={values.dueDate}
            onChange={(event) => setValues((prev) => ({ ...prev, dueDate: event.target.value }))}
            className="bg-transparent text-zinc-700 outline-none"
          />
        </label>
        {values.dueDate && (
          <button
            type="button"
            onClick={() => setValues((prev) => ({ ...prev, dueDate: "" }))}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Изчисти дата
          </button>
        )}
        <button
          type="button"
          onClick={() => setValues((prev) => ({ ...prev, isImportant: !prev.isImportant }))}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            values.isImportant
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {values.isImportant ? "★ Важна" : "☆ Маркирай важна"}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {options?.canDelete && options.onDelete && (
          <button
            type="button"
            onClick={options.onDelete}
            disabled={isSaving}
            className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Изтрий
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Отказ
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          Запази
        </button>
      </div>
    </div>
  );

  const renderTaskRow = (task: PersonalTask) => {
    const isEditing = editingTaskId === task.id;
    const dueLabel = formatDueDate(task.due_date);

    return (
      <li key={task.id} className="rounded-lg border border-zinc-200 bg-white">
        {isEditing ? (
          <div className="p-3">
            {renderTaskEditor(
              editValues,
              setEditValues,
              () => void handleUpdateTask(task.id),
              () => setEditingTaskId(null),
              { onDelete: () => void handleDeleteTask(task.id), canDelete: true }
            )}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => startEditTask(task)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                startEditTask(task);
              }
            }}
            className="flex w-full cursor-pointer items-start gap-3 p-3 text-left hover:bg-zinc-50"
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void toggleCompleted(task);
              }}
              className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border ${
                task.completed_at ? "border-emerald-500 bg-emerald-500" : "border-zinc-400 bg-white"
              }`}
              aria-label={task.completed_at ? "Върни като активна" : "Маркирай като приключена"}
            />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${task.completed_at ? "text-zinc-500 line-through" : "text-zinc-900"}`}>{task.title}</p>
              {task.details && <p className="mt-0.5 text-xs text-zinc-500">{taskPreview(task.details)}</p>}
              {dueLabel && (
                <span className="mt-1 inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                  {dueLabel}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void toggleImportant(task);
              }}
              className={`ml-2 rounded-md px-1.5 py-0.5 text-sm ${
                task.is_important ? "text-amber-500" : "text-zinc-400 hover:text-zinc-600"
              }`}
              aria-label={task.is_important ? "Премахни важна" : "Маркирай важна"}
            >
              {task.is_important ? "★" : "☆"}
            </button>
          </div>
        )}
      </li>
    );
  };

  const noTasks = !isLoading && !errorMessage && tasks.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Задачи</h1>
          <p className="text-sm text-zinc-500">Личен списък със задачи.</p>
        </div>
        {!showAddEditor && (
          <button
            type="button"
            onClick={() => setShowAddEditor(true)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Добави задача
          </button>
        )}
      </div>

      {showAddEditor && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleAddTask();
          }}
          className="mb-4"
        >
          {renderTaskEditor(
            addValues,
            setAddValues,
            () => void handleAddTask(),
            resetAddEditor
          )}
        </form>
      )}

      {isLoading && <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Зареждане...</div>}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</div>
      )}

      {noTasks && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-zinc-900">Все още няма задачи.</p>
          <p className="mt-1 text-sm text-zinc-500">Добавете лична задача, за да я следите тук.</p>
        </div>
      )}

      {!isLoading && !errorMessage && tasks.length > 0 && (
        <div className="space-y-4">
          {groupedActiveTasks.map(([groupKey, groupTasks]) => (
            <section key={groupKey}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{dueGroupLabel(groupKey)}</h2>
              <ul className="space-y-2">{groupTasks.map((task) => renderTaskRow(task))}</ul>
            </section>
          ))}

          <section className="rounded-xl border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setShowCompleted((prev) => !prev)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <span>Приключени ({completedTasks.length})</span>
              <span className="text-zinc-400">{showCompleted ? "▲" : "▼"}</span>
            </button>
            {showCompleted && completedTasks.length > 0 && (
              <div className="border-t border-zinc-200 px-2 py-2">
                <ul className="space-y-2">{completedTasks.map((task) => renderTaskRow(task))}</ul>
              </div>
            )}
            {showCompleted && completedTasks.length === 0 && (
              <p className="border-t border-zinc-200 px-3 py-3 text-sm text-zinc-500">Няма приключени задачи.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
