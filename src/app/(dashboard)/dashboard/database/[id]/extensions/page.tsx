"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Puzzle } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";

interface ExtensionInfo {
  name: string;
  defaultVersion: string | null;
  installedVersion: string | null;
  isInstalled: boolean;
  comment: string | null;
}

export default function ExtensionsPage() {
  const params = useParams<{ id: string }>();
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/databases/${params.id}/extensions`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setExtensions(d.data.extensions);
          setCanManage(d.data.canManageExtensions);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.id]);

  const handleToggle = async (name: string, installed: boolean) => {
    setToggling(name);
    await fetch(`/api/databases/${params.id}/extensions/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: installed ? "disable" : "enable" }),
    });
    setToggling(null);
    load();
  };

  const filtered = extensions.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.comment ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-[#2e2e2e] flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-[#888]">Extensions</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search extensions…"
          className="bg-[#141414] border border-[#2e2e2e] rounded px-3 py-1.5 text-xs text-[#ccc] w-56 focus:outline-none focus:border-[#444]"
        />
      </div>

      {!canManage && !loading && (
        <div className="mx-6 mt-4 p-3 bg-[#141a14] border border-[#2e3e2e] rounded text-xs text-[#6a9a6a]">
          Read-only view. The database role does not have extension management privileges.
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><p className="text-xs text-[#555]">Loading…</p></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Puzzle} title="No extensions found" />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0e0e0e] border-b border-[#2e2e2e]">
              <tr>
                <th className="text-left px-6 py-2.5 text-[#555] font-normal">Extension</th>
                <th className="text-left px-4 py-2.5 text-[#555] font-normal">Version</th>
                <th className="text-left px-4 py-2.5 text-[#555] font-normal">Installed</th>
                <th className="text-left px-4 py-2.5 text-[#555] font-normal">Description</th>
                {canManage && <th className="w-24 px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ext) => (
                <tr key={ext.name} className="border-b border-[#1a1a1a] hover:bg-[#141414]">
                  <td className="px-6 py-2.5 text-[#ccc] font-medium">{ext.name}</td>
                  <td className="px-4 py-2.5 text-[#888]">{ext.installedVersion ?? ext.defaultVersion ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${ext.isInstalled ? "bg-green-500" : "bg-[#333]"}`} />
                    <span className="text-[#888]">{ext.isInstalled ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#666] max-w-xs truncate">{ext.comment ?? "—"}</td>
                  {canManage && (
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleToggle(ext.name, ext.isInstalled)}
                        disabled={toggling === ext.name}
                        className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50 ${
                          ext.isInstalled
                            ? "border border-[#2e2e2e] text-[#888] hover:text-red-400 hover:border-red-900"
                            : "bg-brand text-black hover:bg-brand/90"
                        }`}
                      >
                        {toggling === ext.name ? "…" : ext.isInstalled ? "Disable" : "Enable"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
