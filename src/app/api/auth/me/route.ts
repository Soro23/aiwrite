import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { getUserById } from "@/services/auth.service";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) return apiError("Unauthorized", 401);

    const user = await getUserById(auth.sub);
    if (!user) return apiError("User not found", 404);

    return success({ user });
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    console.error("[me/GET] Unexpected error:", err);
    return apiError("Internal server error", 500);
  }
}

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().max(255).toLowerCase().optional(),
});

const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) return apiError("Unauthorized", 401);

    const body = await request.json();

    // Password change flow
    if (body.currentPassword !== undefined) {
      const parsed = UpdatePasswordSchema.safeParse(body);
      if (!parsed.success) {
        return apiError(parsed.error.errors[0].message, 400);
      }

      const user = await prisma.user.findUnique({ where: { id: auth.sub } });
      if (!user) return apiError("User not found", 404);

      const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
      if (!valid) return apiError("Current password is incorrect", 400);

      const passwordHash = await hashPassword(parsed.data.newPassword);
      await prisma.user.update({ where: { id: auth.sub }, data: { passwordHash } });

      return success({ message: "Password updated" });
    }

    // Profile update flow
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, 400);
    }

    if (parsed.data.email) {
      const existing = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      });
      if (existing && existing.id !== auth.sub) {
        return apiError("Email already in use", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: auth.sub },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return success({ user: { ...updated, role: String(updated.role) } });
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    console.error("[me/PATCH] Unexpected error:", err);
    return apiError("Internal server error", 500);
  }
}
