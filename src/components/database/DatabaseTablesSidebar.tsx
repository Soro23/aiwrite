"use client";

import { useEffect, useState } from "react";
import { Table2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableInfo {
  name: string;
  rowCountEstimate: number;
}

interface Props {
  databaseId: string;
  selectedTable?: string;
  onSelectTable?: (name: string) => void;
  refreshTrigger?: number;
}

export function DatabaseTablesSidebar({
  databaseId,
  selectedTable,
  onSelectTable,
  refreshTrigger = 0,
}: Props) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTables() {
    setLoading(true);
    try {
      const res = await fetch(`/api/databases/${databaseId}/tables`);
      const data = await res.json();
      if (data.success) setTables(data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, refreshTrigger]);

  return (
    <div className="w-56 border-r border-[#2e2e2e] flex flex-col shrink-0">
      <div className="px-3 py-2.5 border-b border-[#2e2e2e] flex items-center justify-between">
        <span className="text-xs text-[#666] font-medium uppercase tracking-wide">Tables</span>
        <button
          onClick={loadTables}
          className="p-1 text-[#666] hover:text-[#a0a0a0] transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="px-3 py-2 text-xs text-[#555]">Loading...</div>
        ) : tables.length === 0 ? (
          <div className="px-3 py-3 text-xs text-[#555]">
            No tables yet. Use the SQL Editor to create tables.
          </div>
        ) : (
          tables.map((t) => (
            <button
              key={t.name}
              onClick={() => onSelectTable?.(t.name)}
              className={cn(
                "w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors",
                selectedTable === t.name
                  ? "bg-[#2a2a2a] text-[#ededed]"
                  : "text-[#a0a0a0] hover:bg-[#242424] hover:text-[#ededed]",
                !onSelectTable && "cursor-default"
              )}
            >
              <Table2 size={12} className="shrink-0" />
              <span className="truncate">{t.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
