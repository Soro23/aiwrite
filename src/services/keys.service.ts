import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors";
import type { CreateApiKeyInput } from "@/validators/keys.validator";

/**
 * API Key service.
 *
 * Key format: `awr_<48 hex chars>` (total 52 chars)
 * Key prefix: first 12 chars e.g. `awr_a1b2c3d4` — stored in plain for display.
 * Key hash:   SHA-256 of the full key — the only thing stored for verification.
 *
 * The full key is NEVER stored; it is returned once at creation time.
 */

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface CreatedApiKey extends ApiKeyItem {
  /** Full key — shown once, not stored. */
  key: string;
}

function generateKey(): { key: string; keyPrefix: string; keyHash: string } {
  const raw = crypto.randomBytes(24).toString("hex"); // 48 hex chars
  const key = `awr_${raw}`;
  const keyPrefix = key.slice(0, 12); // "awr_" + 8 chars
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, keyPrefix, keyHash };
}

const keySelect = {
  id: true,
  name: true,
  keyPrefix: true,
  createdAt: true,
  lastUsedAt: true,
} as const;

export async function createApiKey(
  userId: string,
  input: CreateApiKeyInput
): Promise<CreatedApiKey> {
  const { key, keyPrefix, keyHash } = generateKey();

  const record = await prisma.apiKey.create({
    data: {
      userId,
      name: input.name,
      keyHash,
      keyPrefix,
    },
    select: keySelect,
  });

  return { ...record, key };
}

export async function listApiKeys(userId: string): Promise<ApiKeyItem[]> {
  return prisma.apiKey.findMany({
    where: { userId },
    select: keySelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
    select: { id: true },
  });

  if (!key) {
    throw new ServiceError("API key not found", 404);
  }

  await prisma.apiKey.delete({ where: { id: keyId } });
}
