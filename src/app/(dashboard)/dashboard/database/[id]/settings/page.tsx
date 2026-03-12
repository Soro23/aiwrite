"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";

interface PgSettingInfo {
  name: string;
  setting: string;
  unit: string | null;
  category: string;
  shortDesc: string | null;
  context: string;
  vartype: string;
  source: string;
  minVal: string | null;
  maxVal: string | null;
  enumvals: string[] | null;
}

export default function SettingsPage() {
  const params = useParams<{ id: string }>();
  const [settings, setSettings] = useState<PgSettingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/databases/${params.id}/pg-settings`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setSettings(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtered = search
    ? settings.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.shortDesc ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : settings;

  const grouped = filtered.reduce<Record<string, PgSettingInfo[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-[#2e2e2e] flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-[#888]">PostgreSQL Settings</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings…"
          className="bg-[#141414] border border-[#2e2e2e] rounded px-3 py-1.5 text-xs text-[#ccc] w-56 focus:outline-none focus:border-[#444]"
        />
      </div>

      <div className="mx-6 mt-4 p-3 bg-[#141414] border border-[#2e2e2e] rounded text-xs text-[#666]">
        Read-only view of pg_settings. Changes require superuser access and a server reload.
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><p className="text-xs text-[#555]">Loading…</p></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={SlidersHorizontal} title="No settings found" />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {Object.entries(grouped).map(([category, stgs]) => {
            const isCollapsed = collapsed.has(category);
            return (
              <div key={category} className="border border-[#2e2e2e] rounded overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#141414] hover:bg-[#1a1a1a] transition-colors"
                >
                  <span className="text-xs font-medium text-[#888]">{category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#444]">{stgs.length}</span>
                    {isCollapsed ? <ChevronRight size={12} className="text-[#444]" /> : <ChevronDown size={12} className="text-[#444]" />}
                  </div>
                </button>
                {!isCollapsed && (
                  <table className="w-full text-xs border-t border-[#2e2e2e]">
                    <thead>
                      <tr className="border-b border-[#1e1e1e] bg-[#0e0e0e]">
                        <th className="text-left px-4 py-2 text-[#444] font-normal">Setting</th>
                        <th className="text-left px-4 py-2 text-[#444] font-normal">Value</th>
                        <th className="text-left px-4 py-2 text-[#444] font-normal">Unit</th>
                        <th className="text-left px-4 py-2 text-[#444] font-normal">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stgs.map((s) => (
                        <tr key={s.name} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#141414]">
                          <td className="px-4 py-2 text-[#ccc] font-mono text-[11px]">{s.name}</td>
                          <td className="px-4 py-2 text-[#888] font-mono text-[11px]">{s.setting}</td>
                          <td className="px-4 py-2 text-[#555]">{s.unit ?? "—"}</td>
                          <td className="px-4 py-2 text-[#666] max-w-sm">{s.shortDesc ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
