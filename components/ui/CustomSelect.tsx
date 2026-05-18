"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string };

export type CustomSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

const MENU_GAP_PX = 6;
const VIEWPORT_PAD_PX = 8;
/** Scrollable list max height (Tailwind max-h-[280px]); must stay in sync with menu shell height below. */
const LIST_MAX_HEIGHT_PX = 280;
/** Portal shell ≈ list (max 280) + 2px border; used only for flip / clamp math, not for list sizing. */
const MENU_SHELL_HEIGHT_PX = LIST_MAX_HEIGHT_PX + 2; /* border-y */

const listScrollClassName =
  "m-0 max-h-[280px] min-h-0 max-w-full min-w-0 list-none space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain p-1 " +
  "[scrollbar-color:theme(colors.zinc.600)_theme(colors.zinc.950)] [scrollbar-width:thin] " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-zinc-950 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "[&::-webkit-scrollbar-thumb]:bg-zinc-600 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500";

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Избери",
  disabled = false,
  className = "",
  buttonClassName = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectedOption = options.find((option) => option.value === value) ?? null;

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(Math.max(rect.width, 1), viewportWidth - VIEWPORT_PAD_PX * 2);
    const maxLeft = viewportWidth - VIEWPORT_PAD_PX - width;
    const left = Math.min(Math.max(rect.left, VIEWPORT_PAD_PX), Math.max(VIEWPORT_PAD_PX, maxLeft));

    const bottomEdgeIfDown = rect.bottom + MENU_GAP_PX + MENU_SHELL_HEIGHT_PX;
    const fitsBelow = bottomEdgeIfDown <= viewportHeight - VIEWPORT_PAD_PX;
    const topEdgeIfUp = rect.top - MENU_GAP_PX - MENU_SHELL_HEIGHT_PX;
    const fitsAbove = topEdgeIfUp >= VIEWPORT_PAD_PX;

    let top: number;
    if (fitsBelow) {
      top = rect.bottom + MENU_GAP_PX;
    } else if (fitsAbove) {
      top = rect.top - MENU_GAP_PX - MENU_SHELL_HEIGHT_PX;
    } else {
      const preferDown = rect.top + rect.height / 2 < viewportHeight / 2;
      if (preferDown) {
        top = Math.max(VIEWPORT_PAD_PX, viewportHeight - VIEWPORT_PAD_PX - MENU_SHELL_HEIGHT_PX);
      } else {
        top = VIEWPORT_PAD_PX;
      }
    }

    setMenuPosition({ top, left, width });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      updateMenuPosition();
    };

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateMenuPosition);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateMenuPosition);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updateMenuPosition]);

  const triggerClasses = [
    "flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus-visible:border-zinc-500",
    disabled ? "opacity-60 cursor-not-allowed" : "hover:border-zinc-500/80",
    buttonClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const rootClasses = ["relative overflow-visible", isOpen ? "z-[70]" : "z-10", className].filter(Boolean).join(" ");

  return (
    <div ref={rootRef} className={rootClasses}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!isOpen) updateMenuPosition();
          setIsOpen((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) setIsOpen((prev) => !prev);
          }
          if (event.key === "ArrowDown" && !isOpen) {
            event.preventDefault();
            if (!disabled) setIsOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={triggerClasses}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <span className="ml-2 shrink-0 text-xs text-zinc-400">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[10050] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <ul role="listbox" aria-labelledby={id} className={listScrollClassName}>
              {options.map((option) => {
                const isActive = option.value === value;
                return (
                  <li key={option.value} className="min-w-0">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      title={option.label}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`flex w-full min-w-0 max-w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
