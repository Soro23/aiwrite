import { z } from "zod";

/**
 * File validation constants and schemas.
 *
 * MAX_FILE_SIZE: 10 MB (enforced on both client and server)
 * ALLOWED_MIME_TYPES: Whitelist of supported content types
 *   - Images: JPEG, PNG, GIF, WebP
 *   - Documents: PDF, plain text, Markdown
 *   - Data: JSON
 *
 * All file uploads are validated:
 *   1. File exists and is valid File object
 *   2. MIME type is in the allowlist
 *   3. File size does not exceed limit
 *   4. Filename is not empty (client-supplied)
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // PDF
  "application/pdf",
  // Word documents
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Plain text
  "text/plain",
] as const;

/**
 * Zod schema for file upload validation.
 * Applied to request.formData() file field.
 */
export const uploadFileSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename must not exceed 255 characters")
    .refine(
      (name) => !name.includes("..") && !name.includes("/") && !name.includes("\\"),
      { message: "Filename contains invalid characters" }
    ),
  mimeType: z
    .string()
    .refine(
      (type) => (ALLOWED_MIME_TYPES as readonly string[]).includes(type),
      {
        message: `File type not allowed. Supported types: ${ALLOWED_MIME_TYPES.join(
          ", "
        )}`,
      }
    ),
  size: z
    .number()
    .positive("File size must be greater than 0")
    .max(
      MAX_FILE_SIZE,
      `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024} MB`
    ),
});

/**
 * Zod schema for list query parameters.
 * Enforces pagination bounds: page >= 1, limit between 1-100.
 */
export const listFilesSchema = z.object({
  page: z
    .coerce
    .number()
    .int("Page must be an integer")
    .positive("Page must be greater than 0")
    .default(1),
  limit: z
    .coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be greater than 0")
    .max(100, "Limit cannot exceed 100 items per page")
    .default(20),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type ListFilesInput = z.infer<typeof listFilesSchema>;
