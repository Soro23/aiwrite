import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { listIndexes, createIndex } from "@/services/ddl.service";
import { CreateIndexSchema } from "@/validators/ddl.validator";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const indexes = await listIndexes(auth.sub, id);
    return success(indexes);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const body = await request.json();
    const { tableName, indexName, columns, indexType, unique } = CreateIndexSchema.parse(body);
    await createIndex(auth.sub, id, tableName, indexName, columns, indexType, unique);
    return success(null);
  } catch (err) {
    if (err instanceof ZodError) return apiError(err.errors[0].message, 400);
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
