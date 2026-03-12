import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { enableExtension, disableExtension } from "@/services/pg-catalog.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";

const ActionSchema = z.object({
  action: z.enum(["enable", "disable"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const { id, name } = await params;
    const body = await request.json();
    const { action } = ActionSchema.parse(body);

    if (action === "enable") {
      await enableExtension(auth.sub, id, name);
    } else {
      await disableExtension(auth.sub, id, name);
    }

    return success(null);
  } catch (err) {
    if (err instanceof ZodError) return apiError(err.errors[0].message, 400);
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
