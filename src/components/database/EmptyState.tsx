"use client";

import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-[#444]">
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-[#888]">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-[#555]">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-1.5 rounded text-xs font-medium bg-brand text-black hover:bg-brand/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
