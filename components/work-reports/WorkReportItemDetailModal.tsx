"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CustomSelect, type SelectOption } from "@/components/ui/CustomSelect";
import { DatePicker } from "@/components/ui/DatePicker";

export type WorkReportItemEditValues = {
  clientId: string;
  serviceId: string;
  taskDescription: string;
  notes: string;
  hours: string;
  dateValue: { start: string; end: string };
  priority: string;
  taskStatus: string;
};

export type WorkReportItemDetail = {
  id: string;
  clientName: string;
  serviceName: string;
  taskDescription: string;
  notes: string;
  hoursLabel: string;
  dateLabel: string;
  priorityLabel: string;
  statusLabel: string;
  statusClassName: string;
  employeeName: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  editValues: WorkReportItemEditValues;
};

export type WorkReportItemDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  item: WorkReportItemDetail | null;
  canEdit?: boolean;
  clientOptions: SelectOption[];
  serviceOptions: SelectOption[];
  priorityOptions: SelectOption[];
  statusOptions: SelectOption[];
  statusClassNameFor?: (status: string) => string;
  onSave?: (values: WorkReportItemEditValues) => Promise<{ ok: true } | { ok: false; message: string }>;
};

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-1 min-w-0 text-sm leading-relaxed text-zinc-100">{children}</div>
    </div>
  );
}


function editValuesEqual(a: WorkReportItemEditValues, b: WorkReportItemEditValues) {
  return (
    a.clientId === b.clientId &&
    a.serviceId === b.serviceId &&
    a.taskDescription === b.taskDescription &&
    a.notes === b.notes &&
    a.hours === b.hours &&
    a.dateValue.start === b.dateValue.start &&
    a.dateValue.end === b.dateValue.end &&
    a.priority === b.priority &&
    a.taskStatus === b.taskStatus
  );
}

function parseHoursInput(rawValue: string): { value: number | null; error: string | null } {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { value: null, error: "Часовете са задължителни." };
  }

  const normalized = trimmed.replace(",", ".");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    return { value: null, error: "Невалиден формат за часове. Използвайте число, напр. 2, 2.5, 0.5." };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: "Невалидни часове." };
  }

  if (parsed < 0) {
    return { value: null, error: "Часовете не могат да бъдат отрицателни." };
  }

  return { value: parsed, error: null };
}

const fieldInputClass =
  "w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500";
const fieldLabelClass = "text-[11px] font-medium uppercase tracking-wider text-zinc-500";

export function WorkReportItemDetailModal({
  isOpen,
  onClose,
  item,
  canEdit = false,
  clientOptions,
  serviceOptions,
  priorityOptions,
  statusOptions,
  statusClassNameFor,
  onSave,
}: WorkReportItemDetailModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<WorkReportItemEditValues | null>(null);
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardClosesModal, setDiscardClosesModal] = useState(false);

  const baselineValues = item?.editValues ?? null;

  const isDirty = useMemo(() => {
    if (!isEditing || !formValues || !baselineValues) return false;
    return !editValuesEqual(formValues, baselineValues);
  }, [baselineValues, formValues, isEditing]);

  const resetEditState = useCallback(() => {
    setIsEditing(false);
    setFormValues(null);
    setValidationError("");
    setShowDiscardConfirm(false);
    setDiscardClosesModal(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        resetEditState();
      });
    }
  }, [isOpen, resetEditState]);

  const itemId = item?.id;

  useEffect(() => {
    if (!isOpen || !itemId) return;
    queueMicrotask(() => {
      resetEditState();
    });
  }, [itemId, isOpen, resetEditState]);

  const requestClose = useCallback(() => {
    if (isEditing && isDirty) {
      setDiscardClosesModal(true);
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, isEditing, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showDiscardConfirm) {
        setShowDiscardConfirm(false);
        return;
      }
      requestClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, requestClose, showDiscardConfirm]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const startEditing = () => {
    if (!item || !canEdit) return;
    setFormValues({ ...item.editValues });
    setValidationError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (isDirty) {
      setDiscardClosesModal(false);
      setShowDiscardConfirm(true);
      return;
    }
    resetEditState();
  };

  const confirmDiscard = () => {
    const shouldCloseModal = discardClosesModal;
    resetEditState();
    if (shouldCloseModal) {
      onClose();
    }
  };

  const validateForm = (values: WorkReportItemEditValues): string | null => {
    if (!values.clientId) return "Изберете клиент.";
    if (!values.serviceId) return "Изберете услуга.";
    if (!values.taskDescription.trim()) return "Попълнете описание на задачата.";
    const parsedHoursResult = parseHoursInput(values.hours);
    if (parsedHoursResult.error || parsedHoursResult.value == null) {
      return parsedHoursResult.error ?? "Въведете валидни часове (число >= 0).";
    }
    return null;
  };

  const handleSave = async () => {
    if (!formValues || !onSave) return;
    const error = validateForm(formValues);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError("");
    setIsSaving(true);
    const result = await onSave(formValues);
    setIsSaving(false);

    if (!result.ok) {
      setValidationError(result.message);
      return;
    }

    resetEditState();
  };

  if (!isOpen || !item) return null;

  const title = isEditing ? "Редакция на задача" : "Преглед на задача";
  const statusClass =
    statusClassNameFor?.(isEditing && formValues ? formValues.taskStatus : item.editValues.taskStatus) ??
    item.statusClassName;

  const clientSelectWithPlaceholder = [{ value: "", label: "Избери клиент" }, ...clientOptions];
  const serviceSelectWithPlaceholder = [{ value: "", label: "Избери услуга" }, ...serviceOptions];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={requestClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-report-item-detail-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</p>
            <h2
              id="work-report-item-detail-title"
              className="mt-1 break-words text-lg font-semibold text-white"
            >
              {isEditing && formValues ? formValues.taskDescription || "Задача" : item.taskDescription}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Затвори"
          >
            ✕
          </button>
        </div>

        <div className="bs-scroll-fade min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          {validationError && (
            <p className="mb-4 rounded-lg border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
              {validationError}
            </p>
          )}

          {isEditing && formValues ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="relative flex min-w-0 flex-col gap-1">
                <span className={fieldLabelClass}>Клиент</span>
                <CustomSelect
                  value={formValues.clientId}
                  onChange={(clientId) => setFormValues((prev) => (prev ? { ...prev, clientId } : prev))}
                  options={clientSelectWithPlaceholder}
                  disabled={isSaving}
                />
              </label>

              <label className="relative flex min-w-0 flex-col gap-1">
                <span className={fieldLabelClass}>Услуга</span>
                <CustomSelect
                  value={formValues.serviceId}
                  onChange={(serviceId) => setFormValues((prev) => (prev ? { ...prev, serviceId } : prev))}
                  options={serviceSelectWithPlaceholder}
                  disabled={isSaving}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                <span className={fieldLabelClass}>Задача</span>
                <textarea
                  rows={3}
                  value={formValues.taskDescription}
                  onChange={(event) =>
                    setFormValues((prev) => (prev ? { ...prev, taskDescription: event.target.value } : prev))
                  }
                  disabled={isSaving}
                  className={`${fieldInputClass} resize-y`}
                  placeholder="Опишете конкретната задача"
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabelClass}>Часове</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formValues.hours}
                  onChange={(event) =>
                    setFormValues((prev) => (prev ? { ...prev, hours: event.target.value } : prev))
                  }
                  disabled={isSaving}
                  className={fieldInputClass}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabelClass}>Дата</span>
                <DatePicker
                  value={formValues.dateValue}
                  onChange={(dateValue) => setFormValues((prev) => (prev ? { ...prev, dateValue } : prev))}
                  placeholder="Избери дата"
                  locale="bg-BG"
                  className="w-full min-w-0"
                />
              </label>

              <label className="relative flex min-w-0 flex-col gap-1">
                <span className={fieldLabelClass}>Приоритет</span>
                <CustomSelect
                  value={formValues.priority}
                  onChange={(priority) => setFormValues((prev) => (prev ? { ...prev, priority } : prev))}
                  options={priorityOptions}
                  disabled={isSaving}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabelClass}>Статус</span>
                <select
                  value={formValues.taskStatus}
                  onChange={(event) =>
                    setFormValues((prev) => (prev ? { ...prev, taskStatus: event.target.value } : prev))
                  }
                  disabled={isSaving}
                  className={`${fieldInputClass} rounded-full font-medium ${statusClass}`}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-zinc-900 text-zinc-100">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                <span className={fieldLabelClass}>Бележка</span>
                <textarea
                  rows={3}
                  value={formValues.notes}
                  onChange={(event) =>
                    setFormValues((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                  }
                  disabled={isSaving}
                  className={`${fieldInputClass} resize-y`}
                  placeholder="Бележка към задачата"
                />
              </label>

              <DetailField label="Служител">{item.employeeName}</DetailField>
              <DetailField label="Създадена на">{item.createdAtLabel}</DetailField>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label="Клиент">{item.clientName}</DetailField>
                <DetailField label="Услуга">{item.serviceName}</DetailField>
                <DetailField label="Служител">{item.employeeName}</DetailField>
                <DetailField label="Часове">{item.hoursLabel}</DetailField>
                <DetailField label="Дата">{item.dateLabel}</DetailField>
                <DetailField label="Приоритет">{item.priorityLabel}</DetailField>
                <DetailField label="Статус">
                  <span
                    className={`inline-flex max-w-full rounded-full border px-2.5 py-0.5 text-xs font-medium ${item.statusClassName}`}
                  >
                    {item.statusLabel}
                  </span>
                </DetailField>
                <DetailField label="Създадена на">{item.createdAtLabel}</DetailField>
                <DetailField label="Последна редакция">{item.updatedAtLabel}</DetailField>
              </div>

              <div className="mt-4 min-w-0">
                <p className={fieldLabelClass}>Задача</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">
                  {item.taskDescription}
                </p>
              </div>

              <div className="mt-4 min-w-0">
                <p className={fieldLabelClass}>Бележка</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
                  {item.notes || "—"}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-60"
              >
                {isSaving ? "Запазване..." : "Запази промените"}
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
                >
                  Редактирай
                </button>
              )}
              <button
                type="button"
                onClick={requestClose}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
              >
                Затвори
              </button>
            </>
          )}
        </div>
      </div>

      {showDiscardConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShowDiscardConfirm(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">Незапазени промени</h3>
            <p className="mt-2 text-sm text-zinc-300">
              Имате незапазени промени. Сигурни ли сте, че искате да затворите без да запазите?
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
              >
                Продължи редакцията
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Затвори без запазване
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
