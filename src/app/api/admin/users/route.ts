import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, apiError } from "@/lib/api/response";
import { getAuthFromRequest } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return apiError("Unauthorized", 401);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return success(users.map((u) => ({ ...u, role: String(u.role) })));
}
