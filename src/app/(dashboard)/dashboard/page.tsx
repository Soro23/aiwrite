"use client";

import { useEffect, useState } from "react";
import { Users2, HardDrive, FileText, CheckCircle2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface Stats {
  users: number;
  files: number;
  storageUsed: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[#a0a0a0]">{label}</span>
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={16} style={{ color }} strokeWidth={1.8} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-[#ededed]">{value}</p>
      {sub && <p className="text-xs text-[#666] mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="border-b border-[#2e2e2e] px-6 py-4">
        <h1 className="text-sm font-medium text-[#ededed]">Home</h1>
        <p className="text-xs text-[#666] mt-0.5">Overview of your project</p>
      </div>

      <div className="p-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Users2}
            label="Total Users"
            value={loading ? "—" : (stats?.users ?? 0)}
            sub="Registered accounts"
            color="#3ecf8e"
          />
          <StatCard
            icon={FileText}
            label="Total Files"
            value={loading ? "—" : (stats?.files ?? 0)}
            sub="Stored in MinIO"
            color="#60a5fa"
          />
          <StatCard
            icon={HardDrive}
            label="Storage Used"
            value={loading ? "—" : formatBytes(stats?.storageUsed ?? 0)}
            sub="Across all users"
            color="#a78bfa"
          />
          <StatCard
            icon={CheckCircle2}
            label="Status"
            value="Healthy"
            sub="All services running"
            color="#3ecf8e"
          />
        </div>

        {/* Info banner */}
        <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-5">
          <h2 className="text-sm font-medium text-[#ededed] mb-1">Getting started</h2>
          <p className="text-sm text-[#a0a0a0]">
            Use the sidebar to manage users, upload and browse files in storage,
            or configure settings.
          </p>
        </div>
      </div>
    </div>
  );
}
