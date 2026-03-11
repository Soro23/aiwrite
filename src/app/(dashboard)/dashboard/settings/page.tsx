"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

function Section({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#2e2e2e]">
        <h2 className="text-sm font-medium text-[#ededed]">{title}</h2>
        <p className="text-xs text-[#666] mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs text-[#a0a0a0] mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setUser(d.data.user);
          setName(d.data.user.name);
          setEmail(d.data.user.email);
        }
      });
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
      } else {
        setProfileMsg({ type: "error", text: data.error ?? "Update failed" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match" });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMsg({ type: "success", text: "Password updated successfully" });
      } else {
        setPasswordMsg({ type: "error", text: data.error ?? "Update failed" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-[#2e2e2e] px-6 py-4">
        <h1 className="text-sm font-medium text-[#ededed]">Settings</h1>
        <p className="text-xs text-[#666] mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="p-6 max-w-2xl space-y-6">
        {/* Profile */}
        <Section title="Profile" description="Update your name and email address">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Role" value={user.role} disabled />
                <Input
                  label="Member since"
                  value={new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                  disabled
                />
              </div>
            )}

            {profileMsg && (
              <div className={`px-3 py-2.5 rounded-md text-sm ${
                profileMsg.type === "success"
                  ? "bg-brand/10 border border-brand/20 text-brand"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>
                {profileMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-black text-sm font-medium rounded-md transition-colors"
              >
                {profileLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title="Password" description="Change your account password">
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <p className="text-xs text-[#666]">
              Min 8 chars · uppercase · lowercase · number · special character
            </p>

            {passwordMsg && (
              <div className={`px-3 py-2.5 rounded-md text-sm ${
                passwordMsg.type === "success"
                  ? "bg-brand/10 border border-brand/20 text-brand"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-black text-sm font-medium rounded-md transition-colors"
              >
                {passwordLoading ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </Section>

        {/* Account info */}
        <Section title="Account" description="Your account identifier">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#666] mb-1">User ID</p>
              <p className="text-xs font-mono text-[#a0a0a0] bg-[#222] border border-[#2e2e2e] rounded px-3 py-2">
                {user?.id ?? "—"}
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
