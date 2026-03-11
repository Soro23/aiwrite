import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { success, apiError } from "@/lib/api/response";
import { getAuthFromRequest } from "@/lib/auth/middleware";

const UpdateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth || auth.role !== "ADMIN") {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors.map((e) => e.message).join(", "), 422);
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) {
    return apiError("User not found", 404);
  }

  // Prevent admin from suspending themselves
  if (id === auth.sub && parsed.data.status === "SUSPENDED") {
    return apiError("You cannot suspend your own account", 400);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: parsed.data.status },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return success({ ...updated, role: String(updated.role), status: String(updated.status) });
}
