"use client";

import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from "react";
import { PersonalTasksModule } from "@/app/(dashboard)/tasks/page";

const MIN_RAIL_WIDTH = 300;
const MAX_RAIL_WIDTH = 520;
const DEFAULT_RAIL_WIDTH = 360;
const WIDTH_STORAGE_KEY = "brainspot.tasksRail.width";
const COLLAPSED_STORAGE_KEY = "brainspot.tasksRail.collapsed";

function clampWidth(value: number) {
  return Math.min(MAX_RAIL_WIDTH, Math.max(MIN_RAIL_WIDTH, value));
}

export default function TasksRail() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [railWidth, setRailWidth] = useState(DEFAULT_RAIL_WIDTH);

  useEffect(() => {
    try {
      const storedWidth = window.localStorage.getItem(WIDTH_STORAGE_KEY);
      if (storedWidth) {
        setRailWidth(clampWidth(Number(storedWidth)));
      }
      const storedCollapsed = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (storedCollapsed === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // localStorage can fail in private mode or restricted environments.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(railWidth));
    } catch {
      // Ignore persistence failures.
    }
  }, [railWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(isCollapsed));
    } catch {
      // Ignore persistence failures.
    }
  }, [isCollapsed]);

  const railStyle = useMemo(
    () =>
      isCollapsed
        ? undefined
        : ({
            width: `${railWidth}px`,
            minWidth: `${MIN_RAIL_WIDTH}px`,
            maxWidth: `${MAX_RAIL_WIDTH}px`,
          } as const),
    [isCollapsed, railWidth]
  );

  const startResize = (startEvent: ReactMouseEvent<HTMLDivElement>) => {
    if (isCollapsed) return;
    startEvent.preventDefault();

    const startX = startEvent.clientX;
    const startWidth = railWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      setRailWidth(clampWidth(startWidth + delta));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <aside
      className={`sticky top-0 z-20 hidden h-screen border-l border-zinc-200 bg-white lg:flex ${
        isCollapsed ? "w-14 min-w-14 max-w-14" : "shrink-0"
      }`}
      style={railStyle}
      aria-label="Панел със задачи"
    >
      {!isCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startResize}
          className="absolute -left-1 top-0 h-full w-2 cursor-col-resize"
          title="Преоразмери панела"
        />
      )}

      {isCollapsed ? (
        <div className="flex h-full w-full flex-col items-center justify-start gap-3 pt-4">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            aria-label="Покажи задачите"
            title="Покажи задачите"
          >
            ▶
          </button>
          <span className="rotate-180 text-[11px] uppercase tracking-wide text-zinc-400 [writing-mode:vertical-rl]">
            Задачи
          </span>
        </div>
      ) : (
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Лични задачи</p>
              <p className="text-[11px] text-zinc-500">Продуктивен помощник</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              aria-label="Скрий задачите"
              title="Скрий задачите"
            >
              ◀
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
            <PersonalTasksModule mode="rail" />
          </div>
        </div>
      )}
    </aside>
  );
}
