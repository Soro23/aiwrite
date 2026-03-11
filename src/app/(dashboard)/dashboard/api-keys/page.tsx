"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, RefreshCw, Key, Copy, Check, Eye, EyeOff, X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface NewKeyResult extends ApiKey {
  key: string;
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
      title="Copy key"
    >
      {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
    </button>
  );
}

function NewKeyBanner({ result, onDismiss }: { result: NewKeyResult; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-6 bg-brand/10 border border-brand/30 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium text-brand">Key created — save it now</p>
          <p className="text-xs text-[#a0a0a0] mt-0.5">
            This is the only time you&apos;ll see the full key. It cannot be recovered.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded text-[#666] hover:text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2e2e2e] rounded-md px-3 py-2">
        <span className="text-xs font-mono text-[#ededed] flex-1 select-all">
          {visible ? result.key : "•".repeat(result.key.length)}
        </span>
        <button
          onClick={() => setVisible((v) => !v)}
          className="p-1.5 rounded text-[#666] hover:text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors shrink-0"
          title={visible ? "Hide key" : "Reveal key"}
        >
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <CopyButton text={result.key} />
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<NewKeyResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  async function loadKeys() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.success) setKeys(data.data);
      else setError(data.error ?? "Failed to load API keys");
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadKeys(); }, []);
  useEffect(() => {
    if (showCreate) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [showCreate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewKey(data.data);
        setKeyName("");
        setShowCreate(false);
        await loadKeys();
      } else {
        setError(data.error ?? "Failed to create key");
      }
    } catch {
      setError("Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        if (newKey?.id === id) setNewKey(null);
      } else {
        setError(data.error ?? "Failed to revoke key");
      }
    } catch {
      setError("Failed to revoke key");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-medium text-[#ededed]">API Keys</h1>
          <p className="text-xs text-[#666] mt-0.5">
            {loading ? "Loading..." : `${keys.length} key${keys.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadKeys}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] hover:text-[#ededed] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand hover:bg-brand-hover text-black font-medium rounded-md transition-colors"
          >
            <Plus size={13} />
            New key
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* New key reveal banner */}
        {newKey && <NewKeyBanner result={newKey} onDismiss={() => setNewKey(null)} />}

        {/* Create form */}
        {showCreate && (
          <div className="mb-6 bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-4">
            <p className="text-sm font-medium text-[#ededed] mb-3">Create new API key</p>
            <form onSubmit={handleCreate} className="flex items-center gap-3">
              <input
                ref={nameInputRef}
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Production, My App"
                maxLength={80}
                className="flex-1 px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors"
              />
              <button
                type="submit"
                disabled={creating || !keyName.trim()}
                className="px-4 py-2 bg-brand hover:bg-brand-hover text-black text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setKeyName(""); }}
                className="px-3 py-2 text-xs text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] hover:text-[#ededed] transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Keys table */}
        <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e2e]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden sm:table-cell">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666] uppercase tracking-wide hidden lg:table-cell">Last used</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e2e2e]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#666] text-sm">Loading keys...</td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Key size={32} className="text-[#333]" />
                      <p className="text-sm text-[#666]">No API keys yet</p>
                      <p className="text-xs text-[#555]">Create a key to authenticate your applications</p>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="text-xs text-brand hover:underline mt-1"
                      >
                        Create your first key
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-[#222] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-brand/15 flex items-center justify-center shrink-0">
                          <Key size={12} className="text-brand" />
                        </div>
                        <span className="text-sm text-[#ededed] font-medium">{k.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-[#a0a0a0] bg-[#222] border border-[#2e2e2e] rounded px-2 py-0.5">
                        {k.keyPrefix}••••••••••••••••••••••••••••••••••••••••
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-[#a0a0a0]">{formatDate(k.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-[#a0a0a0]">
                        {k.lastUsedAt ? formatDate(k.lastUsedAt) : "Never"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(k.id)}
                        disabled={deletingId === k.id}
                        className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Revoke key"
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

        {/* Usage note */}
        <div className="mt-4 px-4 py-3 bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg">
          <p className="text-xs text-[#666]">
            Use your API key in the{" "}
            <code className="text-[#a0a0a0] bg-[#222] px-1 py-0.5 rounded text-[11px]">Authorization</code>{" "}
            header:{" "}
            <code className="text-[#a0a0a0] bg-[#222] px-1 py-0.5 rounded text-[11px]">
              Bearer awr_…
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
