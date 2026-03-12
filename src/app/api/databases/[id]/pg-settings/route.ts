import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { listPgSettings } from "@/services/pg-catalog.service";
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
    const settings = await listPgSettings(auth.sub, id);
    return success(settings);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
