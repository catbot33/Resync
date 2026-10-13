import { z } from "zod";

const categoryName = z.string().trim().min(1, "Choose or enter a category.").max(60, "Keep the category under 60 characters.");

export const resourceSchema = z.object({
  name: z.string().trim().min(1, "Enter a resource name.").max(80, "Keep the name under 80 characters."),
  categoryName,
  quantity: z.coerce.number().int("Quantity must be a whole number.").min(1, "Quantity must be at least 1.").max(1000, "Quantity cannot exceed 1,000."),
  location: z.string().trim().min(1, "Enter a location.").max(120, "Keep the location under 120 characters."),
  isActive: z.boolean().optional().default(true),
});

export const resourceUpdateSchema = resourceSchema.partial().refine(
  (values) => Object.keys(values).length > 0,
  "Include at least one field to update.",
);

export const resourceCategorySchema = z.object({ name: categoryName });

export function normalizeCategoryName(name: string) {
  return name.trim().toLocaleLowerCase("en-US");
}
