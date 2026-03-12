import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { dropTrigger } from "@/services/ddl.service";
import { DropTriggerSchema } from "@/validators/ddl.validator";
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
    const body = await request.json();
    const { tableName } = DropTriggerSchema.parse(body);
    await dropTrigger(auth.sub, id, name, tableName);
    return success(null);
  } catch (err) {
    if (err instanceof ZodError) return apiError(err.errors[0].message, 400);
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
