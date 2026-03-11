"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload, Trash2, RefreshCw, FileText, X,
  Copy, Check, ExternalLink, FileImage,
  FileSpreadsheet, FileType2,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url?: string;
}

const ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/svg+xml," +
  "application/pdf," +
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  "text/plain";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("pdf")) return FileType2;
  return FileText;
}

function getFileEmoji(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📊";
  return "📁";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded text-[#666] hover:text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors shrink-0"
      title="Copy URL"
    >
      {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
    </button>
  );
}

function FilePreview({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const isImage = file.mimeType.startsWith("image/");
  const Icon = getFileIcon(file.mimeType);

  return (
    <div className="w-80 shrink-0 border-l border-[#2e2e2e] flex flex-col bg-[#1c1c1c]">
      {/* Preview header */}
      <div className="px-4 py-3 border-b border-[#2e2e2e] flex items-center justify-between">
        <span className="text-xs font-medium text-[#a0a0a0]">File details</span>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#666] hover:text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Image preview or icon */}
        <div className="flex items-center justify-center bg-[#222] border border-[#2e2e2e] rounded-lg overflow-hidden h-40">
          {isImage && file.url ? (
            <img
              src={file.url}
              alt={file.filename}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#555]">
              <Icon size={36} strokeWidth={1.2} />
              <span className="text-xs">{file.mimeType}</span>
            </div>
          )}
        </div>

        {/* File info */}
        <div className="space-y-3">
          <div>
            <p className="text-[11px] text-[#666] mb-1">Name</p>
            <p className="text-sm text-[#ededed] break-all font-medium">{file.filename}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-[#666] mb-1">Size</p>
              <p className="text-xs text-[#a0a0a0]">{formatBytes(file.size)}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#666] mb-1">Uploaded</p>
              <p className="text-xs text-[#a0a0a0]">{formatDate(file.createdAt)}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-[#666] mb-1">Type</p>
            <p className="text-xs text-[#a0a0a0] font-mono">{file.mimeType}</p>
          </div>

          <div>
            <p className="text-[11px] text-[#666] mb-1">ID</p>
            <p className="text-[11px] text-[#555] font-mono break-all">{file.id}</p>
          </div>
        </div>

        {/* URL */}
        {file.url && (
          <div>
            <p className="text-[11px] text-[#666] mb-1.5">Direct URL</p>
            <div className="bg-[#222] border border-[#2e2e2e] rounded-md p-2 flex items-start gap-1">
              <p className="text-[11px] text-[#a0a0a0] font-mono break-all flex-1 leading-relaxed">
                {file.url}
              </p>
              <CopyButton text={file.url} />
            </div>
            <div className="flex gap-2 mt-2">
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] hover:text-[#ededed] transition-colors"
              >
                <ExternalLink size={12} />
                Open file
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoragePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.success) {
        setFiles(data.data);
        // Refresh selected file URL if still selected
        if (selectedFile) {
          const updated = data.data.find((f: FileItem) => f.id === selectedFile.id);
          if (updated) setSelectedFile(updated);
        }
      } else {
        setError(data.error ?? "Failed to load files");
      }
    } catch {
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFiles(); }, []);

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
        if (selectedFile?.id === id) setSelectedFile(null);
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between shrink-0">
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
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* File list */}
        <div className="flex-1 overflow-auto p-6">
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden lg:table-cell">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e2e2e]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#666] text-sm">Loading files...</td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={32} className="text-[#333]" />
                        <p className="text-sm text-[#666]">No files uploaded yet</p>
                        <p className="text-xs text-[#555]">Images, PDFs, Word, Excel accepted</p>
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
                    <tr
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`hover:bg-[#222] transition-colors cursor-pointer group ${
                        selectedFile?.id === file.id ? "bg-[#222] border-l-2 border-l-brand" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{getFileEmoji(file.mimeType)}</span>
                          <span className="text-sm text-[#ededed] truncate max-w-[160px]">{file.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-[#a0a0a0]">{formatBytes(file.size)}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-[#a0a0a0]">{formatDate(file.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
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

        {/* Preview panel */}
        {selectedFile && (
          <FilePreview
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        )}
      </div>
    </div>
  );
}
