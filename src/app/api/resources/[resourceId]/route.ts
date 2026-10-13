import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { prisma } from "@/lib/prisma";
import { normalizeCategoryName, resourceUpdateSchema } from "@/lib/resources/validation";

interface RouteContext {
  params: Promise<{ resourceId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
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

  const parsed = resourceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the resource details." }, { status: 400 });
  }

  const { resourceId } = await params;
  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, organizationId: context.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return Response.json({ message: "Resource not found." }, { status: 404 });
  }

  try {
    let category: { id: string; name: string } | undefined;

    if (parsed.data.categoryName) {
      category = await prisma.resourceCategory.upsert({
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
        select: { id: true, name: true },
      });
    }

    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        location: parsed.data.location,
        isActive: parsed.data.isActive,
        ...(category ? { type: category.name, categoryId: category.id } : {}),
      },
    });

    return Response.json({ resource });
  } catch (error) {
    console.error("Resource update failed", error);
    return Response.json({ message: "We could not update the resource." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const context = await getAdminOrganization();
  if (!context.ok) {
    return Response.json({ message: context.error }, { status: context.status });
  }

  const { resourceId } = await params;
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, organizationId: context.organizationId },
    select: { id: true, _count: { select: { reservations: true } } },
  });

  if (!resource) {
    return Response.json({ message: "Resource not found." }, { status: 404 });
  }

  if (resource._count.reservations > 0) {
    return Response.json({ message: "This resource has reservation history. Deactivate it instead." }, { status: 409 });
  }

  await prisma.resource.delete({ where: { id: resource.id } });
  return new Response(null, { status: 204 });
}
