import "server-only";

import { ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getMemberDashboard(organizationId: string, userId: string) {
  const now = new Date();
  const [active, upcomingTotal, upcoming, recent, availableResources] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId, organizationId, status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }, startTime: { lte: now }, endTime: { gt: now } },
      orderBy: { endTime: "asc" },
      select: { id: true, purpose: true, startTime: true, endTime: true, resource: { select: { name: true, location: true } } },
    }),
    prisma.reservation.count({
      where: { userId, organizationId, status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }, startTime: { gt: now } },
    }),
    prisma.reservation.findMany({
      where: { userId, organizationId, status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }, startTime: { gt: now } },
      orderBy: { startTime: "asc" },
      take: 5,
      select: { id: true, purpose: true, startTime: true, endTime: true, resource: { select: { name: true, location: true } } },
    }),
    prisma.reservation.findMany({
      where: { userId, organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      distinct: ["resourceId"],
      select: { id: true, createdAt: true, resource: { select: { id: true, name: true, type: true, location: true } } },
    }),
    prisma.resource.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        quantity: true,
        reservations: {
          where: { status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }, startTime: { lte: now }, endTime: { gt: now } },
          select: { id: true },
        },
      },
    }),
  ]);

  const availableNow = availableResources.reduce((total, resource) => total + Math.max(resource.quantity - resource.reservations.length, 0), 0);
  return {
    active: active.map(serializeReservation),
    upcoming: upcoming.map(serializeReservation),
    upcomingTotal,
    recentResources: recent.map((item) => ({ ...item.resource, bookedAt: item.createdAt.toISOString() })),
    availableNow,
  };
}

function serializeReservation(reservation: { id: string; purpose: string | null; startTime: Date; endTime: Date; resource: { name: string; location: string } }) {
  return { ...reservation, purpose: reservation.purpose ?? "Reserved", startTime: reservation.startTime.toISOString(), endTime: reservation.endTime.toISOString() };
}

export async function getMemberResources(organizationId: string) {
  const now = new Date();
  const resources = await prisma.resource.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      quantity: true,
      location: true,
      category: { select: { id: true, name: true } },
      reservations: {
        where: { status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }, startTime: { lte: now }, endTime: { gt: now } },
        select: { id: true },
      },
    },
  });

  return resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    categoryId: resource.category?.id ?? null,
    categoryName: resource.category?.name ?? resource.type,
    quantity: resource.quantity,
    location: resource.location,
    available: Math.max(resource.quantity - resource.reservations.length, 0),
  }));
}

export async function getMemberReservations(organizationId: string, userId: string) {
  const now = new Date();
  const reservations = await prisma.reservation.findMany({
    where: { organizationId, userId },
    orderBy: { startTime: "desc" },
    select: {
      id: true,
      purpose: true,
      attendeeCount: true,
      startTime: true,
      endTime: true,
      status: true,
      resourceId: true,
      resource: { select: { name: true, location: true, quantity: true, isActive: true } },
    },
  });

  return reservations.map((reservation) => {
    const state = reservation.status === ReservationStatus.CANCELLED
      ? "cancelled" as const
      : reservation.status === ReservationStatus.COMPLETED || reservation.endTime <= now
        ? "completed" as const
        : reservation.startTime <= now
          ? "active" as const
          : "upcoming" as const;
    return {
      ...reservation,
      purpose: reservation.purpose ?? "Reserved",
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
      state,
    };
  });
}
