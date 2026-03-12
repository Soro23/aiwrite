"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Users, Check, Minus } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";

interface RoleInfo {
  name: string;
  isSuperuser: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  canLogin: boolean;
  connectionLimit: number;
  validUntil: string | null;
  memberOf: string[];
}

function Bool({ value }: { value: boolean }) {
  return value
    ? <Check size={12} className="text-green-500" />
    : <Minus size={12} className="text-[#444]" />;
}

export default function RolesPage() {
  const params = useParams<{ id: string }>();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/databases/${params.id}/roles`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRoles(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-[#2e2e2e]">
        <span className="text-xs font-medium text-[#888]">Roles</span>
      </div>

      <div className="mx-6 mt-4 p-3 bg-[#141414] border border-[#2e2e2e] rounded text-xs text-[#666]">
        Roles are PostgreSQL-instance level objects, shown here for reference.
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><p className="text-xs text-[#555]">Loading…</p></div>
      ) : roles.length === 0 ? (
        <EmptyState icon={Users} title="No roles found" />
      ) : (
        <div className="flex-1 overflow-y-auto mt-4">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0e0e0e] border-b border-[#2e2e2e]">
              <tr>
                <th className="text-left px-6 py-2.5 text-[#555] font-normal">Role</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">Login</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">Superuser</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">Create DB</th>
                <th className="px-4 py-2.5 text-[#555] font-normal text-center">Create Role</th>
                <th className="text-left px-4 py-2.5 text-[#555] font-normal">Conn Limit</th>
                <th className="text-left px-4 py-2.5 text-[#555] font-normal">Expires</th>
                <th className="text-left px-4 py-2.5 text-[#555] font-normal">Member of</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.name} className="border-b border-[#1a1a1a] hover:bg-[#141414]">
                  <td className="px-6 py-2.5 text-[#ccc] font-medium">{role.name}</td>
                  <td className="px-4 py-2.5 text-center"><Bool value={role.canLogin} /></td>
                  <td className="px-4 py-2.5 text-center"><Bool value={role.isSuperuser} /></td>
                  <td className="px-4 py-2.5 text-center"><Bool value={role.canCreateDb} /></td>
                  <td className="px-4 py-2.5 text-center"><Bool value={role.canCreateRole} /></td>
                  <td className="px-4 py-2.5 text-[#888]">{role.connectionLimit === -1 ? "∞" : role.connectionLimit}</td>
                  <td className="px-4 py-2.5 text-[#888]">{role.validUntil ? new Date(role.validUntil).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-2.5 text-[#888]">{role.memberOf.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
