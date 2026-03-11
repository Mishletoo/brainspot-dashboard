"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-600";

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string)?.trim().toLowerCase() ?? "";
    const password = (formData.get("password") as string) ?? "";
    const confirmPassword = (formData.get("confirm_password") as string) ?? "";

    if (!email) {
      setErrorMessage("Please enter your email.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setErrorMessage(signUpError.message || "Registration failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (!authData.user) {
      setErrorMessage("Registration failed. No user returned.");
      setIsSubmitting(false);
      return;
    }

    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      await supabase.auth.signOut();
      setErrorMessage("Could not verify employee record. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (!employee) {
      await supabase.auth.signOut();
      setErrorMessage(
        "No employee record found for this email. Please contact your administrator to be added to the system first."
      );
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("employees")
      .update({ auth_user_id: authData.user.id })
      .eq("id", employee.id);

    if (updateError) {
      await supabase.auth.signOut();
      setErrorMessage("Could not link your account. Please try again or contact support.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-12">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100">Employee Registration</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Register with your work email. You must already be added as an employee.
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
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className="text-sm font-medium text-zinc-300">
              Confirm password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
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
            {isSubmitting ? "Registering…" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
