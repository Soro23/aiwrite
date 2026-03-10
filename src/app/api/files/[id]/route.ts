import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { removeFile } from "@/services/files.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";

/**
 * DELETE /api/files/[id]
 *
 * Delete a file belonging to the authenticated user.
 * The file ID must be supplied in the URL path.
 * Only the file owner can delete their files.
 *
 * Path Parameters:
 *   id (required): UUID of the file to delete
 *
 * Example:
 *   DELETE /api/files/550e8400-e29b-41d4-a716-446655440000
 *
 * Response (200 OK):
 *   {
 *     "success": true,
 *     "data": { "message": "File deleted" },
 *     "error": null
 *   }
 *
 * Errors:
 *   401 Unauthorized - Missing or invalid JWT
 *   404 Not Found - File does not exist or was already deleted
 *   403 Forbidden - File exists but does not belong to the authenticated user
 *   500 Internal Server Error - Unexpected failure (MinIO, database, etc.)
 *
 * Security:
 *   - Ownership is verified before deletion
 *   - File is deleted from both MinIO and database
 *   - No file content is exposed in error messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }

    const { id } = await params;

    if (!id) {
      return apiError("File ID is required", 422);
    }

    // Delete file (ownership is enforced in service layer)
    await removeFile(auth.sub, id);

    return success({ message: "File deleted" });
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.statusCode);
    }
    console.error("[files] Delete error:", err);
    return apiError("Internal server error", 500);
  }
}
