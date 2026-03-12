import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors";
import { getOwnedDatabase } from "@/services/database.service";
import { IdentifierSchema } from "@/validators/ddl.validator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtensionInfo {
  name: string;
  defaultVersion: string | null;
  installedVersion: string | null;
  isInstalled: boolean;
  comment: string | null;
}

export interface ExtensionsResult {
  extensions: ExtensionInfo[];
  canManageExtensions: boolean;
}

export interface PublicationInfo {
  name: string;
  owner: string;
  allTables: boolean;
  pubinsert: boolean;
  pubupdate: boolean;
  pubdelete: boolean;
  pubtruncate: boolean;
}

export interface RoleInfo {
  name: string;
  isSuperuser: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  canLogin: boolean;
  connectionLimit: number;
  validUntil: Date | null;
  memberOf: string[];
}

export interface PgSettingInfo {
  name: string;
  setting: string;
  unit: string | null;
  category: string;
  shortDesc: string | null;
  context: string;
  vartype: string;
  source: string;
  minVal: string | null;
  maxVal: string | null;
  enumvals: string[] | null;
}

// ---------------------------------------------------------------------------
// Extensions
// ---------------------------------------------------------------------------

async function canManageExtensions(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ can_manage: boolean }>>(
      `SELECT pg_has_role(current_user, 'pg_extension_owner', 'usage') AS can_manage`
    );
    return rows[0]?.can_manage ?? false;
  } catch {
    return false;
  }
}

export async function listExtensions(
  userId: string,
  databaseId: string
): Promise<ExtensionsResult> {
  await getOwnedDatabase(userId, databaseId);

  const extensions = await prisma.$queryRawUnsafe<
    Array<{
      name: string;
      default_version: string | null;
      installed_version: string | null;
      is_installed: boolean;
      comment: string | null;
    }>
  >(
    `SELECT ae.name, ae.default_version,
            ie.extversion AS installed_version,
            (ie.extname IS NOT NULL) AS is_installed,
            ae.comment
     FROM pg_available_extensions ae
     LEFT JOIN pg_extension ie ON ie.extname = ae.name
     ORDER BY ae.name`
  );

  const canManage = await canManageExtensions();

  return {
    extensions: extensions.map((e) => ({
      name: e.name,
      defaultVersion: e.default_version,
      installedVersion: e.installed_version,
      isInstalled: e.is_installed,
      comment: e.comment,
    })),
    canManageExtensions: canManage,
  };
}

export async function enableExtension(
  userId: string,
  databaseId: string,
  name: string
): Promise<void> {
  await getOwnedDatabase(userId, databaseId);
  IdentifierSchema.parse(name);

  const canManage = await canManageExtensions();
  if (!canManage) throw new ServiceError("Insufficient privileges to manage extensions", 403);

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "${name}"`);
}

export async function disableExtension(
  userId: string,
  databaseId: string,
  name: string
): Promise<void> {
  await getOwnedDatabase(userId, databaseId);
  IdentifierSchema.parse(name);

  const canManage = await canManageExtensions();
  if (!canManage) throw new ServiceError("Insufficient privileges to manage extensions", 403);

  await prisma.$executeRawUnsafe(`DROP EXTENSION IF EXISTS "${name}"`);
}

// ---------------------------------------------------------------------------
// Publications (read-only)
// ---------------------------------------------------------------------------

export async function listPublications(
  userId: string,
  databaseId: string
): Promise<PublicationInfo[]> {
  await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      name: string;
      owner: string;
      all_tables: boolean;
      pubinsert: boolean;
      pubupdate: boolean;
      pubdelete: boolean;
      pubtruncate: boolean;
    }>
  >(
    `SELECT p.pubname AS name, r.rolname AS owner,
            p.puballtables AS all_tables,
            p.pubinsert, p.pubupdate, p.pubdelete, p.pubtruncate
     FROM pg_publication p
     JOIN pg_roles r ON r.oid = p.pubowner
     ORDER BY p.pubname`
  );

  return rows.map((r) => ({
    name: r.name,
    owner: r.owner,
    allTables: r.all_tables,
    pubinsert: r.pubinsert,
    pubupdate: r.pubupdate,
    pubdelete: r.pubdelete,
    pubtruncate: r.pubtruncate,
  }));
}

// ---------------------------------------------------------------------------
// Roles (read-only)
// ---------------------------------------------------------------------------

export async function listRoles(
  userId: string,
  databaseId: string
): Promise<RoleInfo[]> {
  await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      name: string;
      is_superuser: boolean;
      can_create_db: boolean;
      can_create_role: boolean;
      can_login: boolean;
      connection_limit: number;
      valid_until: Date | null;
      member_of: string[];
    }>
  >(
    `SELECT rolname AS name, rolsuper AS is_superuser,
            rolcreatedb AS can_create_db, rolcreaterole AS can_create_role,
            rolcanlogin AS can_login, rolconnlimit AS connection_limit,
            rolvaliduntil AS valid_until,
            ARRAY(
              SELECT b.rolname FROM pg_auth_members m
              JOIN pg_roles b ON b.oid = m.roleid
              WHERE m.member = r.oid
            ) AS member_of
     FROM pg_roles r ORDER BY rolname`
  );

  return rows.map((r) => ({
    name: r.name,
    isSuperuser: r.is_superuser,
    canCreateDb: r.can_create_db,
    canCreateRole: r.can_create_role,
    canLogin: r.can_login,
    connectionLimit: r.connection_limit,
    validUntil: r.valid_until,
    memberOf: r.member_of ?? [],
  }));
}

// ---------------------------------------------------------------------------
// PG Settings (read-only)
// ---------------------------------------------------------------------------

export async function listPgSettings(
  userId: string,
  databaseId: string
): Promise<PgSettingInfo[]> {
  await getOwnedDatabase(userId, databaseId);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      name: string;
      setting: string;
      unit: string | null;
      category: string;
      short_desc: string | null;
      context: string;
      vartype: string;
      source: string;
      min_val: string | null;
      max_val: string | null;
      enumvals: string[] | null;
    }>
  >(
    `SELECT name, setting, unit, category, short_desc,
            context, vartype, source, min_val, max_val, enumvals
     FROM pg_settings
     WHERE context NOT IN ('internal')
     ORDER BY category, name`
  );

  return rows.map((r) => ({
    name: r.name,
    setting: r.setting,
    unit: r.unit,
    category: r.category,
    shortDesc: r.short_desc,
    context: r.context,
    vartype: r.vartype,
    source: r.source,
    minVal: r.min_val,
    maxVal: r.max_val,
    enumvals: r.enumvals,
  }));
}
