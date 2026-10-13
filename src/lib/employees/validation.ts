import { z } from "zod";

import { passwordSchema, usernameSchema } from "@/lib/auth/validation";

export const employeeSchema = z.object({
  name: z.string().trim().min(1, "Enter the employee's name.").max(80, "Keep the name under 80 characters."),
  username: usernameSchema,
  password: passwordSchema,
  isActive: z.boolean().optional().default(true),
});

export const employeeUpdateSchema = z.object({
  name: z.string().trim().min(1, "Enter the employee's name.").max(80, "Keep the name under 80 characters.").optional(),
  username: usernameSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((values) => Object.keys(values).length > 0, "Include at least one field to update.");

export const employeePasswordSchema = z.object({ password: passwordSchema });
