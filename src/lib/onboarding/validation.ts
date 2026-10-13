import { z } from "zod";

import { passwordSchema, usernameSchema } from "@/lib/auth/validation";

const shiftSchema = z.object({
  name: z.enum(["Morning", "Evening", "Night"]),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid start time."),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid end time."),
});

const memberSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

const resourceSchema = z.object({
  name: z.string().trim().min(1, "Resource name is required.").max(80),
  type: z.string().trim().min(1).max(50),
  quantity: z.number().int().min(1).max(1000),
  location: z.string().trim().min(1, "Resource location is required.").max(120),
});

export const onboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters.")
    .max(80)
    .transform((value) => value.replace(/\s+/g, " ")),
  description: z.string().trim().max(240).optional(),
  timezone: z.string().trim().min(1).max(80),
  shifts: z.array(shiftSchema).max(3),
  members: z.array(memberSchema).max(100),
  resources: z.array(resourceSchema).max(100),
});
