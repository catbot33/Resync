import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { prisma } from "@/lib/prisma";
import { normalizeCategoryName, resourceCategorySchema } from "@/lib/resources/validation";

export async function POST(request: Request) {
  const context = await getAdminOrganization();
  if (!context.ok) {
    return Response.json({ message: context.error }, { status: context.status });
  }

  const parsed = resourceCategorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Enter a category name." }, { status: 400 });
  }

  const normalizedName = normalizeCategoryName(parsed.data.name);
  const existing = await prisma.resourceCategory.findUnique({
    where: { organizationId_normalizedName: { organizationId: context.organizationId, normalizedName } },
  });

  if (existing) {
    return Response.json({ message: "That category already exists." }, { status: 409 });
  }

  const category = await prisma.resourceCategory.create({
    data: { name: parsed.data.name, normalizedName, organizationId: context.organizationId },
  });

  return Response.json({ category }, { status: 201 });
}
