import { Client as MinioClient } from "minio";

/**
 * MinIO Storage Client
 *
 * S3-compatible storage backend for file uploads and downloads.
 * This module manages:
 *   1. Client singleton (singleton pattern for connection pooling)
 *   2. Bucket initialization (automatic bucket creation)
 *   3. File operations (upload, download, delete)
 *   4. Presigned URLs (temporary access without credentials)
 *
 * Configuration via environment variables:
 *   MINIO_ENDPOINT (default: localhost) — MinIO server hostname/IP
 *   MINIO_PORT (default: 9000) — MinIO API port
 *   MINIO_ACCESS_KEY (default: minioadmin) — Access key ID
 *   MINIO_SECRET_KEY (default: minioadmin) — Secret access key
 *   MINIO_BUCKET (default: aiwrite) — Default bucket name
 *   MINIO_USE_SSL (default: false) — Use HTTPS (set to true in production)
 */

/**
 * Read MinIO configuration from environment variables.
 * Falls back to sensible defaults for development.
 */
function getConfig() {
  const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
  const port = parseInt(process.env.MINIO_PORT ?? "9000", 10);
  const accessKey = process.env.MINIO_ACCESS_KEY ?? "minioadmin";
  const secretKey = process.env.MINIO_SECRET_KEY ?? "minioadmin";
  const bucket = process.env.MINIO_BUCKET ?? "aiwrite";
  const useSSL = process.env.MINIO_USE_SSL === "true";

  return { endpoint, port, accessKey, secretKey, bucket, useSSL };
}

/**
 * Global reference for MinIO client singleton.
 * Cached to avoid recreating connections on each request.
 */
const globalForMinio = globalThis as unknown as {
  minioClient: MinioClient | undefined;
};

/**
 * Get or create the MinIO client singleton.
 *
 * Caching strategy:
 *   - Development: Cached in global scope to persist across HMR reloads
 *   - Production: New instance per call (assumes external connection pooling)
 *
 * Returns the MinIO client instance.
 */
function getClient(): MinioClient {
  if (globalForMinio.minioClient) {
    return globalForMinio.minioClient;
  }

  const config = getConfig();
  const client = new MinioClient({
    endPoint: config.endpoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  // Cache in development to survive HMR, not in production
  if (process.env.NODE_ENV !== "production") {
    globalForMinio.minioClient = client;
  }

  return client;
}

/**
 * Ensure the configured bucket exists.
 * Creates the bucket if it does not exist.
 *
 * Should be called once during application startup or before the first upload.
 * Safe to call multiple times (idempotent).
 *
 * Throws on connectivity or permission errors.
 */
export async function ensureBucket(): Promise<void> {
  const client = getClient();
  const bucket = getConfig().bucket;

  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
  }
}

/**
 * Upload a file to MinIO.
 *
 * Parameters:
 *   key: Object key (path in bucket, e.g., "user-id/uuid-filename.ext")
 *   buffer: File content as Buffer
 *   contentType: MIME type (e.g., "application/pdf")
 *
 * Throws on connectivity, permission, or quota errors.
 * Returns the object key for later retrieval.
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getClient();
  const bucket = getConfig().bucket;

  await client.putObject(bucket, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });

  return key;
}

/**
 * Generate a presigned GET URL for file download.
 *
 * Parameters:
 *   key: Object key in bucket
 *   expirySeconds: URL validity duration in seconds (default: 3600 = 1 hour)
 *
 * Returns a fully qualified URL with embedded credentials.
 * The URL can be shared and used by anyone for the specified duration.
 *
 * Use cases:
 *   - Download links in API responses
 *   - Direct client access without proxying through backend
 *   - Time-limited file sharing
 */
export async function getPresignedUrl(
  key: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = getClient();
  const bucket = getConfig().bucket;

  return client.presignedGetObject(bucket, key, expirySeconds);
}

/**
 * Delete a file from MinIO.
 *
 * Parameters:
 *   key: Object key in bucket
 *
 * Throws on connectivity or permission errors.
 * Idempotent (no error if object does not exist).
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  const bucket = getConfig().bucket;

  await client.removeObject(bucket, key);
}

/**
 * Export the MinIO client for advanced use cases.
 * Most operations should use the functions above.
 */
export { getClient as getMinioClient };
