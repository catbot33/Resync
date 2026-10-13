import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ categoryId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const context = await getAdminOrganization();
  if (!context.ok) {
    return Response.json({ message: context.error }, { status: context.status });
  }

  const { categoryId } = await params;
  const category = await prisma.resourceCategory.findFirst({
    where: { id: categoryId, organizationId: context.organizationId },
    select: { id: true, _count: { select: { resources: true } } },
  });

  if (!category) {
    return Response.json({ message: "Category not found." }, { status: 404 });
  }

  if (category._count.resources > 0) {
    return Response.json({ message: "Move or delete its resources before removing this category." }, { status: 409 });
  }

  await prisma.resourceCategory.delete({ where: { id: category.id } });
  return new Response(null, { status: 204 });
}
