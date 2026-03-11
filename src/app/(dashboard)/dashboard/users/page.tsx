"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Check, Ban, Clock, Pencil, Trash2, X } from "lucide-react";
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
      isAdmin ? "bg-brand/15 text-brand" : "bg-[#2a2a2a] text-[#a0a0a0]"
    }`}>
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

// ─── Edit modal ────────────────────────────────────────────────────────────

interface EditModalProps {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}

function EditModal({ user, onClose, onSaved }: EditModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.data);
        onClose();
      } else {
        setError(data.error ?? "Failed to save");
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e]">
          <h2 className="text-sm font-medium text-[#ededed]">Edit user</h2>
          <button onClick={onClose} className="p-1 rounded text-[#666] hover:text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-[#666] mb-1.5">Name</label>
            <input
              ref={nameRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-[#666] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-brand hover:bg-brand-hover text-black text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] hover:text-[#ededed] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete confirmation modal ─────────────────────────────────────────────

interface DeleteModalProps {
  user: User;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteModal({ user, onClose, onDeleted }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onDeleted(user.id);
        onClose();
      } else {
        setError(data.error ?? "Failed to delete");
      }
    } catch {
      setError("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg w-full max-w-sm mx-4 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e]">
          <h2 className="text-sm font-medium text-[#ededed]">Delete user</h2>
          <button onClick={onClose} className="p-1 rounded text-[#666] hover:text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-[#a0a0a0] mb-1">
            Are you sure you want to delete{" "}
            <span className="text-[#ededed] font-medium">{user.name}</span>?
          </p>
          <p className="text-xs text-[#555]">
            This will permanently remove their account, files, databases, and API keys.
          </p>

          <div className="flex gap-2 mt-5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete user"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] hover:text-[#ededed] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

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
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: data.data.status } : u)));
      } else {
        setError(data.error ?? "Action failed");
      }
    } catch {
      setError("Action failed");
    } finally {
      setActionId(null);
    }
  }

  function handleUserSaved(updated: User) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function handleUserDeleted(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  const pendingCount = users.filter((u) => u.status === "PENDING").length;

  return (
    <div className="flex-1 overflow-auto">
      {editingUser && (
        <EditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={handleUserSaved}
        />
      )}
      {deletingUser && (
        <DeleteModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={handleUserDeleted}
        />
      )}

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
                users.map((user) => {
                  const isAdmin = user.role === "ADMIN";
                  const busy = actionId === user.id;
                  return (
                    <tr key={user.id} className="hover:bg-[#222] transition-colors group">
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
                          {/* Status actions — only for non-admins */}
                          {!isAdmin && user.status === "PENDING" && (
                            <button
                              onClick={() => setStatus(user.id, "ACTIVE")}
                              disabled={busy}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                            >
                              <Check size={12} />
                              Approve
                            </button>
                          )}
                          {!isAdmin && user.status === "ACTIVE" && (
                            <button
                              onClick={() => setStatus(user.id, "SUSPENDED")}
                              disabled={busy}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                              <Ban size={12} />
                              Suspend
                            </button>
                          )}
                          {!isAdmin && user.status === "SUSPENDED" && (
                            <button
                              onClick={() => setStatus(user.id, "ACTIVE")}
                              disabled={busy}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333] transition-colors disabled:opacity-50"
                            >
                              <Clock size={12} />
                              Reactivate
                            </button>
                          )}

                          {/* Edit — only for non-admins */}
                          {!isAdmin && (
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 rounded text-[#666] hover:text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors opacity-0 group-hover:opacity-100"
                              title="Edit user"
                            >
                              <Pencil size={13} />
                            </button>
                          )}

                          {/* Delete — only for non-admins */}
                          {!isAdmin && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete user"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
