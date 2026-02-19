"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("LOGIN_RESULT", { data, error });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#080b0f] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/40" style={{ width: 72, height: 72 }}>
            <img src="/brand/brainspot-icon.png" alt="Brainspot" width={72} height={72} className="h-full w-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Brainspot</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Sign in to your account</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161a22] p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="name@example.com"
                className="mt-1.5 w-full rounded-xl border border-zinc-700/60 bg-[#0f1116] px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-zinc-700/60 bg-[#0f1116] px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-lime-400/60 focus:ring-1 focus:ring-lime-400/20"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-400">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <p className="text-xs text-zinc-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-lime-300 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-lime-400 hover:text-lime-300 transition">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
