import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { dropIndex } from "@/services/ddl.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const { id, name } = await params;
    await dropIndex(auth.sub, id, name);
    return success(null);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
