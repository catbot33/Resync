import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { prisma } from "@/lib/prisma";
import { normalizeCategoryName, resourceSchema } from "@/lib/resources/validation";

export async function POST(request: Request) {
  const context = await getAdminOrganization();

  if (!context.ok) {
    return Response.json({ message: context.error }, { status: context.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = resourceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the resource details." }, { status: 400 });
  }

  try {
    const category = await prisma.resourceCategory.upsert({
      where: {
        organizationId_normalizedName: {
          organizationId: context.organizationId,
          normalizedName: normalizeCategoryName(parsed.data.categoryName),
        },
      },
      update: {},
      create: {
        name: parsed.data.categoryName,
        normalizedName: normalizeCategoryName(parsed.data.categoryName),
        organizationId: context.organizationId,
      },
    });

    const resource = await prisma.resource.create({
      data: {
        name: parsed.data.name,
        type: category.name,
        categoryId: category.id,
        quantity: parsed.data.quantity,
        location: parsed.data.location,
        isActive: parsed.data.isActive,
        organizationId: context.organizationId,
      },
    });

    return Response.json({ resource }, { status: 201 });
  } catch (error) {
    console.error("Resource creation failed", error);
    return Response.json({ message: "We could not add the resource." }, { status: 500 });
  }
}
