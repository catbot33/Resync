import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { ReservationTimeline } from "@/components/reservations/reservation-timeline";
import { UserRole } from "@/generated/prisma/client";
import { getReservationSchedule } from "@/lib/dashboard/reservations";
import { dateKeyInTimezone, isDateKey } from "@/lib/datetime/timezone";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Reservations | Resync",
  description: "View resource availability and manage organization reservations.",
};

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.role !== UserRole.ADMIN) redirect("/dashboard");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      organization: { select: { id: true, name: true, timezone: true } },
    },
  });
  if (!currentUser) redirect("/");
  if (!currentUser.organization) redirect("/onboarding");

  const query = await searchParams;
  const dateKey = isDateKey(query.date) ? query.date : dateKeyInTimezone(new Date(), currentUser.organization.timezone);
  const schedule = await getReservationSchedule({
    dateKey,
    organizationId: currentUser.organization.id,
    currentUserId: currentUser.id,
  });

  return (
    <AdminShell active="reservations" organizationName={currentUser.organization.name} title="Reservations" userName={currentUser.name ?? currentUser.username ?? "Administrator"}>
      <ReservationTimeline
        canManageAll
        currentUserId={currentUser.id}
        dateKey={dateKey}
        endHour={schedule.endHour}
        organizationId={currentUser.organization.id}
        people={schedule.people}
        resources={schedule.resources}
        shifts={schedule.shifts}
        startHour={schedule.startHour}
        timezone={schedule.timezone}
      />
    </AdminShell>
  );
}
