"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Check, Ban, Clock } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
        isAdmin ? "bg-brand/15 text-brand" : "bg-[#2a2a2a] text-[#a0a0a0]"
      }`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:    { label: "Active",    cls: "bg-green-500/15 text-green-400" },
    PENDING:   { label: "Pending",   cls: "bg-yellow-500/15 text-yellow-400" },
    SUSPENDED: { label: "Suspended", cls: "bg-red-500/15 text-red-400" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-[#2a2a2a] text-[#666]" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

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

  useEffect(() => { loadUsers(); }, []);

  async function setStatus(id: string, status: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: data.data.status } : u))
        );
      } else {
        setError(data.error ?? "Action failed");
      }
    } catch {
      setError("Action failed");
    } finally {
      setActionId(null);
    }
  }

  const pendingCount = users.filter((u) => u.status === "PENDING").length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-[#ededed]">Users</h1>
          <p className="text-xs text-[#666] mt-0.5">
            {loading
              ? "Loading..."
              : `${users.length} user${users.length !== 1 ? "s" : ""}${pendingCount > 0 ? ` · ${pendingCount} pending approval` : ""}`}
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

        <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e2e]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden sm:table-cell">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e2e2e]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#666] text-sm">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#666] text-sm">No users found</td>
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
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-[#a0a0a0]">{formatDate(user.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {user.status === "PENDING" && (
                          <button
                            onClick={() => setStatus(user.id, "ACTIVE")}
                            disabled={actionId === user.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <Check size={12} />
                            Approve
                          </button>
                        )}
                        {user.status === "ACTIVE" && (
                          <button
                            onClick={() => setStatus(user.id, "SUSPENDED")}
                            disabled={actionId === user.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            title="Suspend"
                          >
                            <Ban size={12} />
                            Suspend
                          </button>
                        )}
                        {user.status === "SUSPENDED" && (
                          <button
                            onClick={() => setStatus(user.id, "ACTIVE")}
                            disabled={actionId === user.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333] transition-colors disabled:opacity-50"
                            title="Reactivate"
                          >
                            <Clock size={12} />
                            Reactivate
                          </button>
                        )}
                      </div>
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
