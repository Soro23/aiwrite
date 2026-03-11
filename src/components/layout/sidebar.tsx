"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users2,
  HardDrive,
  Database,
  Key,
  LogOut,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

interface SidebarUser {
  name: string;
  email: string;
  role: string;
}

interface SidebarProps {
  user: SidebarUser;
}

const mainNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home", exact: true },
  { href: "/dashboard/api-keys", icon: Key, label: "API Keys", exact: false },
  { href: "/dashboard/storage", icon: HardDrive, label: "Storage", exact: false },
  { href: "/dashboard/database", icon: Database, label: "Database", exact: false },
];

const adminNavItems = [
  { href: "/dashboard/users", icon: Users2, label: "Users", exact: false },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "ADMIN";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isSettingsActive = pathname.startsWith("/dashboard/settings");

  return (
    <aside className="w-64 h-screen bg-[#1c1c1c] border-r border-[#2e2e2e] flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-4 py-[14px] border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand rounded flex items-center justify-center">
            <span className="text-xs font-bold text-black">A</span>
          </div>
          <span className="text-sm font-semibold text-[#ededed]">aiwrite</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto flex flex-col">
        <div className="space-y-0.5 flex-1">
          {mainNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-[#2a2a2a] text-[#ededed]"
                    : "text-[#a0a0a0] hover:bg-[#242424] hover:text-[#ededed]"
                )}
              >
                <item.icon size={15} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Admin section — pinned to bottom of nav, above user strip */}
        {isAdmin && (
          <div className="space-y-0.5 pt-2 border-t border-[#2e2e2e] mt-2">
            {adminNavItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-[#2a2a2a] text-[#ededed]"
                      : "text-[#a0a0a0] hover:bg-[#242424] hover:text-[#ededed]"
                  )}
                >
                  <item.icon size={15} strokeWidth={1.8} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-[#2e2e2e] p-3 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors group",
            isSettingsActive ? "bg-[#2a2a2a]" : "hover:bg-[#242424]"
          )}
        >
          <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-brand">
              {getInitials(user.name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-medium truncate", isSettingsActive ? "text-[#ededed]" : "text-[#ededed]")}>
              {user.name}
            </p>
            <p className="text-[11px] text-[#666] truncate">{user.email}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#a0a0a0] hover:bg-[#242424] hover:text-[#ededed] transition-colors"
        >
          <LogOut size={15} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
