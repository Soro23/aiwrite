"use client";

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDropModal({
  isOpen,
  title,
  description,
  confirmLabel = "Drop",
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <h2 className="text-sm font-semibold text-[#ededed] mb-2">{title}</h2>
        <p className="text-xs text-[#888] mb-6">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs text-[#888] border border-[#2e2e2e] hover:border-[#444] hover:text-[#ccc] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {loading ? "Dropping…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
