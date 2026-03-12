"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Play, ChevronDown } from "lucide-react";

type SqlResult =
  | { type: "rows"; columns: string[]; rows: Record<string, unknown>[]; statement: string }
  | { type: "affected"; count: number; statement: string };

const EXAMPLE_QUERIES = [
  { label: "Create table", sql: "CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT UNIQUE NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);" },
  { label: "Insert row", sql: "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');" },
  { label: "Select all", sql: "SELECT * FROM users;" },
  { label: "List tables", sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema();" },
];

export default function SqlEditorPage() {
  const params = useParams<{ id: string }>();
  const [sql, setSql] = useState("-- Write your SQL here\nSELECT 1;");
  const [results, setResults] = useState<SqlResult[] | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    setRunning(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch(`/api/databases/${params.id}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sql.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error ?? "Query failed");
      }
    } catch {
      setError("Failed to execute query");
    } finally {
      setRunning(false);
    }
  }, [sql, params.id]);

  // Ctrl+Enter / Cmd+Enter shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runQuery();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runQuery]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-[#2e2e2e] px-4 py-2 flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] hover:text-[#ededed] transition-colors"
          >
            Examples <ChevronDown size={12} />
          </button>
          {showExamples && (
            <div className="absolute top-full left-0 mt-1 bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg shadow-lg z-10 min-w-[160px]">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q.label}
                  onClick={() => { setSql(q.sql); setShowExamples(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-[#a0a0a0] hover:bg-[#242424] hover:text-[#ededed] transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={runQuery}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand hover:bg-brand-hover disabled:opacity-50 text-black font-medium rounded-md transition-colors"
        >
          <Play size={12} />
          {running ? "Running..." : "Run"} <span className="text-[10px] opacity-60 ml-1">⌘↵</span>
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full p-4 bg-[#111] text-[#ededed] font-mono text-sm resize-none focus:outline-none border-b border-[#2e2e2e] min-h-[200px]"
          style={{ tabSize: 2 }}
          placeholder="SELECT * FROM your_table;"
        />

        {/* Results */}
        <div className="flex-1 overflow-auto min-h-[150px]">
          {error && (
            <div className="p-4">
              <div className="px-3 py-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono whitespace-pre-wrap">
                {error}
              </div>
            </div>
          )}

          {results && results.map((result, idx) => (
            <div key={idx} className="p-4 border-b border-[#2e2e2e] last:border-b-0">
              {results.length > 1 && (
                <p className="text-[11px] text-[#555] font-mono mb-2 truncate">
                  {idx + 1}. {result.statement}
                </p>
              )}

              {result.type === "affected" && (
                <p className="text-xs text-[#a0a0a0]">
                  {result.count > 0 ? `${result.count} row${result.count !== 1 ? "s" : ""} affected` : "Query executed successfully."}
                </p>
              )}

              {result.type === "rows" && (
                <>
                  <p className="text-xs text-[#666] mb-3">
                    {result.rows.length} row{result.rows.length !== 1 ? "s" : ""}
                    {result.rows.length === 1000 && " (limit reached)"}
                  </p>
                  {result.rows.length === 0 ? (
                    <p className="text-xs text-[#666]">No results</p>
                  ) : (
                    <div className="overflow-auto">
                      <table className="text-xs border-collapse min-w-full">
                        <thead>
                          <tr className="bg-[#1c1c1c]">
                            {result.columns.map((col) => (
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
                          {result.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-[#1a1a1a] transition-colors">
                              {result.columns.map((col) => {
                                const val = row[col];
                                const display =
                                  val === null ? (
                                    <span className="text-[#555] italic">NULL</span>
                                  ) : (
                                    String(val)
                                  );
                                return (
                                  <td
                                    key={col}
                                    className="px-3 py-1.5 border border-[#2a2a2a] text-[#ededed] max-w-[300px] truncate"
                                    title={val !== null ? String(val) : "NULL"}
                                  >
                                    {display}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {!results && !error && !running && (
            <div className="p-4 text-xs text-[#555]">
              Run a query to see results here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
