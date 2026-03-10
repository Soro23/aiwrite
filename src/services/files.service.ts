import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { uploadFile, deleteFile, getPresignedUrl, ensureBucket } from "@/lib/storage/minio";
import { ServiceError } from "@/lib/errors";

/**
 * Files service — business logic for file upload, listing, and deletion.
 *
 * All file operations are scoped to the authenticated user.
 * Ownership is enforced at the service layer before any data access.
 */

interface UploadResult {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  url?: string;
}

interface ListResult {
  files: FileRecord[];
  total: number;
}

/**
 * Upload a file for the authenticated user.
 *
 * Steps:
 *   1. Ensure MinIO bucket exists
 *   2. Generate unique storage key: {userId}/{uuid}-{sanitized-filename}
 *   3. Upload buffer to MinIO
 *   4. Persist metadata to PostgreSQL
 *   5. Generate presigned URL (1 hour validity)
 *
 * Returns the file record with presigned URL.
 */
export async function upload(
  userId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<UploadResult> {
  await ensureBucket();

  // Sanitize the extension to prevent path traversal and injection.
  // Only allow alphanumeric characters in extensions (e.g., "pdf", "png").
  // The UUID prefix guarantees uniqueness regardless of the original filename.
  const rawExtension = filename.split(".").pop() ?? "";
  const safeExtension = rawExtension.replace(/[^a-zA-Z0-9]/g, "");
  const extensionSuffix = safeExtension ? `.${safeExtension}` : "";
  const storageKey = `${userId}/${randomUUID()}${extensionSuffix}`;

  // Upload to MinIO
  await uploadFile(storageKey, buffer, mimeType);

  // Persist metadata to database
  const bucket = process.env.MINIO_BUCKET ?? "aiwrite";
  const file = await prisma.file.create({
    data: {
      filename,
      storageKey,
      mimeType,
      size: buffer.length,
      userId,
      bucketName: bucket,
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      storageKey: true,
    },
  });

  // Generate presigned URL for immediate download
  const url = await getPresignedUrl(file.storageKey);

  return {
    id: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    url,
  };
}

/**
 * List files belonging to the authenticated user with pagination.
 *
 * Steps:
 *   1. Fetch files for user with pagination
 *   2. Count total files (for pagination metadata)
 *   3. Generate presigned URL for each file (1 hour validity)
 *
 * Returns paginated file list with presigned URLs.
 */
export async function listFiles(
  userId: string,
  page: number,
  limit: number
): Promise<ListResult> {
  const skip = (page - 1) * limit;

  // Fetch files and total count in parallel
  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        storageKey: true,
      },
    }),
    prisma.file.count({ where: { userId } }),
  ]);

  // Generate presigned URLs for each file
  const filesWithUrls: FileRecord[] = await Promise.all(
    files.map(async (file) => ({
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt,
      url: await getPresignedUrl(file.storageKey),
    }))
  );

  return { files: filesWithUrls, total };
}

/**
 * Delete a file belonging to the authenticated user.
 *
 * Ownership verification is enforced:
 *   - Throws 404 if file does not exist
 *   - Throws 403 if file does not belong to the user
 *
 * Steps:
 *   1. Fetch file record (includes ownership check)
 *   2. Verify ownership (compare userId)
 *   3. Delete from MinIO storage
 *   4. Delete metadata from database
 */
export async function removeFile(userId: string, fileId: string): Promise<void> {
  // Fetch file with explicit ownership
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { userId: true, storageKey: true },
  });

  // Check existence
  if (!file) {
    throw new ServiceError("File not found", 404);
  }

  // Check ownership
  if (file.userId !== userId) {
    throw new ServiceError("Forbidden", 403);
  }

  // Delete from storage first (fail fast on external errors)
  // If this throws, the database transaction won't complete
  await deleteFile(file.storageKey);

  // Delete metadata from database
  await prisma.file.delete({ where: { id: fileId } });
}
