import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { importDatabase } from "@/services/import.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";
import { ImportDatabaseSchema } from "@/validators/import.validator";

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const body = await request.json();
    const parsed = ImportDatabaseSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

    const db = await importDatabase(auth.sub, parsed.data);
    return success(db, 201);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
