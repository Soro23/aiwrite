import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { executeSql } from "@/services/database.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";
import { ExecuteSqlSchema } from "@/validators/database.validator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = ExecuteSqlSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

    const result = await executeSql(auth.sub, id, parsed.data.sql);
    return success(result);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
