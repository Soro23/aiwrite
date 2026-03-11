"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, RefreshCw, FileText } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function getMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("zip") || mimeType.includes("tar")) return "🗜️";
  return "📁";
}

export default function StoragePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.success) setFiles(data.data);
      else setError(data.error ?? "Failed to load files");
    } catch {
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/files", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        await loadFiles();
      } else {
        setError(data.error ?? "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      } else {
        setError(data.error ?? "Delete failed");
      }
    } catch {
      setError("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-[#ededed]">Storage</h1>
          <p className="text-xs text-[#666] mt-0.5">
            {loading
              ? "Loading..."
              : `${files.length} file${files.length !== 1 ? "s" : ""} · ${formatBytes(totalSize)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadFiles}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] hover:text-[#ededed] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand hover:bg-brand-hover text-black font-medium rounded-md transition-colors disabled:opacity-50"
          >
            <Upload size={13} />
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e2e]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden sm:table-cell">Size</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden lg:table-cell">Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e2e2e]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#666] text-sm">Loading files...</td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={32} className="text-[#333]" />
                      <p className="text-sm text-[#666]">No files uploaded yet</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-brand hover:underline mt-1"
                      >
                        Upload your first file
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className="hover:bg-[#222] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{getMimeIcon(file.mimeType)}</span>
                        <span className="text-sm text-[#ededed] truncate max-w-[200px]">{file.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-[#a0a0a0]">{formatBytes(file.size)}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-[#666] font-mono">{file.mimeType}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-[#a0a0a0]">{formatDate(file.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Delete file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
