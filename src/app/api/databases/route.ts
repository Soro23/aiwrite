import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { listDatabases, createDatabase } from "@/services/database.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";
import { CreateDatabaseSchema } from "@/validators/database.validator";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const databases = await listDatabases(auth.sub);
    return success(databases);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const body = await request.json();
    const parsed = CreateDatabaseSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

    const db = await createDatabase(auth.sub, parsed.data.name);
    return success(db, 201);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
