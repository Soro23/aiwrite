import { z } from "zod";

export const IdentifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/, "Invalid identifier");

export const CreateFunctionSchema = z.object({ sql: z.string().min(10).max(100_000) });
export const CreateTriggerSchema  = z.object({ sql: z.string().min(10).max(100_000) });
export const CreatePolicySchema   = z.object({ sql: z.string().min(10).max(10_000)  });

export const DropFunctionSchema = z.object({ argTypes: z.string().max(2000) });
export const DropTriggerSchema  = z.object({ tableName: IdentifierSchema });
export const DropPolicySchema   = z.object({ tableName: IdentifierSchema });

export const CreateEnumSchema = z.object({
  name:   IdentifierSchema,
  values: z.array(z.string().min(1).max(63)).min(1).max(100),
});

export const CreateIndexSchema = z.object({
  tableName: IdentifierSchema,
  indexName: IdentifierSchema,
  columns:   z.array(IdentifierSchema).min(1).max(32),
  indexType: z.enum(["btree", "hash", "gin", "gist", "brin", "spgist"]).default("btree"),
  unique:    z.boolean().default(false),
});
