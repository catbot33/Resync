import { z } from "zod";

const reservationFields = z.object({
  resourceId: z.string().trim().min(1, "Choose a resource."),
  userId: z.string().trim().min(1, "Choose an employee."),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true }),
  purpose: z.string().trim().max(120, "Keep the purpose under 120 characters.").optional().default(""),
  attendeeCount: z.coerce.number().int("Attendees must be a whole number.").min(1, "Include at least one attendee.").max(1000, "Attendees cannot exceed 1,000."),
});

export const createReservationSchema = reservationFields;
export const updateReservationSchema = reservationFields.partial().refine(
  (values) => Object.keys(values).length > 0,
  "Include at least one field to update.",
);
