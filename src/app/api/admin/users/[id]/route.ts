import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { success, apiError } from "@/lib/api/response";
import { getAuthFromRequest } from "@/lib/auth/middleware";

const UpdateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

function mapUser(u: { id: string; name: string; email: string; role: unknown; status: unknown; createdAt: Date }) {
  return { ...u, role: String(u.role), status: String(u.status) };
}

/** PATCH /api/admin/users/[id] — update status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth || auth.role !== "ADMIN") return apiError("Forbidden", 403);

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON body", 400); }

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors.map((e) => e.message).join(", "), 422);
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return apiError("User not found", 404);

  if (String(target.role) === "ADMIN") {
    return apiError("Admin accounts cannot be suspended", 400);
  }
  if (id === auth.sub && parsed.data.status === "SUSPENDED") {
    return apiError("You cannot suspend your own account", 400);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: parsed.data.status },
    select: userSelect,
  });

  return success(mapUser(updated));
}

/** PUT /api/admin/users/[id] — edit name and email */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth || auth.role !== "ADMIN") return apiError("Forbidden", 403);

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON body", 400); }

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors.map((e) => e.message).join(", "), 422);
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return apiError("User not found", 404);

  if (String(target.role) === "ADMIN") {
    return apiError("Admin accounts cannot be edited", 400);
  }

  // Check email uniqueness if changed
  const emailConflict = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id } },
    select: { id: true },
  });
  if (emailConflict) return apiError("Email is already in use", 409);

  const updated = await prisma.user.update({
    where: { id },
    data: { name: parsed.data.name, email: parsed.data.email },
    select: userSelect,
  });

  return success(mapUser(updated));
}

/** DELETE /api/admin/users/[id] — remove a non-admin user */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth || auth.role !== "ADMIN") return apiError("Forbidden", 403);

  const { id } = await params;

  if (id === auth.sub) return apiError("You cannot delete your own account", 400);

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return apiError("User not found", 404);

  if (String(target.role) === "ADMIN") {
    return apiError("Admin accounts cannot be deleted", 400);
  }

  await prisma.user.delete({ where: { id } });

  return success({ id });
}
