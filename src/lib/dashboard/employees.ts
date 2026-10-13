import "server-only";

import { ReservationStatus, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getAdminEmployees(organizationId: string) {
  const now = new Date();
  const employees = await prisma.user.findMany({
    where: { organizationId, role: UserRole.MEMBER },
    orderBy: [{ isActive: "desc" }, { name: "asc" }, { username: "asc" }],
    include: {
      reservations: {
        orderBy: { startTime: "desc" },
        take: 20,
        select: {
          id: true,
          purpose: true,
          startTime: true,
          endTime: true,
          status: true,
          resource: { select: { name: true, location: true } },
        },
      },
      _count: { select: { reservations: true } },
    },
  });

  const items = employees.map((employee) => {
    const upcomingCount = employee.reservations.filter((reservation) =>
      reservation.startTime > now &&
      (reservation.status === ReservationStatus.CONFIRMED || reservation.status === ReservationStatus.PENDING)
    ).length;

    return {
      id: employee.id,
      name: employee.name ?? employee.username ?? "Member",
      username: employee.username ?? "",
      isActive: employee.isActive,
      createdAt: employee.createdAt.toISOString(),
      reservationCount: employee._count.reservations,
      upcomingCount,
      reservations: employee.reservations.map((reservation) => ({
        ...reservation,
        startTime: reservation.startTime.toISOString(),
        endTime: reservation.endTime.toISOString(),
      })),
    };
  });

  return {
    employees: items,
    stats: {
      total: items.length,
      active: items.filter((employee) => employee.isActive).length,
      withUpcoming: items.filter((employee) => employee.upcomingCount > 0).length,
      inactive: items.filter((employee) => !employee.isActive).length,
    },
  };
}
