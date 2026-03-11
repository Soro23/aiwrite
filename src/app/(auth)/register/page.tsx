"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Registration failed");
        return;
      }

      if (data.data.pending) {
        setPending(true);
      } else {
        // Bootstrap admin — auto-login
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center">
            <span className="text-sm font-bold text-black">A</span>
          </div>
          <span className="text-lg font-semibold text-[#ededed]">aiwrite</span>
        </div>

        <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 size={40} className="text-brand" strokeWidth={1.5} />
          </div>
          <h1 className="text-lg font-semibold text-[#ededed] mb-2">Account submitted</h1>
          <p className="text-sm text-[#a0a0a0]">
            Your account request has been received. You can log in once an admin approves it.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-brand hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 justify-center">
        <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center">
          <span className="text-sm font-bold text-black">A</span>
        </div>
        <span className="text-lg font-semibold text-[#ededed]">aiwrite</span>
      </div>

      {/* Card */}
      <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-8">
        <h1 className="text-xl font-semibold text-[#ededed] mb-1">Create an account</h1>
        <p className="text-sm text-[#a0a0a0] mb-6">Request access to aiwrite</p>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1.5">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-9 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#a0a0a0] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1.5">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3 py-2 pr-9 bg-[#222] border rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none transition-colors ${
                  confirm && confirm !== password
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-[#2e2e2e] focus:border-brand"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#a0a0a0] transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirm && confirm !== password && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!!confirm && confirm !== password)}
            className="w-full py-2 px-4 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-md transition-colors"
          >
            {loading ? "Sending request..." : "Request access"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[#a0a0a0] mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
