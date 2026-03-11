import { NextRequest } from "next/server";
import { CreateApiKeySchema } from "@/validators/keys.validator";
import { createApiKey, listApiKeys } from "@/services/keys.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";
import { getAuthFromRequest } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  const keys = await listApiKeys(auth.sub);
  return success(keys);
}

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors.map((e) => e.message).join(", "), 422);
  }

  try {
    const created = await createApiKey(auth.sub, parsed.data);
    return success(created, 201);
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    console.error("[keys] create error:", err);
    return apiError("Internal server error", 500);
  }
}
