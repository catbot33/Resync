import "server-only";

import { ReservationStatus } from "@/generated/prisma/client";
import {
  addDaysToDateKey,
  startOfMonthGridDateKey,
  startOfWeekDateKey,
  zonedDateTimeToUtc,
} from "@/lib/datetime/timezone";
import { prisma } from "@/lib/prisma";

export type CalendarView = "day" | "week" | "month";

function getDateRange(dateKey: string, view: CalendarView) {
  if (view === "day") return { start: dateKey, end: addDaysToDateKey(dateKey, 1) };
  if (view === "week") {
    const start = startOfWeekDateKey(dateKey);
    return { start, end: addDaysToDateKey(start, 7) };
  }

  // Month views always render six full Monday-to-Sunday rows.
  const start = startOfMonthGridDateKey(dateKey);
  return { start, end: addDaysToDateKey(start, 42) };
}

export async function getCalendarSchedule({
  dateKey,
  currentUserId,
  organizationId,
  view,
}: {
  dateKey: string;
  currentUserId?: string;
  organizationId: string;
  view: CalendarView;
}) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { timezone: true },
  });
  const range = getDateRange(dateKey, view);
  const rangeStart = zonedDateTimeToUtc(range.start, "00:00", organization.timezone);
  const rangeEnd = zonedDateTimeToUtc(range.end, "00:00", organization.timezone);

  const [resources, reservations] = await Promise.all([
    prisma.resource.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        location: true,
        quantity: true,
        category: { select: { name: true } },
        type: true,
      },
    }),
    prisma.reservation.findMany({
      where: {
        organizationId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        purpose: true,
        attendeeCount: true,
        startTime: true,
        endTime: true,
        status: true,
        resourceId: true,
        userId: true,
        resource: { select: { name: true, location: true, quantity: true } },
        user: { select: { name: true, username: true, email: true } },
      },
    }),
  ]);

  return {
    timezone: organization.timezone,
    rangeStart: range.start,
    resources: resources.map((resource) => ({
      id: resource.id,
      name: resource.name,
      location: resource.location,
      quantity: resource.quantity,
      categoryName: resource.category?.name ?? resource.type,
    })),
    reservations: reservations.map((reservation) => ({
      id: reservation.id,
      purpose: reservation.purpose ?? "Reserved",
      attendeeCount: reservation.attendeeCount,
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
      status: reservation.status,
      resourceId: reservation.resourceId,
      resourceName: reservation.resource.name,
      resourceLocation: reservation.resource.location,
      resourceQuantity: reservation.resource.quantity,
      userName: reservation.user.name ?? reservation.user.username ?? reservation.user.email ?? "Member",
      isMine: reservation.userId === currentUserId,
    })),
  };
}
