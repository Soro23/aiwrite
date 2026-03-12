"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  ArrowLeft, Terminal, Table2, GitBranch,
  Code2, Zap, ListOrdered, SortAsc, ShieldCheck,
  Puzzle, Rss, Users, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

export default function DatabaseDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const [dbName, setDbName] = useState<string>("");

  useEffect(() => {
    fetch(`/api/databases/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setDbName(d.data.name); });
  }, [params.id]);

  const navGroups: NavGroup[] = [
    {
      items: [
        { href: "sql",    icon: Terminal,  label: "SQL Editor" },
        { href: "tables", icon: Table2,    label: "Tables"     },
        { href: "schema", icon: GitBranch, label: "Schema"     },
      ],
    },
    {
      label: "Objects",
      items: [
        { href: "functions",  icon: Code2,        label: "Functions"     },
        { href: "triggers",   icon: Zap,          label: "Triggers"      },
        { href: "enums",      icon: ListOrdered,  label: "Enumerations"  },
        { href: "indexes",    icon: SortAsc,      label: "Indexes"       },
        { href: "policies",   icon: ShieldCheck,  label: "Policies"      },
      ],
    },
    {
      label: "Instance",
      items: [
        { href: "extensions",   icon: Puzzle,            label: "Extensions"   },
        { href: "publications", icon: Rss,               label: "Publications" },
        { href: "roles",        icon: Users,             label: "Roles"        },
        { href: "settings",     icon: SlidersHorizontal, label: "Settings"     },
      ],
    },
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

      {/* Body: sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-48 border-r border-[#2e2e2e] shrink-0 flex flex-col py-2 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="px-3 pt-4 pb-1 text-[10px] text-[#444] uppercase tracking-widest">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const fullHref = `/dashboard/database/${params.id}/${item.href}`;
                const isActive = pathname === fullHref;
                return (
                  <Link
                    key={item.href}
                    href={fullHref}
                    className={cn(
                      "flex items-center gap-2 mx-1 px-2 py-1.5 rounded text-xs transition-colors",
                      isActive
                        ? "bg-[#242424] text-[#ededed]"
                        : "text-[#666] hover:bg-[#1c1c1c] hover:text-[#a0a0a0]"
                    )}
                  >
                    <item.icon size={13} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
