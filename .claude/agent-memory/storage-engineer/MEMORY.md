# Storage Engineer - aiwrite-base

## Project Context

**aiwrite-base**: AI-powered writing application with self-hosted backend.
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: PostgreSQL 16 via Prisma ORM
- **Storage**: MinIO (S3-compatible, self-hosted)
- **Auth**: JWT in httpOnly cookies
- **Path Alias**: `@/*` → `src/*`

## Storage Architecture

### MinIO Configuration
- Environment Variables:
  - `MINIO_ENDPOINT` (default: localhost)
  - `MINIO_PORT` (default: 9000)
  - `MINIO_ACCESS_KEY` (default: minioadmin)
  - `MINIO_SECRET_KEY` (default: minioadmin)
  - `MINIO_BUCKET` (default: aiwrite)
  - `MINIO_USE_SSL` (default: false in dev, true in prod)

### File Model (Prisma)
```prisma
model File {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  filename   String           // Original filename
  storageKey String   @unique // UUID-based key: userId/uuid-filename
  mimeType   String   @map("mime_type")
  size       Int
  bucketName String   @map("bucket_name")
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

### Bucket Structure
```
aiwrite/
  └── {userId}/
      ├── {uuid-filename1.ext}
      ├── {uuid-filename2.ext}
      └── ...
```

Key: `userId/{randomUUID()}-{original-filename}`
- Prevents directory traversal attacks
- UUIDs ensure no collisions
- userId prefix for quick multi-tenancy lookup

## API Endpoints

### GET /api/files
- **Auth**: Required (JWT cookie)
- **Query**: `page` (default 1), `limit` (default 20, max 100)
- **Response**: Paginated file list with presigned URLs
- **Status**: 200 (success), 401 (auth), 422 (validation)

### POST /api/files
- **Auth**: Required (JWT cookie)
- **Body**: multipart/form-data with `file` field
- **Validation**:
  - MIME types: jpeg, png, gif, webp, pdf, text, markdown, json
  - Max size: 10 MB
- **Response**: File record with presigned URL
- **Status**: 201 (created), 401 (auth), 422 (validation)

### DELETE /api/files/:id
- **Auth**: Required (JWT cookie)
- **Ownership**: Only file owner can delete
- **Response**: { message: "File deleted" }
- **Status**: 200 (deleted), 401 (auth), 403 (forbidden), 404 (not found)

## Security Controls
- [x] No public bucket access (private by default)
- [x] MIME type validation on server (whitelist check)
- [x] File size limits enforced (10 MB)
- [x] Presigned URLs expire (1 hour default)
- [x] Ownership checks on all operations (userId in WHERE clause)
- [x] No predictable storage keys (UUID-based)
- [x] Error messages don't leak file info
- [x] No hardcoded credentials (all env vars)

## File Service Functions

### `upload(userId, filename, mimeType, buffer): UploadResult`
- Generates unique storageKey
- Uploads to MinIO
- Persists metadata to Prisma
- Returns file record + presigned URL

### `listFiles(userId, page, limit): ListResult`
- Fetches paginated files
- Generates presigned URL for each
- Returns { files, total }

### `removeFile(userId, fileId): void`
- Ownership check (throws 403 if not owner)
- Deletes from MinIO
- Deletes from Prisma
- 404 if not found

## Validators

### uploadFileSchema
- filename: 1-255 chars
- mimeType: whitelist check
- size: 1 byte to 10 MB

### listFilesSchema
- page: int > 0 (default 1)
- limit: int 1-100 (default 20)

## Key Implementation Details

1. **JWT Payload Structure**: `{ sub: userId, role: "USER"|"ADMIN" }`
2. **Auth Access**: `auth.sub` for userId from verified JWT
3. **Bucket Creation**: `ensureBucket()` called in upload (safe for concurrent calls)
4. **Presigned URL Validity**: 1 hour (3600 seconds)
5. **Error Type**: `ServiceError(message, statusCode)` from `@/services/auth.service`
6. **Response Envelope**: All endpoints use `success()`, `error()`, `paginated()`

## Testing Checklist
- [ ] Upload valid file → 201 with presigned URL
- [ ] Upload oversized file → 422 rejection
- [ ] Upload invalid MIME type → 422 rejection
- [ ] List files pagination → correct meta fields
- [ ] Delete owned file → 200 success
- [ ] Delete unowned file → 403 forbidden
- [ ] Delete nonexistent file → 404 not found
- [ ] Unauthenticated request → 401 for all operations
- [ ] Presigned URL → valid for 1 hour, downloads file correctly
