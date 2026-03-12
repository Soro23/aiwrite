"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Table2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { DatabaseTablesSidebar } from "@/components/database/DatabaseTablesSidebar";

interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  ordinalPosition: number;
}

interface TableData {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

export default function TableEditorPage() {
  const params = useParams<{ id: string }>();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  async function loadTableData(table: string, p = 1) {
    setDataLoading(true);
    try {
      const res = await fetch(
        `/api/databases/${params.id}/tables/${table}?page=${p}&limit=${limit}`
      );
      const data = await res.json();
      if (data.success) {
        setTableData(data.data);
        setPage(p);
      }
    } finally {
      setDataLoading(false);
    }
  }

  function selectTable(name: string) {
    setSelectedTable(name);
    setTableData(null);
    loadTableData(name, 1);
  }

  const totalPages = tableData ? Math.ceil(tableData.total / limit) : 0;
  const columns = tableData?.columns.map((c) => c.name) ?? [];

  return (
    <div className="flex-1 flex overflow-hidden">
      <DatabaseTablesSidebar
        databaseId={params.id}
        selectedTable={selectedTable ?? undefined}
        onSelectTable={selectTable}
      />

      {/* Table data */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedTable ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#555]">
            Select a table to view its data
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="border-b border-[#2e2e2e] px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table2 size={14} className="text-[#666]" />
                <span className="text-sm font-medium text-[#ededed]">{selectedTable}</span>
                {tableData && (
                  <span className="text-xs text-[#666]">
                    {tableData.total} row{tableData.total !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => loadTableData(selectedTable, page)}
                disabled={dataLoading}
                className="p-1.5 text-[#666] hover:text-[#a0a0a0] transition-colors"
              >
                <RefreshCw size={13} className={dataLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Columns info */}
            {tableData && (
              <div className="border-b border-[#2e2e2e] px-4 py-2 flex gap-2 overflow-x-auto">
                {tableData.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#222] border border-[#2e2e2e] rounded text-[11px] whitespace-nowrap"
                  >
                    <span className="text-[#ededed]">{col.name}</span>
                    <span className="text-[#555]">{col.dataType}</span>
                    {!col.isNullable && <span className="text-brand text-[10px]">NOT NULL</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Data */}
            <div className="flex-1 overflow-auto">
              {dataLoading ? (
                <div className="p-4 text-sm text-[#555]">Loading...</div>
              ) : tableData && tableData.rows.length === 0 ? (
                <div className="p-4 text-sm text-[#555]">No rows in this table</div>
              ) : tableData ? (
                <table className="text-xs border-collapse w-full min-w-full">
                  <thead className="sticky top-0">
                    <tr className="bg-[#1c1c1c]">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left text-[#a0a0a0] font-medium border border-[#2e2e2e] whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-[#1a1a1a] transition-colors">
                        {columns.map((col) => {
                          const val = row[col];
                          return (
                            <td
                              key={col}
                              className="px-3 py-1.5 border border-[#2a2a2a] text-[#ededed] max-w-[200px] truncate"
                              title={val !== null ? String(val) : "NULL"}
                            >
                              {val === null ? (
                                <span className="text-[#555] italic">NULL</span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>

            {/* Pagination */}
            {tableData && totalPages > 1 && (
              <div className="border-t border-[#2e2e2e] px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-[#666]">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadTableData(selectedTable, page - 1)}
                    disabled={page <= 1 || dataLoading}
                    className="p-1 text-[#666] hover:text-[#a0a0a0] disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => loadTableData(selectedTable, page + 1)}
                    disabled={page >= totalPages || dataLoading}
                    className="p-1 text-[#666] hover:text-[#a0a0a0] disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
