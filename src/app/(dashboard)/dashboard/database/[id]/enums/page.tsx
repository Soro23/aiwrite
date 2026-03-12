"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ListOrdered, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";
import { ConfirmDropModal } from "@/components/database/ConfirmDropModal";

interface EnumInfo {
  name: string;
  values: string[];
}

export default function EnumsPage() {
  const params = useParams<{ id: string }>();
  const [enums, setEnums] = useState<EnumInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValues, setNewValues] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dropping, setDropping] = useState<EnumInfo | null>(null);
  const [dropLoading, setDropLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/databases/${params.id}/enums`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setEnums(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.id]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    const values = newValues.split(",").map((v) => v.trim()).filter(Boolean);
    const res = await fetch(`/api/databases/${params.id}/enums`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, values }),
    });
    const d = await res.json();
    setCreating(false);
    if (d.success) { setShowCreate(false); setNewName(""); setNewValues(""); load(); }
    else setCreateError(d.error);
  };

  const handleDrop = async () => {
    if (!dropping) return;
    setDropLoading(true);
    await fetch(`/api/databases/${params.id}/enums/${encodeURIComponent(dropping.name)}`, { method: "DELETE" });
    setDropLoading(false);
    setDropping(null);
    load();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-[#2e2e2e] flex items-center justify-between">
        <span className="text-xs font-medium text-[#888]">Enumerations</span>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80">
          <Plus size={11} /> New enum
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><p className="text-xs text-[#555]">Loading…</p></div>
      ) : enums.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="No enumerations"
          description="Create custom enum types to use as column types in your tables."
          action={{ label: "New enum", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enums.map((e) => (
              <div key={e.name} className="border border-[#2e2e2e] rounded-lg p-4 bg-[#141414] relative group">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-[#ededed]">{e.name}</p>
                  <button
                    onClick={() => setDropping(e)}
                    className="hidden group-hover:flex p-1 text-[#444] hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {e.values.map((v) => (
                    <span key={v} className="px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] text-[10px] text-[#888]">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg w-full max-w-md mx-4 shadow-xl">
            <div className="px-5 py-4 border-b border-[#2e2e2e] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#ededed]">Create enum</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#555] hover:text-[#888]"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my_enum"
                  className="w-full bg-[#141414] border border-[#2e2e2e] rounded px-3 py-2 text-xs text-[#ccc] focus:outline-none focus:border-[#444]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Values (comma-separated)</label>
                <input
                  value={newValues}
                  onChange={(e) => setNewValues(e.target.value)}
                  placeholder="active, inactive, pending"
                  className="w-full bg-[#141414] border border-[#2e2e2e] rounded px-3 py-2 text-xs text-[#ccc] focus:outline-none focus:border-[#444]"
                />
              </div>
              {createError && <p className="text-xs text-red-400">{createError}</p>}
            </div>
            <div className="px-5 py-3 border-t border-[#2e2e2e] flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-xs text-[#888] border border-[#2e2e2e] hover:border-[#444]">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim() || !newValues.trim()} className="px-3 py-1.5 rounded text-xs font-medium bg-brand text-black hover:bg-brand/90 disabled:opacity-50">
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDropModal
        isOpen={!!dropping}
        title={`Drop enum "${dropping?.name}"?`}
        description="Columns using this type must be altered first. This action cannot be undone."
        onConfirm={handleDrop}
        onCancel={() => setDropping(null)}
        loading={dropLoading}
      />
    </div>
  );
}
