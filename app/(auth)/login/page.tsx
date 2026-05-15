"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-600";
const rememberedEmailKey = "rememberedLoginEmail";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      const rememberedEmail = window.localStorage.getItem(rememberedEmailKey);
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberEmail(true);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Login] Could not read remembered email from localStorage:", error);
      }
    }
  }, []);

  const isMissingIsActiveColumnError = (error: { message?: string } | null) => {
    if (!error?.message) return false;
    const message = error.message.toLowerCase();
    return message.includes("is_active") && message.includes("column");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string)?.trim() ?? "";
    const password = (formData.get("password") as string) ?? "";
    const shouldRememberEmail = formData.get("rememberEmail") === "on";

    if (!email) {
      setErrorMessage("Моля, въведете имейл.");
      return;
    }
    if (!password) {
      setErrorMessage("Моля, въведете парола.");
      return;
    }

    try {
      if (shouldRememberEmail) {
        window.localStorage.setItem(rememberedEmailKey, email);
      } else {
        window.localStorage.removeItem(rememberedEmailKey);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Login] Could not update remembered email in localStorage:", error);
      }
    }

    setIsSubmitting(true);
    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setErrorMessage(signInError.message || "Неуспешен вход. Моля, опитайте отново.");
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setErrorMessage("Неуспешен вход. Липсва потребител.");
        return;
      }

      const { data: employeeByAuthId, error: fetchError } = await supabase
        .from("employees")
        .select("id, app_role")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (fetchError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Login] Employee fetch error:", fetchError);
        }
        try {
          await supabase.auth.signOut();
        } catch (e) {
          if (process.env.NODE_ENV === "development") console.error("[Login] signOut after fetch error:", e);
        }
        setErrorMessage(
          fetchError.message
            ? `Неуспешна проверка на профила на служителя: ${fetchError.message}`
            : "Неуспешна проверка на профила на служителя. Моля, опитайте отново."
        );
        return;
      }

      let employee = employeeByAuthId;

      if (!employee && authData.user?.email) {
        const { data: employeeByEmail, error: emailLookupError } = await supabase
          .from("employees")
          .select("id, app_role, auth_user_id")
          .ilike("email", authData.user.email)
          .maybeSingle();

        if (!emailLookupError && employeeByEmail) {
          if (!employeeByEmail.auth_user_id) {
            const { error: linkError } = await supabase
              .from("employees")
              .update({ auth_user_id: userId })
              .eq("id", employeeByEmail.id)
              .is("auth_user_id", null);

            if (!linkError) {
              employee = { id: employeeByEmail.id, app_role: employeeByEmail.app_role };
            }
          } else if (employeeByEmail.auth_user_id === userId) {
            employee = { id: employeeByEmail.id, app_role: employeeByEmail.app_role };
          }
        }
      }

      if (!employee) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          if (process.env.NODE_ENV === "development") console.error("[Login] signOut after no employee:", e);
        }
        setErrorMessage(
          "Няма свързан профил на служител към този потребител. Свържете се с администратор."
        );
        return;
      }

      const { data: statusRow, error: statusError } = await supabase
        .from("employees")
        .select("is_active")
        .eq("id", employee.id)
        .maybeSingle();

      const isExplicitlyInactive = statusRow?.is_active === false;

      if (statusError && !isMissingIsActiveColumnError(statusError)) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Login] Could not read employees.is_active; allowing login for backward compatibility.");
        }
      }

      if (isExplicitlyInactive) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          if (process.env.NODE_ENV === "development") console.error("[Login] signOut after inactive user:", e);
        }
        setErrorMessage("Този акаунт е деактивиран. Свържете се с администратор.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Възникна неочаквана грешка.";
      setErrorMessage(message);
      if (process.env.NODE_ENV === "development") {
        console.error("[Login] Unexpected error:", err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-12">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100">Вход</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Влез с работния си имейл и парола.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-300">
              Имейл
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className={inputClassName}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-zinc-300">
              Парола
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`${inputClassName} pr-10`}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}
                title={showPassword ? "Скрий паролата" : "Покажи паролата"}
                disabled={isSubmitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M3 3l18 18" strokeLinecap="round" />
                    <path
                      d="M10.58 10.58a2 2 0 0 0 2.83 2.83"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.36 5.2A10.94 10.94 0 0 1 12 5c5 0 9 4.5 10 7-1.04 2.6-3.19 5.66-6.64 6.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.23 6.23C3.86 7.8 2.39 10.2 2 12c.64 1.6 1.69 3.22 3.14 4.54"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path
                      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="rememberEmail"
              checked={rememberEmail}
              onChange={(event) => {
                const isChecked = event.target.checked;
                setRememberEmail(isChecked);
                if (!isChecked) {
                  try {
                    window.localStorage.removeItem(rememberedEmailKey);
                  } catch (error) {
                    if (process.env.NODE_ENV === "development") {
                      console.warn("[Login] Could not clear remembered email from localStorage:", error);
                    }
                  }
                }
              }}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-zinc-500 bg-zinc-800 text-zinc-200 focus:ring-zinc-600"
            />
            <span>Запомни ме</span>
          </label>

          {errorMessage && (
            <p className="text-sm text-red-400" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
          >
            {isSubmitting ? "Влизане..." : "Вход"}
          </button>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Нямаш акаунт? Свържи се с администратор, за да ти бъде създаден профил.
          </p>
        </form>
      </div>
    </div>
  );
}

