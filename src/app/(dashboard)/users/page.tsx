"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
        isAdmin
          ? "bg-brand/15 text-brand"
          : "bg-[#2a2a2a] text-[#a0a0a0]"
      }`}
    >
      {role}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) setUsers(data.data);
      else setError(data.error ?? "Failed to load users");
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-[#ededed]">Users</h1>
          <p className="text-xs text-[#666] mt-0.5">
            {loading ? "Loading..." : `${users.length} user${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] hover:text-[#ededed] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e2e]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden md:table-cell">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden sm:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e2e2e]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#666] text-sm">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#666] text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#222] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-brand">
                            {getInitials(user.name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-[#ededed] font-medium">{user.name}</p>
                          <p className="text-xs text-[#666]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-[#666] font-mono">
                        {user.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-[#a0a0a0]">
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
