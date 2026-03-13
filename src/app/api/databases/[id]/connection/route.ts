import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { getDatabase } from "@/services/database.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";

export interface ConnectionInfo {
  host: string;
  port: number;
  database: string;
  schema: string;
  user: string;
  password: string;
  ssl: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const db = await getDatabase(auth.sub, id);

    const rawUrl = process.env.DATABASE_URL ?? "";
    const url = new URL(rawUrl.replace(/^postgres:\/\//, "postgresql://"));

    const info: ConnectionInfo = {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname.replace(/^\//, ""),
      schema: db.schemaName,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: !rawUrl.includes("sslmode=disable"),
    };

    return success(info);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
