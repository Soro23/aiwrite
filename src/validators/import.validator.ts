import { z } from "zod";

const nameField = z
  .string()
  .min(1, "Name is required")
  .max(63)
  .regex(/^[a-z0-9_]+$/, "Only lowercase letters, digits and underscores");

export const ImportPostgresSchema = z.object({
  provider: z.enum(["supabase", "neon"]),
  name: nameField,
  connectionString: z.string().min(1, "Connection string is required"),
});

export const ImportAppWriteSchema = z.object({
  provider: z.literal("appwrite"),
  name: nameField,
  endpoint: z.string().url("Must be a valid URL"),
  projectId: z.string().min(1, "Project ID is required"),
  apiKey: z.string().min(1, "API key is required"),
  databaseId: z.string().min(1, "Database ID is required"),
});

export const ImportDatabaseSchema = z.discriminatedUnion("provider", [
  ImportPostgresSchema,
  ImportAppWriteSchema,
]);

export type ImportDatabaseInput = z.infer<typeof ImportDatabaseSchema>;
