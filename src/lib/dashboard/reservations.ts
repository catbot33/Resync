import "server-only";

import { Prisma, ReservationStatus } from "@/generated/prisma/client";
import { addDaysToDateKey, zonedDateTimeToUtc } from "@/lib/datetime/timezone";
import { prisma } from "@/lib/prisma";

interface TimelineShift {
  name: string;
  start: string;
  end: string;
}

const defaultTimelineShifts: TimelineShift[] = [
  { name: "Working hours", start: "08:00", end: "20:00" },
];

function parseTimelineShifts(shifts: Prisma.JsonValue) {
  if (!Array.isArray(shifts) || shifts.length === 0) return defaultTimelineShifts;

  const parsed = shifts.flatMap((shift) => {
    if (!shift || typeof shift !== "object" || Array.isArray(shift)) return [];
    const name = "name" in shift && typeof shift.name === "string" ? shift.name : null;
    const start = "start" in shift && typeof shift.start === "string" ? shift.start : null;
    const end = "end" in shift && typeof shift.end === "string" ? shift.end : null;
    if (!name || !start || !end) return [];
    return [{ name, start, end }];
  });

  const shiftOrder = new Map([["Morning", 0], ["Evening", 1], ["Night", 2]]);
  return parsed.length > 0
    ? parsed.sort((first, second) => (shiftOrder.get(first.name) ?? 3) - (shiftOrder.get(second.name) ?? 3))
    : defaultTimelineShifts;
}

function getTimelineHours(shifts: TimelineShift[]) {
  const parsed = shifts.map((shift) => {
    const start = Number(shift.start.split(":")[0]);
    const rawEnd = Number(shift.end.split(":")[0]) + (Number(shift.end.split(":")[1]) > 0 ? 1 : 0);
    return { start, end: rawEnd <= start ? 24 : rawEnd };
  });
  const startHour = Math.max(0, Math.min(...parsed.map((shift) => shift.start)));
  const endHour = Math.min(24, Math.max(...parsed.map((shift) => shift.end)));
  return endHour - startHour >= 4 ? { startHour, endHour } : { startHour: 8, endHour: 20 };
}

export async function getReservationSchedule({
  dateKey,
  organizationId,
  currentUserId,
}: {
  dateKey: string;
  organizationId: string;
  currentUserId: string;
}) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { timezone: true, shifts: true },
  });
  const startOfDay = zonedDateTimeToUtc(dateKey, "00:00", organization.timezone);
  const endOfDay = zonedDateTimeToUtc(addDaysToDateKey(dateKey, 1), "00:00", organization.timezone);
  const now = new Date();
  const shifts = parseTimelineShifts(organization.shifts);

  const [resources, reservations, people] = await Promise.all([
    prisma.resource.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        quantity: true,
        location: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.reservation.findMany({
      where: {
        organizationId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
        startTime: { lt: endOfDay },
        endTime: { gt: startOfDay },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        purpose: true,
        resourceUnit: true,
        startTime: true,
        endTime: true,
        status: true,
        resourceId: true,
        userId: true,
        user: { select: { name: true, username: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }, { username: "asc" }],
      select: { id: true, name: true, username: true, email: true, role: true },
    }),
  ]);

  const serializedReservations = reservations.map((reservation) => ({
    id: reservation.id,
    purpose: reservation.purpose ?? "Reserved",
    resourceUnit: reservation.resourceUnit,
    startTime: reservation.startTime.toISOString(),
    endTime: reservation.endTime.toISOString(),
    status: reservation.status,
    resourceId: reservation.resourceId,
    userId: reservation.userId,
    userName: reservation.user.name ?? reservation.user.username ?? reservation.user.email ?? "Member",
    isMine: reservation.userId === currentUserId,
  }));

  return {
    timezone: organization.timezone,
    shifts,
    ...getTimelineHours(shifts),
    resources: resources.map((resource) => ({
      id: resource.id,
      name: resource.name,
      categoryId: resource.category?.id ?? null,
      categoryName: resource.category?.name ?? resource.type,
      quantity: resource.quantity,
      location: resource.location,
      reservations: serializedReservations.filter((reservation) => reservation.resourceId === resource.id),
      reservedNow: serializedReservations.filter((reservation) =>
        reservation.resourceId === resource.id &&
        new Date(reservation.startTime) <= now &&
        new Date(reservation.endTime) > now
      ).length,
    })),
    people: people.map((person) => ({
      id: person.id,
      name: person.name ?? person.username ?? person.email ?? "Member",
      role: person.role,
    })),
  };
}
