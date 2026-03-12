"use client";

import { Bell, HelpCircle, Plus, Search } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="h-16 border-b border-slate-200/70 dark:border-primary/10 flex items-center justify-between px-6 lg:px-8 bg-background-light/60 dark:bg-background-dark/60 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="w-full bg-slate-100 dark:bg-primary/5 border border-transparent rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="Search resources, logs, docs..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <button
          type="button"
          className="p-2 text-slate-500 hover:text-primary transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <button
          type="button"
          className="p-2 text-slate-500 hover:text-primary transition-colors"
          aria-label="Help"
        >
          <HelpCircle size={18} />
        </button>
        <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-primary/10 mx-1 lg:mx-2" />
        <button
          type="button"
          className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          <Plus size={14} />
          New Project
        </button>
      </div>
    </header>
  );
}

