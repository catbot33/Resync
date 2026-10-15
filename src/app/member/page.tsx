import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberShell } from "@/components/member/member-shell";
import { ReservationTimeline } from "@/components/reservations/reservation-timeline";
import { getMemberWorkspace } from "@/lib/auth/member-workspace";
import { getReservationSchedule } from "@/lib/dashboard/reservations";
import { dateKeyInTimezone, isDateKey } from "@/lib/datetime/timezone";

export const metadata: Metadata = { title: "Reservations | Resync", description: "View organization availability and reserve shared resources." };

export default async function MemberReservationsTimelinePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const context = await getMemberWorkspace();
  if (!context.ok) redirect(context.destination);

  const query = await searchParams;
  const dateKey = isDateKey(query.date) ? query.date : dateKeyInTimezone(new Date(), context.organization.timezone);
  const schedule = await getReservationSchedule({
    dateKey,
    organizationId: context.organization.id,
    currentUserId: context.user.id,
  });
  const userName = context.user.name ?? context.user.username ?? "Member";

  return (
    <MemberShell active="booking" organizationName={context.organization.name} title="Reservations" userName={userName}>
      <ReservationTimeline
        basePath="/member"
        canManageAll={false}
        currentUserId={context.user.id}
        dateKey={dateKey}
        endHour={schedule.endHour}
        organizationId={context.organization.id}
        people={schedule.people}
        resources={schedule.resources}
        shifts={schedule.shifts}
        startHour={schedule.startHour}
        timezone={schedule.timezone}
      />
    </MemberShell>
  );
}
