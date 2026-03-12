"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Rss, Check, Minus } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";

interface PublicationInfo {
  name: string;
  owner: string;
  allTables: boolean;
  pubinsert: boolean;
  pubupdate: boolean;
  pubdelete: boolean;
  pubtruncate: boolean;
}

function Bool({ value }: { value: boolean }) {
  return value
    ? <Check size={12} className="text-green-500" />
    : <Minus size={12} className="text-[#444]" />;
}

export default function PublicationsPage() {
  const params = useParams<{ id: string }>();
  const [publications, setPublications] = useState<PublicationInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/databases/${params.id}/publications`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPublications(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-[#2e2e2e]">
        <span className="text-xs font-medium text-[#888]">Publications</span>
      </div>

      <div className="mx-6 mt-4 p-3 bg-[#141414] border border-[#2e2e2e] rounded text-xs text-[#666]">
        Publications are PostgreSQL-instance level objects, shown here for reference.
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><p className="text-xs text-[#555]">Loading…</p></div>
      ) : publications.length === 0 ? (
        <EmptyState icon={Rss} title="No publications" description="No logical replication publications found on this instance." />
      ) : (
        <div className="flex-1 overflow-y-auto mt-4">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0e0e0e] border-b border-[#2e2e2e]">
              <tr>
                <th className="text-left px-6 py-2.5 text-[#555] font-normal">Publication</th>
                <th className="text-left px-4 py-2.5 text-[#555] font-normal">Owner</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">All Tables</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">Insert</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">Update</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">Delete</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">Truncate</th>
              </tr>
            </thead>
            <tbody>
              {publications.map((pub) => (
                <tr key={pub.name} className="border-b border-[#1a1a1a] hover:bg-[#141414]">
                  <td className="px-6 py-2.5 text-[#ccc]">{pub.name}</td>
                  <td className="px-4 py-2.5 text-[#888]">{pub.owner}</td>
                  <td className="px-4 py-2.5 text-center"><Bool value={pub.allTables} /></td>
                  <td className="px-4 py-2.5 text-center"><Bool value={pub.pubinsert} /></td>
                  <td className="px-4 py-2.5 text-center"><Bool value={pub.pubupdate} /></td>
                  <td className="px-4 py-2.5 text-center"><Bool value={pub.pubdelete} /></td>
                  <td className="px-4 py-2.5 text-center"><Bool value={pub.pubtruncate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
