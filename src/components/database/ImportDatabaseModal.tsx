"use client";

import { useState } from "react";
import { X, Database, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Provider = "supabase" | "neon" | "appwrite";

interface ProviderCard {
  id: Provider;
  label: string;
  description: string;
  color: string;
}

const PROVIDERS: ProviderCard[] = [
  {
    id: "supabase",
    label: "Supabase",
    description: "Import tables from a Supabase PostgreSQL project",
    color: "text-emerald-400",
  },
  {
    id: "neon",
    label: "Neon",
    description: "Import tables from a Neon serverless PostgreSQL database",
    color: "text-blue-400",
  },
  {
    id: "appwrite",
    label: "AppWrite",
    description: "Import collections from an AppWrite database",
    color: "text-pink-400",
  },
];

interface Props {
  onClose: () => void;
  onImported: () => void;
}

type Step = "provider" | "credentials" | "importing" | "done";

export function ImportDatabaseModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [name, setName] = useState("");
  const [connectionString, setConnectionString] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [projectId, setProjectId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [error, setError] = useState("");

  function selectProvider(p: Provider) {
    setProvider(p);
    setStep("credentials");
    setError("");
  }

  function buildPayload() {
    if (!provider) return null;
    if (provider === "supabase" || provider === "neon") {
      return { provider, name, connectionString };
    }
    return { provider, name, endpoint, projectId, apiKey, databaseId };
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("importing");

    try {
      const payload = buildPayload();
      const res = await fetch("/api/databases/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStep("done");
        onImported();
      } else {
        setError(data.error ?? "Import failed");
        setStep("credentials");
      }
    } catch {
      setError("Network error, please try again");
      setStep("credentials");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-brand" />
            <span className="text-sm font-medium text-[#ededed]">Import database</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#666] hover:text-[#a0a0a0] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Step: provider */}
          {step === "provider" && (
            <div>
              <p className="text-xs text-[#666] mb-4">Choose the source platform to import from:</p>
              <div className="space-y-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProvider(p.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#222] border border-[#2e2e2e] rounded-lg hover:border-[#404040] hover:bg-[#262626] transition-colors group text-left"
                  >
                    <div>
                      <span className={`text-sm font-medium ${p.color}`}>{p.label}</span>
                      <p className="text-xs text-[#666] mt-0.5">{p.description}</p>
                    </div>
                    <ArrowRight size={14} className="text-[#444] group-hover:text-[#666] transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: credentials */}
          {step === "credentials" && provider && (
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => { setStep("provider"); setError(""); }}
                  className="text-xs text-[#666] hover:text-[#a0a0a0] transition-colors mb-3 flex items-center gap-1"
                >
                  ← Back
                </button>
                <p className="text-xs text-[#666]">
                  Importing from{" "}
                  <span className="text-[#ededed] capitalize">{provider}</span>
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Local database name */}
              <div>
                <label className="block text-xs text-[#a0a0a0] mb-1.5">
                  Local database name
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my_imported_db"
                  required
                  pattern="[a-z0-9_]+"
                  title="Only lowercase letters, digits and underscores"
                  className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              {/* Postgres fields */}
              {(provider === "supabase" || provider === "neon") && (
                <div>
                  <label className="block text-xs text-[#a0a0a0] mb-1.5">
                    Connection string
                  </label>
                  <textarea
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder={
                      provider === "supabase"
                        ? "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
                        : "postgresql://[user]:[password]@ep-[name].region.aws.neon.tech/[db]?sslmode=require"
                    }
                    required
                    rows={3}
                    className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-xs text-[#ededed] placeholder-[#444] focus:outline-none focus:border-brand transition-colors font-mono resize-none"
                  />
                  <p className="text-[11px] text-[#555] mt-1">
                    {provider === "supabase"
                      ? "Find it in Supabase → Project Settings → Database → Connection string (URI, port 5432)."
                      : "Find it in Neon → Project → Connection Details."}
                  </p>
                </div>
              )}

              {/* AppWrite fields */}
              {provider === "appwrite" && (
                <>
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1.5">API endpoint</label>
                    <input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="https://cloud.appwrite.io/v1"
                      required
                      className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#a0a0a0] mb-1.5">Project ID</label>
                      <input
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="6507..."
                        required
                        className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#a0a0a0] mb-1.5">Database ID</label>
                      <input
                        value={databaseId}
                        onChange={(e) => setDatabaseId(e.target.value)}
                        placeholder="6508..."
                        required
                        className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1.5">API key</label>
                    <input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="standard_..."
                      required
                      type="password"
                      className="w-full px-3 py-2 bg-[#222] border border-[#2e2e2e] rounded-md text-sm text-[#ededed] placeholder-[#555] focus:outline-none focus:border-brand transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[#555] mt-1">
                      AppWrite → Overview → Integrations → API Keys. Key needs <em>databases.read</em> scope.
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-[#a0a0a0] border border-[#2e2e2e] rounded-md hover:bg-[#242424] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-brand hover:bg-brand-hover text-black font-medium rounded-md transition-colors"
                >
                  Import
                </button>
              </div>
            </form>
          )}

          {/* Step: importing */}
          {step === "importing" && (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <Loader2 size={28} className="text-brand animate-spin" />
              <p className="text-sm text-[#ededed]">Importing database...</p>
              <p className="text-xs text-[#555]">
                Connecting to {provider} and copying schema + data. This may take a moment.
              </p>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="text-sm text-[#ededed]">Import complete</p>
              <p className="text-xs text-[#555]">
                Database <span className="font-mono text-[#a0a0a0]">{name}</span> has been created.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 text-sm bg-brand hover:bg-brand-hover text-black font-medium rounded-md transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
