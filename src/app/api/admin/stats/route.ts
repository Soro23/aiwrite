import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, apiError } from "@/lib/api/response";
import { getAuthFromRequest } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return apiError("Unauthorized", 401);
  }

  const [userCount, fileSizeAgg, fileCount] = await Promise.all([
    prisma.user.count(),
    prisma.file.aggregate({ _sum: { size: true } }),
    prisma.file.count(),
  ]);

  return success({
    users: userCount,
    files: fileCount,
    storageUsed: fileSizeAgg._sum.size ?? 0,
  });
}
