import { z } from "zod";

export const CreateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must not exceed 80 characters"),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
