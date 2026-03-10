import { z } from "zod";

/**
 * Validation schemas for authentication endpoints.
 *
 * Password policy:
 *   - At least 8 characters (brute-force resistance)
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one digit
 *   - At least one special character
 *
 * Error messages are deliberately generic where possible to avoid
 * leaking information about existing accounts.
 */

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .trim(),

  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be at most 255 characters")
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase(),

  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

// Legacy camelCase aliases kept for backwards compatibility with existing imports.
export const registerSchema = RegisterSchema;
export const loginSchema = LoginSchema;
