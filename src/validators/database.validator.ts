import { z } from "zod";

export const CreateDatabaseSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .trim()
    .regex(/^[a-zA-Z0-9_\- ]+$/, "Name can only contain letters, numbers, spaces, hyphens, and underscores"),
});

export const ExecuteSqlSchema = z.object({
  sql: z
    .string()
    .min(1, "SQL is required")
    .max(100_000, "SQL is too long"),
});

export const ListRowsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const TableNameSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name");

export type CreateDatabaseInput = z.infer<typeof CreateDatabaseSchema>;
export type ExecuteSqlInput = z.infer<typeof ExecuteSqlSchema>;
