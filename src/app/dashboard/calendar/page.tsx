import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ReservationCalendar } from "@/components/calendar/reservation-calendar";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { UserRole } from "@/generated/prisma/client";
import { type CalendarView, getCalendarSchedule } from "@/lib/dashboard/calendar";
import { dateKeyInTimezone, isDateKey } from "@/lib/datetime/timezone";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Calendar | Resync",
  description: "View daily, weekly, and monthly resource booking schedules.",
};

function isCalendarView(value: string | undefined): value is CalendarView {
  return value === "day" || value === "week" || value === "month";
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
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
  const view = isCalendarView(query.view) ? query.view : "month";
  const schedule = await getCalendarSchedule({ dateKey, organizationId: currentUser.organization.id, view });

  return (
    <AdminShell active="calendar" organizationName={currentUser.organization.name} title="Calendar" userName={currentUser.name ?? currentUser.username ?? "Administrator"}>
      <ReservationCalendar
        dateKey={dateKey}
        reservations={schedule.reservations}
        resources={schedule.resources}
        timezone={schedule.timezone}
        view={view}
      />
    </AdminShell>
  );
}
