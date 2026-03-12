import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors";
import { getOwnedDatabase } from "@/services/database.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey: boolean;
}

export interface ErTable {
  name: string;
  columns: ErColumn[];
}

export interface ErForeignKey {
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface ErDiagram {
  tables: ErTable[];
  foreignKeys: ErForeignKey[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getErDiagram(
  userId: string,
  databaseId: string
): Promise<ErDiagram> {
  const db = await getOwnedDatabase(userId, databaseId);

  const columnRows = await prisma.$queryRawUnsafe<
    Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: boolean;
      column_default: string | null;
      is_primary_key: boolean;
    }>
  >(
    `SELECT
       c.table_name,
       c.column_name,
       c.data_type,
       (c.is_nullable = 'YES') AS is_nullable,
       c.column_default,
       bool_or(tc.constraint_type = 'PRIMARY KEY') AS is_primary_key
     FROM information_schema.columns c
     LEFT JOIN information_schema.key_column_usage kcu
       ON kcu.table_schema = c.table_schema
      AND kcu.table_name   = c.table_name
      AND kcu.column_name  = c.column_name
     LEFT JOIN information_schema.table_constraints tc
       ON tc.constraint_name = kcu.constraint_name
      AND tc.constraint_type = 'PRIMARY KEY'
     WHERE c.table_schema = $1
       AND c.table_name IN (
         SELECT table_name FROM information_schema.tables
         WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       )
     GROUP BY c.table_name, c.column_name, c.data_type,
              c.is_nullable, c.column_default, c.ordinal_position
     ORDER BY c.table_name, c.ordinal_position`,
    db.schemaName
  );

  const fkRows = await prisma.$queryRawUnsafe<
    Array<{
      from_table: string;
      from_column: string;
      to_table: string;
      to_column: string;
      constraint_name: string;
    }>
  >(
    `SELECT
       kcu.table_name    AS from_table,
       kcu.column_name   AS from_column,
       ccu.table_name    AS to_table,
       ccu.column_name   AS to_column,
       tc.constraint_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema    = tc.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema    = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema    = $1`,
    db.schemaName
  );

  // Group columns by table
  const tableMap = new Map<string, ErColumn[]>();
  for (const row of columnRows) {
    if (!tableMap.has(row.table_name)) tableMap.set(row.table_name, []);
    tableMap.get(row.table_name)!.push({
      name: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable,
      columnDefault: row.column_default,
      isPrimaryKey: row.is_primary_key,
    });
  }

  const tables: ErTable[] = Array.from(tableMap.entries()).map(([name, columns]) => ({
    name,
    columns,
  }));

  const foreignKeys: ErForeignKey[] = fkRows.map((r) => ({
    constraintName: r.constraint_name,
    fromTable: r.from_table,
    fromColumn: r.from_column,
    toTable: r.to_table,
    toColumn: r.to_column,
  }));

  return { tables, foreignKeys };
}
