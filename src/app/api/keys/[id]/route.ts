import { NextRequest } from "next/server";
import { revokeApiKey } from "@/services/keys.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";
import { getAuthFromRequest } from "@/lib/auth/middleware";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { id } = await params;

  try {
    await revokeApiKey(auth.sub, id);
    return success({ id });
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    console.error("[keys] delete error:", err);
    return apiError("Internal server error", 500);
  }
}
