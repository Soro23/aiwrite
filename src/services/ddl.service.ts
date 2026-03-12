import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors";
import { validateSqlSafety } from "@/lib/sql/safety";
import { getOwnedDatabase } from "@/services/database.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FunctionInfo {
  name: string;
  language: string;
  returnType: string;
  argumentTypes: string;
  definition: string;
  isProc: boolean;
}

export interface TriggerInfo {
  name: string;
  tableName: string;
  timing: string;
  events: string[];
  definition: string;
}

export interface EnumInfo {
  name: string;
  values: string[];
}

export interface IndexInfo {
  name: string;
  tableName: string;
  indexType: string;
  isUnique: boolean;
  isPrimary: boolean;
  definition: string;
  columns: string[];
}

export interface PolicyInfo {
  name: string;
  tableName: string;
  command: string;
  roles: string[];
  usingExpr: string | null;
  withCheckExpr: string | null;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export async function listFunctions(
  userId: string,
  databaseId: string
): Promise<FunctionInfo[]> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      name: string;
      language: string;
      return_type: string;
      argument_types: string;
      definition: string;
      is_proc: boolean;
    }>
  >(
    `SELECT
       p.proname                        AS name,
       l.lanname                        AS language,
       pg_get_function_result(p.oid)    AS return_type,
       pg_get_function_arguments(p.oid) AS argument_types,
       pg_get_functiondef(p.oid)        AS definition,
       (p.prokind = 'p')                AS is_proc
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_language l  ON l.oid = p.prolang
     WHERE n.nspname = $1 AND p.prokind IN ('f','p')
     ORDER BY p.proname`,
    db.schemaName
  );

  return rows.map((r) => ({
    name: r.name,
    language: r.language,
    returnType: r.return_type,
    argumentTypes: r.argument_types,
    definition: r.definition,
    isProc: r.is_proc,
  }));
}

export async function createFunction(
  userId: string,
  databaseId: string,
  sql: string
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);
  const safety = validateSqlSafety(sql);
  if (!safety.safe) throw new ServiceError(safety.reason ?? "SQL not permitted", 400);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${db.schemaName}", public`);
    await tx.$executeRawUnsafe(sql);
  });
}

export async function dropFunction(
  userId: string,
  databaseId: string,
  name: string,
  argTypes: string
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);

  // Verify function exists in this schema
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS(
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = $1 AND p.proname = $2
     ) AS exists`,
    db.schemaName,
    name
  );
  if (!rows[0]?.exists) throw new ServiceError("Function not found", 404);

  await prisma.$executeRawUnsafe(
    `DROP FUNCTION IF EXISTS "${db.schemaName}"."${name}"(${argTypes})`
  );
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

export async function listTriggers(
  userId: string,
  databaseId: string
): Promise<TriggerInfo[]> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      name: string;
      table_name: string;
      timing: string;
      event: string;
      definition: string;
    }>
  >(
    `SELECT
       trigger_name             AS name,
       event_object_table       AS table_name,
       action_timing            AS timing,
       event_manipulation       AS event,
       action_statement         AS definition
     FROM information_schema.triggers
     WHERE trigger_schema = $1
     ORDER BY event_object_table, trigger_name`,
    db.schemaName
  );

  // Group by name + table_name, collecting events
  const map = new Map<string, TriggerInfo>();
  for (const row of rows) {
    const key = `${row.name}__${row.table_name}`;
    if (!map.has(key)) {
      map.set(key, {
        name: row.name,
        tableName: row.table_name,
        timing: row.timing,
        events: [],
        definition: row.definition,
      });
    }
    map.get(key)!.events.push(row.event);
  }

  return Array.from(map.values());
}

export async function createTrigger(
  userId: string,
  databaseId: string,
  sql: string
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);
  const safety = validateSqlSafety(sql);
  if (!safety.safe) throw new ServiceError(safety.reason ?? "SQL not permitted", 400);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${db.schemaName}", public`);
    await tx.$executeRawUnsafe(sql);
  });
}

export async function dropTrigger(
  userId: string,
  databaseId: string,
  triggerName: string,
  tableName: string
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.triggers
       WHERE trigger_schema = $1
         AND trigger_name = $2
         AND event_object_table = $3
     ) AS exists`,
    db.schemaName,
    triggerName,
    tableName
  );
  if (!rows[0]?.exists) throw new ServiceError("Trigger not found", 404);

  await prisma.$executeRawUnsafe(
    `DROP TRIGGER IF EXISTS "${triggerName}" ON "${db.schemaName}"."${tableName}"`
  );
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export async function listEnums(
  userId: string,
  databaseId: string
): Promise<EnumInfo[]> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{ name: string; values: string[] }>
  >(
    `SELECT
       t.typname AS name,
       array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
     FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     JOIN pg_enum e      ON e.enumtypid = t.oid
     WHERE n.nspname = $1 AND t.typtype = 'e'
     GROUP BY t.typname
     ORDER BY t.typname`,
    db.schemaName
  );

  return rows.map((r) => ({ name: r.name, values: r.values }));
}

export async function createEnum(
  userId: string,
  databaseId: string,
  name: string,
  values: string[]
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);
  const escapedValues = values
    .map((v) => `'${v.replace(/'/g, "''")}'`)
    .join(", ");
  const sql = `CREATE TYPE "${db.schemaName}"."${name}" AS ENUM (${escapedValues})`;
  await prisma.$executeRawUnsafe(sql);
}

export async function dropEnum(
  userId: string,
  databaseId: string,
  name: string
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS(
       SELECT 1 FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = $1 AND t.typname = $2 AND t.typtype = 'e'
     ) AS exists`,
    db.schemaName,
    name
  );
  if (!rows[0]?.exists) throw new ServiceError("Enum not found", 404);

  await prisma.$executeRawUnsafe(
    `DROP TYPE IF EXISTS "${db.schemaName}"."${name}"`
  );
}

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

export async function listIndexes(
  userId: string,
  databaseId: string
): Promise<IndexInfo[]> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      name: string;
      table_name: string;
      index_type: string;
      is_unique: boolean;
      is_primary: boolean;
      definition: string;
      columns: string[];
    }>
  >(
    `SELECT
       i.relname                                   AS name,
       t.relname                                   AS table_name,
       am.amname                                   AS index_type,
       ix.indisunique                              AS is_unique,
       ix.indisprimary                             AS is_primary,
       pg_get_indexdef(i.oid)                      AS definition,
       array_agg(a.attname ORDER BY k.ordinality) AS columns
     FROM pg_index ix
     JOIN pg_class i ON i.oid = ix.indexrelid
     JOIN pg_class t ON t.oid = ix.indrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     JOIN pg_am am ON am.oid = i.relam
     JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ordinality) ON TRUE
     JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
     WHERE n.nspname = $1
     GROUP BY i.relname, t.relname, am.amname, ix.indisunique, ix.indisprimary, i.oid
     ORDER BY t.relname, i.relname`,
    db.schemaName
  );

  return rows.map((r) => ({
    name: r.name,
    tableName: r.table_name,
    indexType: r.index_type,
    isUnique: r.is_unique,
    isPrimary: r.is_primary,
    definition: r.definition,
    columns: r.columns,
  }));
}

export async function createIndex(
  userId: string,
  databaseId: string,
  tableName: string,
  indexName: string,
  columns: string[],
  indexType: string,
  unique: boolean
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const uniqueClause = unique ? "UNIQUE " : "";
  const sql = `CREATE ${uniqueClause}INDEX "${indexName}" ON "${db.schemaName}"."${tableName}" USING ${indexType} (${colList})`;
  await prisma.$executeRawUnsafe(sql);
}

export async function dropIndex(
  userId: string,
  databaseId: string,
  indexName: string
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);

  // Block dropping primary key indexes
  const rows = await prisma.$queryRawUnsafe<
    Array<{ is_primary: boolean; exists: boolean }>
  >(
    `SELECT
       ix.indisprimary AS is_primary,
       TRUE AS exists
     FROM pg_index ix
     JOIN pg_class i ON i.oid = ix.indexrelid
     JOIN pg_class t ON t.oid = ix.indrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = $1 AND i.relname = $2
     LIMIT 1`,
    db.schemaName,
    indexName
  );

  if (!rows.length) throw new ServiceError("Index not found", 404);
  if (rows[0].is_primary) throw new ServiceError("Cannot drop primary key index", 400);

  await prisma.$executeRawUnsafe(
    `DROP INDEX IF EXISTS "${db.schemaName}"."${indexName}"`
  );
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export async function listPolicies(
  userId: string,
  databaseId: string
): Promise<PolicyInfo[]> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      name: string;
      table_name: string;
      command: string;
      roles: string[];
      using_expr: string | null;
      with_check_expr: string | null;
    }>
  >(
    `SELECT
       p.polname AS name,
       c.relname AS table_name,
       CASE p.polcmd
         WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
         WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL'
       END AS command,
       array_agg(r.rolname) FILTER (WHERE r.rolname IS NOT NULL) AS roles,
       pg_get_expr(p.polqual, p.polrelid)      AS using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
     FROM pg_policy p
     JOIN pg_class c ON c.oid = p.polrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN pg_roles r ON r.oid = ANY(p.polroles)
     WHERE n.nspname = $1
     GROUP BY p.polname, c.relname, p.polcmd, p.polqual, p.polwithcheck, p.polrelid
     ORDER BY c.relname, p.polname`,
    db.schemaName
  );

  return rows.map((r) => ({
    name: r.name,
    tableName: r.table_name,
    command: r.command,
    roles: r.roles ?? [],
    usingExpr: r.using_expr,
    withCheckExpr: r.with_check_expr,
  }));
}

export async function createPolicy(
  userId: string,
  databaseId: string,
  sql: string
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);
  const safety = validateSqlSafety(sql);
  if (!safety.safe) throw new ServiceError(safety.reason ?? "SQL not permitted", 400);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${db.schemaName}", public`);
    await tx.$executeRawUnsafe(sql);
  });
}

export async function dropPolicy(
  userId: string,
  databaseId: string,
  policyName: string,
  tableName: string
): Promise<void> {
  const db = await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS(
       SELECT 1 FROM pg_policy p
       JOIN pg_class c ON c.oid = p.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND p.polname = $2 AND c.relname = $3
     ) AS exists`,
    db.schemaName,
    policyName,
    tableName
  );
  if (!rows[0]?.exists) throw new ServiceError("Policy not found", 404);

  await prisma.$executeRawUnsafe(
    `DROP POLICY IF EXISTS "${policyName}" ON "${db.schemaName}"."${tableName}"`
  );
}
