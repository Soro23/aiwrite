import { Client } from "pg";
import { lookup } from "dns/promises";
import { prisma } from "@/lib/db/prisma";
import { createDatabase } from "./database.service";
import { ServiceError } from "@/lib/errors";
import type { DatabaseRecord } from "./database.service";
import type { ImportDatabaseInput } from "@/validators/import.validator";

const MAX_ROWS_PER_TABLE = 50_000;

// ---------------------------------------------------------------------------
// PostgreSQL type mapping
// ---------------------------------------------------------------------------

function mapPgType(dataType: string, charMaxLen: number | null): string {
  if (charMaxLen && (dataType === "character varying" || dataType === "character")) {
    return `VARCHAR(${charMaxLen})`;
  }
  const map: Record<string, string> = {
    bigint: "BIGINT",
    bigserial: "BIGINT",
    integer: "INTEGER",
    int: "INTEGER",
    serial: "INTEGER",
    smallint: "SMALLINT",
    smallserial: "SMALLINT",
    decimal: "DECIMAL",
    numeric: "NUMERIC",
    real: "REAL",
    "double precision": "DOUBLE PRECISION",
    float8: "DOUBLE PRECISION",
    boolean: "BOOLEAN",
    bool: "BOOLEAN",
    text: "TEXT",
    "character varying": "TEXT",
    character: "TEXT",
    varchar: "TEXT",
    bytea: "BYTEA",
    "timestamp without time zone": "TIMESTAMP",
    "timestamp with time zone": "TIMESTAMPTZ",
    timestamp: "TIMESTAMP",
    date: "DATE",
    "time without time zone": "TIME",
    "time with time zone": "TIMETZ",
    uuid: "UUID",
    json: "JSON",
    jsonb: "JSONB",
    inet: "TEXT",
    cidr: "TEXT",
    macaddr: "TEXT",
    "USER-DEFINED": "TEXT",
    ARRAY: "TEXT",
  };
  return map[dataType] ?? "TEXT";
}

// ---------------------------------------------------------------------------
// Postgres import (Supabase / Neon)
// ---------------------------------------------------------------------------

async function importFromPostgres(
  userId: string,
  name: string,
  connectionString: string
): Promise<DatabaseRecord> {
  // Parse connection string and resolve hostname to IPv4 explicitly.
  // Passing connectionString + host together does not override pg's internal
  // hostname resolution, so we must build the config without connectionString.
  let pgConfig: ConstructorParameters<typeof Client>[0];
  try {
    const url = new URL(connectionString.replace(/^postgres:\/\//, "postgresql://"));
    const { address } = await lookup(url.hostname, { family: 4 });
    pgConfig = {
      host: address,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: connectionString.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
      connectionTimeoutMillis: 15_000,
      query_timeout: 60_000,
    };
  } catch {
    throw new ServiceError(
      "Could not resolve the host to an IPv4 address. " +
      "For Supabase, use the Session Mode pooler URL: Project Settings → Database → Connection pooling → Session mode → URI (port 5432).",
      400
    );
  }

  const client = new Client(pgConfig);

  await client.connect().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : "Connection failed";
    throw new ServiceError(`Could not connect to external database: ${msg}`, 400);
  });

  const db = await createDatabase(userId, name);

  try {
    const tablesResult = await client.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    for (const { table_name: tableName } of tablesResult.rows) {
      const colsResult = await client.query<{
        column_name: string;
        data_type: string;
        character_maximum_length: number | null;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName]
      );

      const pkResult = await client.query<{ column_name: string }>(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         WHERE tc.table_schema = 'public'
           AND tc.table_name = $1
           AND tc.constraint_type = 'PRIMARY KEY'
         ORDER BY kcu.ordinal_position`,
        [tableName]
      );

      const pkCols = new Set(pkResult.rows.map((r) => r.column_name));
      const multiPk = pkCols.size > 1;

      const buildColDef = (c: (typeof colsResult.rows)[number], withPk: boolean): string => {
        const pgType = mapPgType(c.data_type, c.character_maximum_length);
        const nullable = c.is_nullable === "YES" ? "" : " NOT NULL";
        const skipDefault = c.column_default?.includes("nextval") ?? false;
        // Strip ::typename casts (e.g. 'member'::board_role) — the enum type won't exist in our schema
        const sanitizedDefault = c.column_default?.replace(/::[a-zA-Z_][a-zA-Z0-9_.]*(\[\])?/g, "") ?? null;
        const def = sanitizedDefault && !skipDefault ? ` DEFAULT ${sanitizedDefault}` : "";
        const pk = withPk && pkCols.has(c.column_name) && !multiPk ? " PRIMARY KEY" : "";
        return `"${c.column_name}" ${pgType}${nullable}${def}${pk}`;
      };

      const colDefs = colsResult.rows.map((c) => buildColDef(c, true));
      if (multiPk) {
        const pkConstraint = `PRIMARY KEY (${[...pkCols].map((c) => `"${c}"`).join(", ")})`;
        colDefs.push(pkConstraint);
      }

      // Map column name → mapped pg type for cast generation during INSERT
      const colTypeMap = new Map(
        colsResult.rows.map((c) => [c.column_name, mapPgType(c.data_type, c.character_maximum_length)])
      );

      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${db.schemaName}"."${tableName}" (${colDefs.join(", ")})`
      );

      const dataResult = await client.query(
        `SELECT * FROM "${tableName}" LIMIT ${MAX_ROWS_PER_TABLE}`
      );

      if (dataResult.rows.length > 0) {
        const columns = dataResult.fields.map((f) => f.name);
        const quotedCols = columns.map((c) => `"${c}"`).join(", ");
        const batchSize = Math.min(50, Math.floor(60_000 / Math.max(columns.length, 1)));

        for (let i = 0; i < dataResult.rows.length; i += batchSize) {
          const batch = dataResult.rows.slice(i, i + batchSize);
          const params: unknown[] = [];
          const valueSets: string[] = [];

          for (const row of batch) {
            const placeholders = columns.map((col) => {
              const val = row[col] ?? null;
              params.push(val);
              const pgType = colTypeMap.get(col);
              // Explicit cast needed for types PostgreSQL won't auto-coerce from text
              const cast = pgType === "UUID" ? "::uuid"
                : pgType === "BYTEA" ? "::bytea"
                : pgType === "JSONB" ? "::jsonb"
                : pgType === "JSON" ? "::json"
                : "";
              return `$${params.length}${cast}`;
            });
            valueSets.push(`(${placeholders.join(", ")})`);
          }

          await prisma.$executeRawUnsafe(
            `INSERT INTO "${db.schemaName}"."${tableName}" (${quotedCols}) VALUES ${valueSets.join(", ")} ON CONFLICT DO NOTHING`,
            ...params
          );
        }
      }
    }

    return db;
  } catch (err) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${db.schemaName}" CASCADE`).catch(() => {});
    await prisma.database.delete({ where: { id: db.id } }).catch(() => {});
    if (err instanceof ServiceError) throw err;
    const msg = err instanceof Error ? err.message : "Import failed";
    throw new ServiceError(msg, 500);
  } finally {
    await client.end().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// AppWrite type mapping
// ---------------------------------------------------------------------------

function mapAppWriteType(type: string): string {
  const map: Record<string, string> = {
    string: "TEXT",
    integer: "INTEGER",
    float: "DOUBLE PRECISION",
    boolean: "BOOLEAN",
    datetime: "TIMESTAMPTZ",
    url: "TEXT",
    email: "TEXT",
    ip: "TEXT",
    enum: "TEXT",
    relationship: "TEXT",
  };
  return map[type] ?? "TEXT";
}

interface AppWriteAttribute {
  key: string;
  type: string;
  required: boolean;
}

interface AppWriteCollection {
  $id: string;
  name: string;
  attributes: AppWriteAttribute[];
}

// ---------------------------------------------------------------------------
// AppWrite import
// ---------------------------------------------------------------------------

async function importFromAppWrite(
  userId: string,
  name: string,
  endpoint: string,
  projectId: string,
  apiKey: string,
  appWriteDatabaseId: string
): Promise<DatabaseRecord> {
  const base = endpoint.replace(/\/$/, "").replace(/\/v1$/, "");
  const headers = {
    "X-Appwrite-Project": projectId,
    "X-Appwrite-Key": apiKey,
    "Content-Type": "application/json",
  };

  const awQuery = (method: string, ...values: unknown[]) =>
    encodeURIComponent(JSON.stringify({ method, values }));

  const collectionsRes = await fetch(
    `${base}/v1/databases/${appWriteDatabaseId}/collections?queries[]=${awQuery("limit", 100)}`,
    { headers }
  );

  if (!collectionsRes.ok) {
    const err = (await collectionsRes.json().catch(() => ({}))) as { message?: string };
    throw new ServiceError(
      err.message ?? "Failed to connect to AppWrite",
      collectionsRes.status >= 500 ? 502 : 400
    );
  }

  const collectionsData = (await collectionsRes.json()) as {
    collections: AppWriteCollection[];
  };

  const db = await createDatabase(userId, name);

  try {
    for (const collection of collectionsData.collections) {
      const safeTable = collection.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      const nonRelAttrs = collection.attributes.filter((a) => a.type !== "relationship");

      const colDefs = [
        `"_id" TEXT PRIMARY KEY`,
        ...nonRelAttrs.map((a) => {
          const pgType = mapAppWriteType(a.type);
          const nullable = a.required ? " NOT NULL" : "";
          return `"${a.key}" ${pgType}${nullable}`;
        }),
      ];

      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${db.schemaName}"."${safeTable}" (${colDefs.join(", ")})`
      );

      let offset = 0;
      const pageSize = 100;

      while (offset < MAX_ROWS_PER_TABLE) {
        const docsRes = await fetch(
          `${base}/v1/databases/${appWriteDatabaseId}/collections/${collection.$id}/documents?queries[]=${awQuery("limit", pageSize)}&queries[]=${awQuery("offset", offset)}`,
          { headers }
        );
        if (!docsRes.ok) break;

        const docsData = (await docsRes.json()) as { documents: Array<Record<string, unknown>> };
        if (docsData.documents.length === 0) break;

        const allCols = ["_id", ...nonRelAttrs.map((a) => a.key)];
        const quotedCols = allCols.map((c) => `"${c}"`).join(", ");
        const params: unknown[] = [];
        const valueSets: string[] = [];

        for (const doc of docsData.documents) {
          const placeholders = allCols.map((col) => {
            const raw = col === "_id" ? doc["$id"] : doc[col];
            const val = raw == null
              ? null
              : typeof raw === "object"
                ? JSON.stringify(raw)
                : raw;
            params.push(val);
            return `$${params.length}`;
          });
          valueSets.push(`(${placeholders.join(", ")})`);
        }

        await prisma.$executeRawUnsafe(
          `INSERT INTO "${db.schemaName}"."${safeTable}" (${quotedCols}) VALUES ${valueSets.join(", ")} ON CONFLICT DO NOTHING`,
          ...params
        );

        offset += docsData.documents.length;
        if (docsData.documents.length < pageSize) break;
      }
    }

    return db;
  } catch (err) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${db.schemaName}" CASCADE`).catch(() => {});
    await prisma.database.delete({ where: { id: db.id } }).catch(() => {});
    if (err instanceof ServiceError) throw err;
    const msg = err instanceof Error ? err.message : "Import failed";
    throw new ServiceError(msg, 500);
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function importDatabase(
  userId: string,
  input: ImportDatabaseInput
): Promise<DatabaseRecord> {
  if (input.provider === "supabase" || input.provider === "neon") {
    return importFromPostgres(userId, input.name, input.connectionString);
  }
  if (input.provider === "appwrite") {
    return importFromAppWrite(
      userId,
      input.name,
      input.endpoint,
      input.projectId,
      input.apiKey,
      input.databaseId
    );
  }
  throw new ServiceError("Unknown provider", 400);
}
