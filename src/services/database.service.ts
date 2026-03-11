import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors";
import { validateSqlSafety, isReadOnlyQuery } from "@/lib/sql/safety";

const MAX_DATABASES_PER_USER = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DatabaseRecord {
  id: string;
  userId: string;
  name: string;
  schemaName: string;
  createdAt: Date;
}

export type SqlResult =
  | { type: "rows"; columns: string[]; rows: Record<string, unknown>[] }
  | { type: "affected"; count: number };

export interface TableInfo {
  name: string;
  rowCountEstimate: number;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  ordinalPosition: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toSchemaName(databaseId: string): string {
  return `db_${databaseId.replace(/-/g, "").slice(0, 16)}`;
}

async function getOwnedDatabase(userId: string, id: string): Promise<DatabaseRecord> {
  const db = await prisma.database.findFirst({
    where: { id, userId },
  });
  if (!db) throw new ServiceError("Database not found", 404);
  return db;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function listDatabases(userId: string): Promise<DatabaseRecord[]> {
  return prisma.database.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDatabase(userId: string, name: string): Promise<DatabaseRecord> {
  const count = await prisma.database.count({ where: { userId } });
  if (count >= MAX_DATABASES_PER_USER) {
    throw new ServiceError(`Maximum of ${MAX_DATABASES_PER_USER} databases per user`, 403);
  }

  const existing = await prisma.database.findFirst({ where: { userId, name } });
  if (existing) throw new ServiceError("A database with this name already exists", 409);

  // Generate schema name before inserting so we can create the PG schema first
  const tempId = crypto.randomUUID();
  const schemaName = toSchemaName(tempId);

  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

  try {
    const db = await prisma.database.create({
      data: { userId, name, schemaName },
    });
    return db;
  } catch (err) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}"`).catch(() => {});
    throw err;
  }
}

export async function getDatabase(userId: string, id: string): Promise<DatabaseRecord> {
  return getOwnedDatabase(userId, id);
}

export async function deleteDatabase(userId: string, id: string): Promise<void> {
  const db = await getOwnedDatabase(userId, id);
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${db.schemaName}" CASCADE`);
  await prisma.database.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// SQL execution
// ---------------------------------------------------------------------------

export async function executeSql(
  userId: string,
  databaseId: string,
  sql: string
): Promise<SqlResult> {
  const db = await getOwnedDatabase(userId, databaseId);

  const safety = validateSqlSafety(sql);
  if (!safety.safe) throw new ServiceError(safety.reason ?? "SQL not permitted", 400);

  const readOnly = isReadOnlyQuery(sql);

  try {
    if (readOnly) {
      const rows = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SET LOCAL search_path TO "${db.schemaName}", public`
        );
        await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = '30s'`);
        return tx.$queryRawUnsafe<Record<string, unknown>[]>(sql);
      });

      const limited = rows.slice(0, 1000);
      const columns = limited.length > 0 ? Object.keys(limited[0]) : [];
      return { type: "rows", columns, rows: limited };
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SET LOCAL search_path TO "${db.schemaName}", public`
        );
        await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = '30s'`);
        await tx.$executeRawUnsafe(sql);
      });
      return { type: "affected", count: 0 };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Query execution failed";
    // Strip internal file paths from PG errors
    const clean = msg.replace(/\s+at \/[^\s]+/g, "");
    throw new ServiceError(clean, 400);
  }
}

// ---------------------------------------------------------------------------
// Table introspection
// ---------------------------------------------------------------------------

export async function listTables(
  userId: string,
  databaseId: string
): Promise<TableInfo[]> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{ table_name: string; row_estimate: bigint }>
  >(
    `SELECT t.table_name,
            COALESCE(c.reltuples::bigint, 0) AS row_estimate
     FROM information_schema.tables t
     LEFT JOIN pg_class c
       ON c.relname = t.table_name
     LEFT JOIN pg_namespace n
       ON n.oid = c.relnamespace AND n.nspname = t.table_schema
     WHERE t.table_schema = $1
       AND t.table_type = 'BASE TABLE'
     ORDER BY t.table_name`,
    db.schemaName
  );

  return rows.map((r) => ({
    name: r.table_name,
    rowCountEstimate: Number(r.row_estimate),
  }));
}

export async function getTableColumns(
  userId: string,
  databaseId: string,
  tableName: string
): Promise<ColumnInfo[]> {
  const db = await getOwnedDatabase(userId, databaseId);

  return prisma.$queryRawUnsafe<ColumnInfo[]>(
    `SELECT column_name AS name,
            data_type AS "dataType",
            (is_nullable = 'YES') AS "isNullable",
            column_default AS "columnDefault",
            ordinal_position AS "ordinalPosition"
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    db.schemaName,
    tableName
  );
}

export async function getTableRows(
  userId: string,
  databaseId: string,
  tableName: string,
  page: number,
  limit: number
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const db = await getOwnedDatabase(userId, databaseId);

  // Validate table name and existence
  const tables = await listTables(userId, databaseId);
  if (!tables.some((t) => t.name === tableName)) {
    throw new ServiceError("Table not found", 404);
  }

  const offset = (page - 1) * limit;

  const [countResult, rows] = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL search_path TO "${db.schemaName}", public`
    );
    const cnt = await tx.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) AS count FROM "${tableName}"`
    );
    const data = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset}`
    );
    return [cnt, data];
  });

  return {
    rows: rows as Record<string, unknown>[],
    total: Number(countResult[0].count),
  };
}
