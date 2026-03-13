"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Plus, Trash2, ExternalLink, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ImportDatabaseModal } from "@/components/database/ImportDatabaseModal";

interface DatabaseRecord {
  id: string;
  name: string;
  schemaName: string;
  createdAt: string;
}

export default function DatabasePage() {
  const router = useRouter();
  const [databases, setDatabases] = useState<DatabaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DatabaseRecord | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);

  async function loadDatabases() {
    setLoading(true);
    try {
      const res = await fetch("/api/databases");
      const data = await res.json();
      if (data.success) setDatabases(data.data);
    } catch {
      setError("Failed to load databases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDatabases(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (data.success) {
        setNewName("");
        setShowCreate(false);
        await loadDatabases();
      } else {
        setError(data.error ?? "Failed to create database");
      }
    } catch {
      setError("Failed to create database");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete || confirmName !== confirmDelete.name) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await fetch(`/api/databases/${confirmDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDatabases((prev) => prev.filter((d) => d.id !== confirmDelete.id));
        setConfirmDelete(null);
        setConfirmName("");
      } else {
        setError(data.error ?? "Failed to delete database");
      }
    } catch {
      setError("Failed to delete database");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-[#ededed]">Database</h1>
          <p className="text-xs text-[#666] mt-0.5">
            {loading ? "Loading..." : `${databases.length} database${databases.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#242424] hover:bg-[#2e2e2e] text-[#a0a0a0] border border-[#2e2e2e] rounded-md transition-colors"
          >
            <Download size={13} />
            Import
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand hover:bg-brand-hover text-black font-medium rounded-md transition-colors"
          >
            <Plus size={13} />
            New database
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="mb-6 bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-5">
            <h2 className="text-sm font-medium text-[#ededed] mb-4">New database</h2>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="my_database"
                required
                className="flex-1 px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-black text-sm font-medium rounded-md transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="px-4 py-2 text-sm text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Database list */}
        {loading ? (
          <div className="text-center py-12 text-[#666] text-sm">Loading databases...</div>
        ) : databases.length === 0 ? (
          <div className="text-center py-16">
            <Database size={40} className="mx-auto text-[#333] mb-3" />
            <p className="text-sm text-[#666] mb-4">No databases yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs text-brand hover:underline"
            >
              Create your first database
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {databases.map((db) => (
              <div
                key={db.id}
                className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-5 hover:border-[#404040] transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-brand/15 rounded flex items-center justify-center">
                      <Database size={14} className="text-brand" />
                    </div>
                    <span className="text-sm font-medium text-[#ededed]">{db.name}</span>
                  </div>
                  <button
                    onClick={() => { setConfirmDelete(db); setConfirmName(""); }}
                    className="p-1 rounded text-[#666] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-[11px] text-[#555] font-mono mb-4">{db.schemaName}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">{formatDate(db.createdAt)}</span>
                  <button
                    onClick={() => router.push(`/dashboard/database/${db.id}/sql`)}
                    className="flex items-center gap-1 text-xs text-brand hover:underline"
                  >
                    Open <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import modal */}
      {showImport && (
        <ImportDatabaseModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadDatabases(); }}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-sm font-medium text-[#ededed] mb-1">Delete database</h2>
            <p className="text-xs text-[#a0a0a0] mb-4">
              This will permanently drop the <span className="font-mono text-[#ededed]">{confirmDelete.schemaName}</span> schema and all its tables. This action cannot be undone.
            </p>
            <p className="text-xs text-[#a0a0a0] mb-2">
              Type <span className="font-mono text-[#ededed]">{confirmDelete.name}</span> to confirm:
            </p>
            <input
              autoFocus
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={confirmDelete.name}
              className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-red-500 transition-colors mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setConfirmDelete(null); setConfirmName(""); }}
                className="px-4 py-2 text-sm text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmName !== confirmDelete.name || !!deletingId}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-md transition-colors"
              >
                {deletingId ? "Deleting..." : "Delete database"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
