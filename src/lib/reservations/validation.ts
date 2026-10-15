import { z } from "zod";

const reservationFields = z.object({
  resourceId: z.string().trim().min(1, "Choose a resource."),
  resourceUnit: z.coerce.number().int("Choose a valid unit.").min(1, "Choose a valid unit.").max(10_000, "Choose a valid unit."),
  userId: z.string().trim().min(1, "Choose an employee."),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true }),
  purpose: z.string().trim().max(120, "Keep the purpose under 120 characters.").optional().default(""),
});

export const createReservationSchema = reservationFields;
export const updateReservationSchema = reservationFields.partial().refine(
  (values) => Object.keys(values).length > 0,
  "Include at least one field to update.",
);
