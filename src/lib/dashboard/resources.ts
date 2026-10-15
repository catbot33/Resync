import "server-only";

import { ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getAdminResources(organizationId: string) {
  const now = new Date();

  const [resources, categories] = await Promise.all([
    prisma.resource.findMany({
      where: { organizationId },
      // Stable ordering prevents rows from jumping when their active state changes.
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      include: {
        category: { select: { id: true, name: true } },
        reservations: {
          where: {
            status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
            startTime: { lte: now },
            endTime: { gt: now },
          },
          select: { id: true },
        },
      },
    }),
    prisma.resourceCategory.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { resources: true } } },
    }),
  ]);

  const items = resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    categoryId: resource.category?.id ?? null,
    categoryName: resource.category?.name ?? resource.type,
    quantity: resource.quantity,
    location: resource.location,
    isActive: resource.isActive,
    available: resource.isActive ? Math.max(resource.quantity - resource.reservations.length, 0) : 0,
  }));

  return {
    resources: items,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      resourceCount: category._count.resources,
    })),
    stats: {
      totalUnits: items.reduce((total, resource) => total + resource.quantity, 0),
      availableUnits: items.reduce((total, resource) => total + resource.available, 0),
      categoryTotal: categories.length,
      inactiveTotal: items.filter((resource) => !resource.isActive).length,
    },
  };
}
