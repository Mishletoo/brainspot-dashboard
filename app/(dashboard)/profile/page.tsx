 "use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "bs-input mt-1 w-full px-3 py-2 text-sm";

type EmployeeProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  photo_url: string | null;
};

function normalizeDateForInput(value: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = trimmed.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return "";
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  return candidate;
}

function normalizeDateForSave(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Неуспешно зареждане на профила. Моля, влезте отново.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, phone, birth_date, photo_url")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setErrorMessage("Неуспешно зареждане на профила на служителя. Свържете се с администратор.");
        setIsLoading(false);
        return;
      }

      setProfile(data);
      setPhone(data.phone ?? "");
      setBirthDate(normalizeDateForInput(data.birth_date));
      setPhotoUrl(data.photo_url ?? "");
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    const normalizedBirthDate = normalizeDateForSave(birthDate);
    if (birthDate.trim() !== "" && normalizedBirthDate === null) {
      setErrorMessage("Невалидна дата. Моля, използвайте формат YYYY-MM-DD.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.rpc("update_employee_profile", {
      p_phone: phone.trim() === "" ? null : phone.trim(),
      p_birth_date: normalizedBirthDate,
      p_photo_url: photoUrl.trim() === "" ? null : photoUrl.trim(),
    });

    if (error) {
      setErrorMessage("Неуспешно обновяване на профила. Моля, опитайте отново.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Профилът е обновен успешно.");
    setIsSaving(false);
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!isPasswordFormValid) {
      setErrorMessage(passwordValidationMessage);
      return;
    }

    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMessage("Неуспешна смяна на паролата. Моля, опитайте отново.");
      setIsChangingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setSuccessMessage("Паролата е обновена успешно.");
    setIsChangingPassword(false);
  };

  const displayName =
    [profile?.first_name, profile?.last_name].filter((part) => part && part.trim().length > 0).join(" ") ||
    "Вашият профил";
  const trimmedNewPassword = newPassword.trim();
  const hasBothPasswordFields = newPassword.length > 0 && confirmPassword.length > 0;
  let passwordValidationMessage = "";

  if (trimmedNewPassword.length > 0 && trimmedNewPassword.length < 8) {
    passwordValidationMessage = "Паролата трябва да е поне 8 символа.";
  } else if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
    passwordValidationMessage = "Паролите не съвпадат.";
  }

  const isPasswordFormValid = hasBothPasswordFields && passwordValidationMessage === "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col justify-center py-8">
      <div className="bs-surface-card rounded-xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-bs-text)]">Профил</h1>
          <p className="mt-1 text-sm text-[var(--color-bs-muted)]">
            Преглед и редакция на данните в профила.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--color-bs-muted)]">Зареждане на профила...</p>
        ) : errorMessage ? (
          <p className="text-sm text-rose-200" role="alert">
            {errorMessage}
          </p>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-4">
              <p className="text-sm font-medium text-[var(--color-bs-text)]">{displayName}</p>
              {profile?.email && <p className="mt-1 text-xs text-[var(--color-bs-muted)]">{profile.email}</p>}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">Име</p>
                <p className="mt-1 text-sm text-[var(--color-bs-text)]">{displayName}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-bs-border-soft)] bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--color-bs-subtle)]">Имейл</p>
                <p className="mt-1 text-sm text-[var(--color-bs-text)]">{profile?.email ?? "-"}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="phone" className="text-sm font-medium text-[var(--color-bs-muted)]">
                  Телефон
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={inputClassName}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="birth_date" className="text-sm font-medium text-[var(--color-bs-muted)]">
                  Дата на раждане
                </label>
                <input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  className={inputClassName}
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="photo_url" className="text-sm font-medium text-[var(--color-bs-muted)]">
                  Снимка (URL)
                </label>
                <input
                  id="photo_url"
                  name="photo_url"
                  type="url"
                  className={inputClassName}
                  value={photoUrl}
                  onChange={(event) => setPhotoUrl(event.target.value)}
                  disabled={isSaving}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-rose-200" role="alert">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="text-sm text-emerald-200" role="status">
                  {successMessage}
                </p>
              )}

              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bs-btn-primary px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? "Запазване..." : "Запази промените"}
                </button>
              </div>
            </form>

            <form
              onSubmit={handlePasswordSubmit}
              className="mt-8 flex flex-col gap-4 border-t border-[var(--color-bs-border-soft)] pt-6"
            >
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-bs-text)]">Смяна на парола</h2>
                <p className="mt-1 text-xs text-[var(--color-bs-muted)]">Използвайте поне 8 символа за по-добра сигурност.</p>
              </div>
              <div>
                <label htmlFor="new_password" className="text-sm font-medium text-[var(--color-bs-muted)]">
                  Нова парола
                </label>
                <div className="relative">
                  <input
                    id="new_password"
                    name="new_password"
                    type={showNewPassword ? "text" : "password"}
                    className={`${inputClassName} pr-20`}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={isChangingPassword}
                    aria-invalid={passwordValidationMessage.length > 0}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-bs-muted)] transition-colors hover:text-[var(--color-bs-text)]"
                    aria-label={showNewPassword ? "Скрий новата парола" : "Покажи новата парола"}
                    disabled={isChangingPassword}
                  >
                    {showNewPassword ? "Скрий" : "Покажи"}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm_password" className="text-sm font-medium text-[var(--color-bs-muted)]">
                  Потвърди парола
                </label>
                <div className="relative">
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    className={`${inputClassName} pr-20`}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={isChangingPassword}
                    aria-invalid={passwordValidationMessage.length > 0}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-bs-muted)] transition-colors hover:text-[var(--color-bs-text)]"
                    aria-label={showConfirmPassword ? "Скрий потвърдената парола" : "Покажи потвърдената парола"}
                    disabled={isChangingPassword}
                  >
                    {showConfirmPassword ? "Скрий" : "Покажи"}
                  </button>
                </div>
              </div>

              {passwordValidationMessage && (
                <p className="text-sm text-rose-200" role="alert">
                  {passwordValidationMessage}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword || !isPasswordFormValid}
                  className="bs-btn px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {isChangingPassword ? "Обновяване..." : "Обнови паролата"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

