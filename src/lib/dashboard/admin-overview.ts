import "server-only";

import { Prisma, ReservationStatus, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type OverviewActivity = {
  id: string;
  kind: "member" | "resource" | "reservation";
  title: string;
  detail: string;
  occurredAt: Date;
};

export async function getAdminOverview(organizationId: string) {
  const now = new Date();
  const liveReservationWhere: Prisma.ReservationWhereInput = {
    organizationId,
    status: ReservationStatus.CONFIRMED,
    startTime: { lte: now },
    endTime: { gt: now },
  };
  const upcomingReservationWhere: Prisma.ReservationWhereInput = {
    organizationId,
    status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
    startTime: { gt: now },
  };

  // Every value is queried from Neon at request time; no dashboard metric is fabricated.
  const [
    employeeTotal,
    activeEmployeeTotal,
    resourceTotals,
    activeReservationTotal,
    upcomingReservationTotal,
    resourceAvailability,
    upcomingReservations,
    recentMembers,
    recentResources,
    recentReservations,
  ] = await Promise.all([
    prisma.user.count({ where: { organizationId, role: UserRole.MEMBER } }),
    prisma.user.count({ where: { organizationId, role: UserRole.MEMBER, isActive: true } }),
    prisma.resource.aggregate({
      where: { organizationId },
      _sum: { quantity: true },
      _count: { id: true },
    }),
    prisma.reservation.count({ where: liveReservationWhere }),
    prisma.reservation.count({ where: upcomingReservationWhere }),
    prisma.resource.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        quantity: true,
        reservations: {
          where: liveReservationWhere,
          select: { id: true },
        },
      },
    }),
    prisma.reservation.findMany({
      where: upcomingReservationWhere,
      orderBy: { startTime: "asc" },
      take: 10,
      select: {
        id: true,
        purpose: true,
        startTime: true,
        endTime: true,
        status: true,
        resource: { select: { name: true } },
        user: { select: { name: true, username: true } },
      },
    }),
    prisma.user.findMany({
      where: { organizationId, role: UserRole.MEMBER },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, username: true, createdAt: true },
    }),
    prisma.resource.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, type: true, createdAt: true },
    }),
    prisma.reservation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        createdAt: true,
        status: true,
        resource: { select: { name: true } },
        user: { select: { name: true, username: true } },
      },
    }),
  ]);

  const resources = resourceAvailability.map((resource) => {
    const reservedNow = resource.reservations.length;

    return {
      id: resource.id,
      name: resource.name,
      type: resource.type,
      location: resource.location,
      quantity: resource.quantity,
      available: Math.max(resource.quantity - reservedNow, 0),
    };
  });

  const activities: OverviewActivity[] = [
    ...recentMembers.map((member) => ({
      id: `member-${member.id}`,
      kind: "member" as const,
      title: "Member added",
      detail: member.name ?? member.username ?? "Unnamed member",
      occurredAt: member.createdAt,
    })),
    ...recentResources.map((resource) => ({
      id: `resource-${resource.id}`,
      kind: "resource" as const,
      title: "Resource added",
      detail: `${resource.name} · ${resource.type}`,
      occurredAt: resource.createdAt,
    })),
    ...recentReservations.map((reservation) => ({
      id: `reservation-${reservation.id}`,
      kind: "reservation" as const,
      title: "Reservation created",
      detail: `${reservation.user.name ?? reservation.user.username ?? "Member"} · ${reservation.resource.name}`,
      occurredAt: reservation.createdAt,
    })),
  ]
    .sort((first, second) => second.occurredAt.getTime() - first.occurredAt.getTime())
    .slice(0, 6);

  return {
    now,
    employeeTotal,
    activeEmployeeTotal,
    resourceTotal: resourceTotals._sum.quantity ?? 0,
    resourceRecordTotal: resourceTotals._count.id,
    availableResourceTotal: resources.reduce((total, resource) => total + resource.available, 0),
    activeReservationTotal,
    upcomingReservationTotal,
    resources,
    upcomingReservations,
    activities,
  };
}
