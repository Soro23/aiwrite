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
    <aside className="w-64 h-screen bg-background-light dark:bg-background-dark border-r border-slate-200/70 dark:border-primary/10 flex flex-col shrink-0 p-4">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2">
        <div className="bg-primary/20 p-2 rounded-lg">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-background-dark">
            <span className="text-xs font-bold">A</span>
          </div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-slate-900 dark:text-white text-sm font-semibold leading-none">
            aiwrite
          </h1>
          <p className="text-slate-500 dark:text-primary/60 text-xs mt-1">
            Dashboard
          </p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-6 overflow-y-auto flex flex-col">
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-primary/5 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <item.icon size={18} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Admin section — pinned to bottom of nav, above user strip */}
        {isAdmin && (
          <div className="space-y-0.5 pt-4 border-t border-slate-200/70 dark:border-primary/10 mt-4">
            {adminNavItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-primary/5 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <item.icon size={18} strokeWidth={1.8} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200/70 dark:border-primary/10 pt-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
            isSettingsActive ? "bg-primary/10" : "hover:bg-slate-100 dark:hover:bg-primary/5"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-primary">
              {getInitials(user.name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">
              {user.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-primary/5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <LogOut size={18} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
