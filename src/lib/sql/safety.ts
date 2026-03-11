/**
 * SQL safety validation for user-submitted queries.
 *
 * Blocks operations that could escape the user's schema or affect
 * the PostgreSQL server itself. This is a defense-in-depth measure —
 * the PostgreSQL role used by the app should also have limited privileges.
 */

export const BLOCKED_PATTERNS: RegExp[] = [
  /\bDROP\s+DATABASE\b/i,
  /\bCREATE\s+DATABASE\b/i,
  /\bALTER\s+DATABASE\b/i,
  /\bDROP\s+TABLESPACE\b/i,
  /\bCREATE\s+TABLESPACE\b/i,
  /\bCREATE\s+ROLE\b/i,
  /\bDROP\s+ROLE\b/i,
  /\bALTER\s+ROLE\b/i,
  /\bCREATE\s+USER\b/i,
  /\bDROP\s+USER\b/i,
  /\bALTER\s+USER\b/i,
  /\bALTER\s+SYSTEM\b/i,
  /\bSET\s+ROLE\b/i,
  /\bSET\s+SESSION\s+AUTHORIZATION\b/i,
  /\bCREATE\s+SCHEMA\b/i,
  /\bDROP\s+SCHEMA\b/i,
  /\bALTER\s+SCHEMA\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bCREATE\s+EXTENSION\b/i,
  /\bDROP\s+EXTENSION\b/i,
  /\bpg_read_file\b/i,
  /\bpg_write_file\b/i,
  /\blo_import\b/i,
  /\blo_export\b/i,
  /\bCOPY\s+.+\s+FROM\s+PROGRAM\b/i,
];

/** Remove SQL comments before pattern matching to avoid comment-based bypasses. */
function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")          // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, " "); // block comments
}

export interface SafetyResult {
  safe: boolean;
  reason?: string;
}

export function validateSqlSafety(sql: string): SafetyResult {
  const stripped = stripComments(sql).trim();

  if (!stripped) {
    return { safe: false, reason: "SQL statement is empty" };
  }

  // Reject multi-statement input (multiple semicolons with content after them)
  const statements = stripped
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  if (statements.length > 1) {
    return { safe: false, reason: "Only one SQL statement is allowed per execution" };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(stripped)) {
      return { safe: false, reason: "This SQL operation is not permitted" };
    }
  }

  return { safe: true };
}

export function isReadOnlyQuery(sql: string): boolean {
  const trimmed = stripComments(sql).trim().toUpperCase();
  return (
    trimmed.startsWith("SELECT") ||
    trimmed.startsWith("EXPLAIN") ||
    trimmed.startsWith("SHOW") ||
    trimmed.startsWith("WITH")
  );
}
