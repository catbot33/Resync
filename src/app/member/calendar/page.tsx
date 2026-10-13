import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReservationCalendar } from "@/components/calendar/reservation-calendar";
import { MemberShell } from "@/components/member/member-shell";
import { getMemberWorkspace } from "@/lib/auth/member-workspace";
import { type CalendarView, getCalendarSchedule } from "@/lib/dashboard/calendar";
import { dateKeyInTimezone, isDateKey } from "@/lib/datetime/timezone";

export const metadata: Metadata = { title: "Calendar | Resync", description: "View your reservations and organization resource availability." };
function isCalendarView(value: string | undefined): value is CalendarView { return value === "day" || value === "week" || value === "month"; }

export default async function MemberCalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  const context = await getMemberWorkspace();
  if (!context.ok) redirect(context.destination);
  const query = await searchParams;
  const dateKey = isDateKey(query.date) ? query.date : dateKeyInTimezone(new Date(), context.organization.timezone);
  const view = isCalendarView(query.view) ? query.view : "month";
  const schedule = await getCalendarSchedule({ dateKey, currentUserId: context.user.id, organizationId: context.organization.id, view });
  return <MemberShell active="calendar" organizationName={context.organization.name} title="Calendar" userName={context.user.name ?? context.user.username ?? "Member"}><ReservationCalendar basePath="/member/calendar" dateKey={dateKey} memberMode reservations={schedule.reservations} resources={schedule.resources} timezone={schedule.timezone} view={view} /></MemberShell>;
}
