import { z } from "zod";

import { passwordSchema, usernameSchema } from "@/lib/auth/validation";

const shiftSchema = z.object({
  name: z.enum(["Morning", "Evening", "Night"]),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid start time."),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid end time."),
});

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters.").max(80).transform((value) => value.replace(/\s+/g, " ")),
  description: z.string().trim().max(240),
  logoUrl: z.string().trim().max(500).refine((value) => !value || /^https?:\/\//i.test(value), "Enter a valid http or https logo URL."),
  timezone: z.string().trim().min(1).max(80).refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid timezone."),
  shifts: z.array(shiftSchema).min(1, "Keep at least one working shift.").max(3).refine((shifts) => new Set(shifts.map((shift) => shift.name)).size === shifts.length, "Each shift can only be added once."),
});

export const adminProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  username: usernameSchema,
});

export const adminPasswordSchema = z.object({
  currentPassword: z.string().max(72).optional(),
  newPassword: passwordSchema,
});
