import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { upload, listFiles } from "@/services/files.service";
import { ServiceError } from "@/lib/errors";
import { uploadFileSchema, listFilesSchema } from "@/validators/files.validator";
import { success, apiError, paginated } from "@/lib/api/response";

/**
 * GET /api/files
 *
 * List the authenticated user's files with pagination.
 *
 * Query Parameters:
 *   page (optional, default 1): Page number (must be > 0)
 *   limit (optional, default 20): Items per page (1-100)
 *
 * Example:
 *   GET /api/files?page=1&limit=20
 *
 * Response (200 OK):
 *   {
 *     "success": true,
 *     "data": [
 *       {
 *         "id": "550e8400-e29b-41d4-a716-446655440000",
 *         "filename": "document.pdf",
 *         "mimeType": "application/pdf",
 *         "size": 1024000,
 *         "createdAt": "2026-03-11T12:34:56.000Z",
 *         "url": "https://minio.example.com/aiwrite/user-id/uuid.pdf?..."
 *       }
 *     ],
 *     "error": null,
 *     "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
 *   }
 *
 * Errors:
 *   401 Unauthorized - Missing or invalid JWT
 *   422 Unprocessable Entity - Invalid query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listFilesSchema.safeParse(searchParams);

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join("; ");
      return apiError(message, 422);
    }

    const { page, limit } = parsed.data;
    const result = await listFiles(auth.sub, page, limit);

    return paginated(result.files, result.total, page, limit);
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.statusCode);
    }
    console.error("[files] List error:", err);
    return apiError("Internal server error", 500);
  }
}

/**
 * POST /api/files
 *
 * Upload a file for the authenticated user.
 *
 * Content-Type: multipart/form-data
 * Form Fields:
 *   file (required): File object from HTML <input type="file" />
 *
 * Supported MIME Types:
 *   - Images: image/jpeg, image/png, image/gif, image/webp
 *   - Documents: application/pdf, text/plain, text/markdown, application/json
 *
 * Constraints:
 *   - Max size: 10 MB
 *   - Filename: 1-255 characters (required, client-supplied)
 *
 * Example (curl):
 *   curl -X POST http://localhost:3000/api/files \
 *     -F "file=@myfile.pdf" \
 *     -H "Cookie: auth-token=eyJ..."
 *
 * Response (201 Created):
 *   {
 *     "success": true,
 *     "data": {
 *       "id": "550e8400-e29b-41d4-a716-446655440000",
 *       "filename": "myfile.pdf",
 *       "mimeType": "application/pdf",
 *       "size": 1024000,
 *       "url": "https://minio.example.com/aiwrite/user-id/uuid.pdf?..."
 *     },
 *     "error": null
 *   }
 *
 * Errors:
 *   401 Unauthorized - Missing or invalid JWT
 *   422 Unprocessable Entity - Invalid file (bad type, too large, missing, etc.)
 *   500 Internal Server Error - Unexpected failure (MinIO, database, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("No file provided. Send a 'file' field in multipart/form-data.", 422);
    }

    const validation = uploadFileSchema.safeParse({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });

    if (!validation.success) {
      const message = validation.error.errors.map((e) => e.message).join("; ");
      return apiError(message, 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await upload(auth.sub, file.name, file.type, buffer);

    return success(result, 201);
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.statusCode);
    }
    console.error("[files] Upload error:", err);
    return apiError("Internal server error", 500);
  }
}
