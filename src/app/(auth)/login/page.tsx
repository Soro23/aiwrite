"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Login failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 justify-center">
        <div className="bg-primary/20 p-2 rounded-lg">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-background-dark">
            <span className="text-sm font-bold">A</span>
          </div>
        </div>
        <span className="text-lg font-semibold text-slate-900 dark:text-white">
          aiwrite
        </span>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Sign in to your account
        </p>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-primary/5 border border-transparent rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-primary/5 border border-transparent rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-background-dark font-semibold text-sm rounded-lg transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
