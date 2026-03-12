"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SortAsc, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";
import { ConfirmDropModal } from "@/components/database/ConfirmDropModal";

interface IndexInfo {
  name: string;
  tableName: string;
  indexType: string;
  isUnique: boolean;
  isPrimary: boolean;
  definition: string;
  columns: string[];
}

interface TableInfo { name: string }
interface ColumnInfo { name: string }

const INDEX_TYPES = ["btree", "hash", "gin", "gist", "brin", "spgist"];

export default function IndexesPage() {
  const params = useParams<{ id: string }>();
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    tableName: "",
    indexName: "",
    columns: [] as string[],
    indexType: "btree",
    unique: false,
  });
  const [tableColumns, setTableColumns] = useState<ColumnInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dropping, setDropping] = useState<IndexInfo | null>(null);
  const [dropLoading, setDropLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/databases/${params.id}/indexes`).then((r) => r.json()),
      fetch(`/api/databases/${params.id}/tables`).then((r) => r.json()),
    ]).then(([idxData, tblData]) => {
      if (idxData.success) setIndexes(idxData.data);
      if (tblData.success) setTables(tblData.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.id]);

  const loadColumns = (tableName: string) => {
    if (!tableName) { setTableColumns([]); return; }
    fetch(`/api/databases/${params.id}/tables/${tableName}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTableColumns(d.data.columns ?? []); });
  };

  const handleTableChange = (tableName: string) => {
    setForm((f) => ({ ...f, tableName, columns: [] }));
    loadColumns(tableName);
  };

  const toggleColumn = (col: string) => {
    setForm((f) => ({
      ...f,
      columns: f.columns.includes(col) ? f.columns.filter((c) => c !== col) : [...f.columns, col],
    }));
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    const res = await fetch(`/api/databases/${params.id}/indexes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setCreating(false);
    if (d.success) {
      setShowCreate(false);
      setForm({ tableName: "", indexName: "", columns: [], indexType: "btree", unique: false });
      load();
    } else setCreateError(d.error);
  };

  const handleDrop = async () => {
    if (!dropping) return;
    setDropLoading(true);
    await fetch(`/api/databases/${params.id}/indexes/${encodeURIComponent(dropping.name)}`, { method: "DELETE" });
    setDropLoading(false);
    setDropping(null);
    load();
  };

  const grouped = indexes.reduce<Record<string, IndexInfo[]>>((acc, idx) => {
    if (!acc[idx.tableName]) acc[idx.tableName] = [];
    acc[idx.tableName].push(idx);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-[#2e2e2e] flex items-center justify-between">
        <span className="text-xs font-medium text-[#888]">Indexes</span>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80">
          <Plus size={11} /> New index
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><p className="text-xs text-[#555]">Loading…</p></div>
      ) : indexes.length === 0 ? (
        <EmptyState
          icon={SortAsc}
          title="No indexes"
          description="Create indexes to speed up queries on your tables."
          action={{ label: "New index", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {Object.entries(grouped).map(([table, idxs]) => (
            <div key={table} className="mb-6">
              <h3 className="text-xs font-medium text-[#666] mb-2">{table}</h3>
              <div className="border border-[#2e2e2e] rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2e2e2e] bg-[#141414]">
                      <th className="text-left px-4 py-2 text-[#555] font-normal">Index</th>
                      <th className="text-left px-4 py-2 text-[#555] font-normal">Type</th>
                      <th className="text-left px-4 py-2 text-[#555] font-normal">Columns</th>
                      <th className="text-left px-4 py-2 text-[#555] font-normal">Unique</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {idxs.map((idx) => (
                      <tr key={idx.name} className="border-b border-[#1e1e1e] last:border-0 hover:bg-[#141414]">
                        <td className="px-4 py-2.5 text-[#ccc]">
                          {idx.name}
                          {idx.isPrimary && <span className="ml-1.5 text-[10px] text-brand">PK</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[#888] uppercase text-[10px]">{idx.indexType}</td>
                        <td className="px-4 py-2.5 text-[#888]">{idx.columns.join(", ")}</td>
                        <td className="px-4 py-2.5 text-[#888]">{idx.isUnique ? "Yes" : "—"}</td>
                        <td className="px-2 py-2.5">
                          {!idx.isPrimary && (
                            <button onClick={() => setDropping(idx)} className="p-1 text-[#444] hover:text-red-400">
                              <Trash2 size={12} />
                            </button>
                          )}
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
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg w-full max-w-lg mx-4 shadow-xl">
            <div className="px-5 py-4 border-b border-[#2e2e2e] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#ededed]">Create index</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#555] hover:text-[#888]"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] mb-1">Table</label>
                  <select
                    value={form.tableName}
                    onChange={(e) => handleTableChange(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2e2e2e] rounded px-3 py-2 text-xs text-[#ccc] focus:outline-none focus:border-[#444]"
                  >
                    <option value="">Select table…</option>
                    {tables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1">Index name</label>
                  <input
                    value={form.indexName}
                    onChange={(e) => setForm((f) => ({ ...f, indexName: e.target.value }))}
                    placeholder="idx_table_column"
                    className="w-full bg-[#141414] border border-[#2e2e2e] rounded px-3 py-2 text-xs text-[#ccc] focus:outline-none focus:border-[#444]"
                  />
                </div>
              </div>

              {tableColumns.length > 0 && (
                <div>
                  <label className="block text-xs text-[#888] mb-1">Columns</label>
                  <div className="flex flex-wrap gap-1.5">
                    {tableColumns.map((col) => (
                      <button
                        key={col.name}
                        onClick={() => toggleColumn(col.name)}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                          form.columns.includes(col.name)
                            ? "bg-brand text-black border-brand"
                            : "bg-[#141414] text-[#888] border-[#2e2e2e] hover:border-[#444]"
                        }`}
                      >
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] mb-1">Index type</label>
                  <select
                    value={form.indexType}
                    onChange={(e) => setForm((f) => ({ ...f, indexType: e.target.value }))}
                    className="w-full bg-[#141414] border border-[#2e2e2e] rounded px-3 py-2 text-xs text-[#ccc] focus:outline-none focus:border-[#444]"
                  >
                    {INDEX_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs text-[#888] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.unique}
                      onChange={(e) => setForm((f) => ({ ...f, unique: e.target.checked }))}
                      className="accent-brand"
                    />
                    Unique
                  </label>
                </div>
              </div>

              {createError && <p className="text-xs text-red-400">{createError}</p>}
            </div>
            <div className="px-5 py-3 border-t border-[#2e2e2e] flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-xs text-[#888] border border-[#2e2e2e] hover:border-[#444]">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.tableName || !form.indexName || form.columns.length === 0}
                className="px-3 py-1.5 rounded text-xs font-medium bg-brand text-black hover:bg-brand/90 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDropModal
        isOpen={!!dropping}
        title={`Drop index "${dropping?.name}"?`}
        description="This will remove the index. Queries may slow down. This cannot be undone."
        onConfirm={handleDrop}
        onCancel={() => setDropping(null)}
        loading={dropLoading}
      />
    </div>
  );
}
