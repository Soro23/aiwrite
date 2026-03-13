"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, Eye, EyeOff, Plug } from "lucide-react";
import { EmptyState } from "@/components/database/EmptyState";

interface ConnectionInfo {
  host: string;
  port: number;
  database: string;
  schema: string;
  user: string;
  password: string;
  ssl: boolean;
}

type ClientTab =
  | "uri"
  | "psql"
  | "nodejs"
  | "prisma"
  | "psycopg2"
  | "sqlalchemy"
  | "go"
  | "jdbc"
  | "php";

const TABS: { id: ClientTab; label: string }[] = [
  { id: "uri",        label: "URI"         },
  { id: "psql",       label: "psql"        },
  { id: "nodejs",     label: "Node.js"     },
  { id: "prisma",     label: "Prisma"      },
  { id: "psycopg2",   label: "psycopg2"    },
  { id: "sqlalchemy", label: "SQLAlchemy"  },
  { id: "go",         label: "Go"          },
  { id: "jdbc",       label: "JDBC"        },
  { id: "php",        label: "PHP"         },
];

function buildSnippets(info: ConnectionInfo, showPwd: boolean): Record<ClientTab, string> {
  const pwd = showPwd ? info.password : "••••••••";
  const sslMode = info.ssl ? "require" : "disable";
  const uri = `postgresql://${info.user}:${showPwd ? info.password : "YOUR_PASSWORD"}@${info.host}:${info.port}/${info.database}?search_path=${info.schema}&sslmode=${sslMode}`;

  return {
    uri,
    psql: `psql "${uri}"`,
    nodejs: `import { Pool } from "pg";

const pool = new Pool({
  host:     "${info.host}",
  port:     ${info.port},
  database: "${info.database}",
  user:     "${info.user}",
  password: "${pwd}",
  ssl:      ${info.ssl ? "{ rejectUnauthorized: false }" : "false"},
  options:  \`-c search_path=${info.schema}\`,
});`,
    prisma: `// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// .env
DATABASE_URL="${uri}"`,
    psycopg2: `import psycopg2

conn = psycopg2.connect(
    host="${info.host}",
    port=${info.port},
    dbname="${info.database}",
    user="${info.user}",
    password="${pwd}",
    options="-c search_path=${info.schema}",
    sslmode="${sslMode}",
)`,
    sqlalchemy: `from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg2://${info.user}:${pwd}@${info.host}:${info.port}/${info.database}",
    connect_args={
        "options": "-c search_path=${info.schema}",
        "sslmode": "${sslMode}",
    },
)`,
    go: `import (
    "database/sql"
    "fmt"
    _ "github.com/jackc/pgx/v5/stdlib"
)

dsn := fmt.Sprintf(
    "host=${info.host} port=${info.port} dbname=${info.database} user=${info.user} password=${pwd} search_path=${info.schema} sslmode=${sslMode}",
)
db, err := sql.Open("pgx", dsn)`,
    jdbc: `// Maven: org.postgresql:postgresql
String url = "jdbc:postgresql://${info.host}:${info.port}/${info.database}?currentSchema=${info.schema}&sslmode=${sslMode}";
Properties props = new Properties();
props.setProperty("user", "${info.user}");
props.setProperty("password", "${pwd}");
Connection conn = DriverManager.getConnection(url, props);`,
    php: `<?php
$dsn = "pgsql:host=${info.host};port=${info.port};dbname=${info.database};options='-c search_path=${info.schema}'";
$pdo = new PDO($dsn, "${info.user}", "${pwd}", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);`,
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded text-[#555] hover:text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors"
      title="Copy"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

function ParamRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1e1e1e] last:border-0 gap-4">
      <span className="text-xs text-[#555] w-24 shrink-0">{label}</span>
      <span className={`text-xs text-[#ccc] flex-1 truncate ${mono ? "font-mono" : ""}`}>{value}</span>
      <button
        onClick={handleCopy}
        className="p-1 rounded text-[#444] hover:text-[#888] transition-colors shrink-0"
      >
        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

export default function ConnectionPage() {
  const params = useParams<{ id: string }>();
  const [info, setInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [tab, setTab] = useState<ClientTab>("uri");

  useEffect(() => {
    fetch(`/api/databases/${params.id}/connection`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setInfo(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-[#555]">Loading…</p>
      </div>
    );
  }

  if (!info) {
    return <EmptyState icon={Plug} title="Connection info unavailable" />;
  }

  const snippets = buildSnippets(info, showPwd);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Connection parameters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-[#888] uppercase tracking-widest">Parameters</h2>
          <button
            onClick={() => setShowPwd((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-[#888] transition-colors"
          >
            {showPwd ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPwd ? "Hide password" : "Show password"}
          </button>
        </div>
        <div className="bg-[#141414] border border-[#2e2e2e] rounded-lg px-4">
          <ParamRow label="Host"     value={info.host} />
          <ParamRow label="Port"     value={String(info.port)} />
          <ParamRow label="Database" value={info.database} />
          <ParamRow label="Schema"   value={info.schema} />
          <ParamRow label="User"     value={info.user} />
          <ParamRow label="Password" value={showPwd ? info.password : "••••••••"} />
          <ParamRow label="SSL"      value={info.ssl ? "require" : "disable"} mono={false} />
        </div>
      </div>

      {/* Connection string snippets */}
      <div>
        <h2 className="text-xs font-medium text-[#888] uppercase tracking-widest mb-3">Connection strings</h2>

        {/* Tab bar */}
        <div className="flex gap-1 flex-wrap mb-0 border-b border-[#2e2e2e]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs rounded-t transition-colors ${
                tab === t.id
                  ? "bg-[#1c1c1c] text-[#ededed] border border-b-[#1c1c1c] border-[#2e2e2e] -mb-px"
                  : "text-[#555] hover:text-[#888]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Snippet */}
        <div className="bg-[#0e0e0e] border border-t-0 border-[#2e2e2e] rounded-b-lg">
          <div className="flex items-start justify-between gap-2 p-4">
            <pre className="text-[11px] text-[#ccc] font-mono whitespace-pre-wrap break-all flex-1 leading-relaxed">
              {snippets[tab]}
            </pre>
            <CopyButton text={snippets[tab]} />
          </div>
        </div>

        <p className="text-[11px] text-[#444] mt-2">
          The <span className="font-mono text-[#555]">search_path</span> / <span className="font-mono text-[#555]">options</span> parameter scopes the connection to your database schema.
        </p>
      </div>
    </div>
  );
}
