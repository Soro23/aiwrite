"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Zap, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";
import { ConfirmDropModal } from "@/components/database/ConfirmDropModal";

interface TriggerInfo {
  name: string;
  tableName: string;
  timing: string;
  events: string[];
  definition: string;
}

const TRIGGER_TEMPLATE = `CREATE OR REPLACE TRIGGER my_trigger
BEFORE INSERT ON my_table
FOR EACH ROW
EXECUTE FUNCTION my_function();`;

export default function TriggersPage() {
  const params = useParams<{ id: string }>();
  const [triggers, setTriggers] = useState<TriggerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sql, setSql] = useState(TRIGGER_TEMPLATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dropping, setDropping] = useState<TriggerInfo | null>(null);
  const [dropLoading, setDropLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/databases/${params.id}/triggers`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTriggers(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.id]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    const res = await fetch(`/api/databases/${params.id}/triggers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });
    const d = await res.json();
    setCreating(false);
    if (d.success) { setShowCreate(false); setSql(TRIGGER_TEMPLATE); load(); }
    else setCreateError(d.error);
  };

  const handleDrop = async () => {
    if (!dropping) return;
    setDropLoading(true);
    await fetch(`/api/databases/${params.id}/triggers/${encodeURIComponent(dropping.name)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableName: dropping.tableName }),
    });
    setDropLoading(false);
    setDropping(null);
    load();
  };

  // Group by table
  const grouped = triggers.reduce<Record<string, TriggerInfo[]>>((acc, t) => {
    if (!acc[t.tableName]) acc[t.tableName] = [];
    acc[t.tableName].push(t);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-[#2e2e2e] flex items-center justify-between">
        <span className="text-xs font-medium text-[#888]">Triggers</span>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80"
        >
          <Plus size={11} /> New trigger
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[#555]">Loading…</p>
        </div>
      ) : triggers.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No triggers"
          description="Create triggers to automatically execute functions on table events."
          action={{ label: "New trigger", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {Object.entries(grouped).map(([table, tgrs]) => (
            <div key={table} className="mb-6">
              <h3 className="text-xs font-medium text-[#666] mb-2">{table}</h3>
              <div className="border border-[#2e2e2e] rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2e2e2e] bg-[#141414]">
                      <th className="text-left px-4 py-2 text-[#555] font-normal">Trigger</th>
                      <th className="text-left px-4 py-2 text-[#555] font-normal">Timing</th>
                      <th className="text-left px-4 py-2 text-[#555] font-normal">Events</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {tgrs.map((t) => (
                      <tr key={t.name} className="border-b border-[#1e1e1e] last:border-0 hover:bg-[#141414]">
                        <td className="px-4 py-2.5 text-[#ccc]">{t.name}</td>
                        <td className="px-4 py-2.5 text-[#888]">{t.timing}</td>
                        <td className="px-4 py-2.5 text-[#888]">{t.events.join(", ")}</td>
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => setDropping(t)}
                            className="p-1 text-[#444] hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg w-full max-w-2xl mx-4 shadow-xl flex flex-col" style={{ maxHeight: "80vh" }}>
            <div className="px-5 py-4 border-b border-[#2e2e2e] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#ededed]">Create trigger</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#555] hover:text-[#888] text-lg">×</button>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                className="w-full h-48 bg-[#141414] border border-[#2e2e2e] rounded p-3 text-xs font-mono text-[#ccc] resize-none focus:outline-none focus:border-[#444]"
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
        title={`Drop trigger "${dropping?.name}"?`}
        description={`This will remove the trigger from table "${dropping?.tableName}".`}
        onConfirm={handleDrop}
        onCancel={() => setDropping(null)}
        loading={dropLoading}
      />
    </div>
  );
}
