"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-600";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

    if (!email) {
      setErrorMessage("Please enter your email.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setErrorMessage(signInError.message || "Login failed. Please try again.");
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setErrorMessage("Login failed. No user returned.");
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
            ? `Could not verify employee record: ${fetchError.message}`
            : "Could not verify employee record. Please try again."
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
          "No employee account linked to this user. Please register first or contact your administrator."
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
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
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
          <h1 className="text-2xl font-semibold text-zinc-100">Login</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Sign in with your work email and password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-zinc-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

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
            {isSubmitting ? "Signing in…" : "Login"}
          </button>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Нямаш акаунт? Свържи се с администратор, за да ти бъде създаден профил.
          </p>
        </form>
      </div>
    </div>
  );
}

