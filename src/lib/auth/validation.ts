import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-z0-9_]+$/, "Use only lowercase letters, numbers, and underscores.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(["MEMBER", "ADMIN"]),
});

export const registrationSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});
