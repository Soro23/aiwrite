"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Code2, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";
import { ConfirmDropModal } from "@/components/database/ConfirmDropModal";

interface FunctionInfo {
  name: string;
  language: string;
  returnType: string;
  argumentTypes: string;
  definition: string;
  isProc: boolean;
}

const FUNCTION_TEMPLATE = `CREATE OR REPLACE FUNCTION my_function()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- function body here
END;
$$;`;

export default function FunctionsPage() {
  const params = useParams<{ id: string }>();
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FunctionInfo | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sql, setSql] = useState(FUNCTION_TEMPLATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dropping, setDropping] = useState<FunctionInfo | null>(null);
  const [dropLoading, setDropLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/databases/${params.id}/functions`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setFunctions(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.id]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    const res = await fetch(`/api/databases/${params.id}/functions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });
    const d = await res.json();
    setCreating(false);
    if (d.success) {
      setShowCreate(false);
      setSql(FUNCTION_TEMPLATE);
      load();
    } else {
      setCreateError(d.error);
    }
  };

  const handleDrop = async () => {
    if (!dropping) return;
    setDropLoading(true);
    await fetch(`/api/databases/${params.id}/functions/${encodeURIComponent(dropping.name)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ argTypes: dropping.argumentTypes }),
    });
    setDropLoading(false);
    setDropping(null);
    if (selected?.name === dropping.name) setSelected(null);
    load();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel */}
      <div className="w-72 border-r border-[#2e2e2e] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2e2e2e] flex items-center justify-between">
          <span className="text-xs font-medium text-[#888]">Functions</span>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80"
          >
            <Plus size={11} /> New
          </button>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-[#555]">Loading…</p>
          </div>
        ) : functions.length === 0 ? (
          <EmptyState
            icon={Code2}
            title="No functions"
            description="Create your first function using the SQL editor."
            action={{ label: "New function", onClick: () => setShowCreate(true) }}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {functions.map((fn) => (
              <div
                key={`${fn.name}(${fn.argumentTypes})`}
                className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer border-b border-[#1e1e1e] hover:bg-[#1a1a1a] ${selected?.name === fn.name ? "bg-[#1e1e1e]" : ""}`}
                onClick={() => setSelected(fn)}
              >
                <div className="min-w-0">
                  <p className="text-xs text-[#ccc] truncate">{fn.name}</p>
                  <p className="text-[10px] text-[#555] truncate">{fn.language} · {fn.returnType}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDropping(fn); }}
                  className="hidden group-hover:flex p-1 text-[#555] hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selected ? (
          <>
            <div className="px-6 py-3 border-b border-[#2e2e2e]">
              <p className="text-sm font-medium text-[#ededed]">{selected.name}</p>
              <p className="text-xs text-[#555]">{selected.argumentTypes || "no arguments"} → {selected.returnType}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-xs text-[#ccc] bg-[#141414] rounded border border-[#2e2e2e] p-4 whitespace-pre-wrap font-mono">
                {selected.definition}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-[#444]">Select a function to view its definition</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg w-full max-w-2xl mx-4 shadow-xl flex flex-col" style={{ maxHeight: "80vh" }}>
            <div className="px-5 py-4 border-b border-[#2e2e2e] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#ededed]">Create function</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#555] hover:text-[#888] text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                className="w-full h-64 bg-[#141414] border border-[#2e2e2e] rounded p-3 text-xs font-mono text-[#ccc] resize-none focus:outline-none focus:border-[#444]"
              />
              {createError && <p className="mt-2 text-xs text-red-400">{createError}</p>}
            </div>
            <div className="px-5 py-3 border-t border-[#2e2e2e] flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-xs text-[#888] border border-[#2e2e2e] hover:border-[#444]">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="px-3 py-1.5 rounded text-xs font-medium bg-brand text-black hover:bg-brand/90 disabled:opacity-50">
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDropModal
        isOpen={!!dropping}
        title={`Drop function "${dropping?.name}"?`}
        description="This will permanently remove the function. This action cannot be undone."
        onConfirm={handleDrop}
        onCancel={() => setDropping(null)}
        loading={dropLoading}
      />
    </div>
  );
}
