"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ArrowLeft, Terminal, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DatabaseDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const [dbName, setDbName] = useState<string>("");

  useEffect(() => {
    fetch(`/api/databases/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setDbName(d.data.name); });
  }, [params.id]);

  const tabs = [
    { href: `/dashboard/database/${params.id}/sql`, icon: Terminal, label: "SQL Editor" },
    { href: `/dashboard/database/${params.id}/tables`, icon: Table2, label: "Table Editor" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#2e2e2e] px-6 py-3 flex items-center gap-4">
        <Link
          href="/dashboard/database"
          className="text-[#666] hover:text-[#a0a0a0] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-[#ededed]">{dbName || "Database"}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#2e2e2e] px-6 flex gap-1">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors",
                isActive
                  ? "border-brand text-[#ededed]"
                  : "border-transparent text-[#666] hover:text-[#a0a0a0]"
              )}
            >
              <tab.icon size={13} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}
