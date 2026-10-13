import { ArrowRight, CalendarClock, Clock3, Compass, PackageOpen } from "lucide-react";
import Link from "next/link";

interface BookingSummary { id: string; purpose: string; startTime: string; endTime: string; resource: { name: string; location: string } }
interface RecentResource { id: string; name: string; type: string; location: string; bookedAt: string }

function formatDate(value: string, timezone: string, includeTime = true) {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "short", day: "numeric", ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}) }).format(new Date(value));
}

export function MemberOverview({ active, availableNow, recentResources, timezone, upcoming, upcomingTotal, userName }: { active: BookingSummary[]; availableNow: number; recentResources: RecentResource[]; timezone: string; upcoming: BookingSummary[]; upcomingTotal: number; userName: string }) {
  return (
    <>
      <section className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-zinc-500">Welcome back, {userName}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[32px]">Your reservation workspace</h2></div>
        <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200" href="/member/resources"><Compass className="size-4" /> Find a resource</Link>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active bookings", value: active.length, detail: "In progress now", icon: Clock3 },
          { label: "Upcoming", value: upcomingTotal, detail: "Next reservations", icon: CalendarClock },
          { label: "Available now", value: availableNow, detail: "Resource units", icon: PackageOpen },
        ].map(({ detail, icon: Icon, label, value }) => <article className="rounded-[22px] border border-[#24272b] bg-[#111315] p-5" key={label}><div className="flex items-start justify-between"><p className="text-sm text-zinc-400">{label}</p><span className="grid size-9 place-items-center rounded-xl border border-[#2e3238] bg-[#181a1d] text-zinc-500"><Icon className="size-4" /></span></div><p className="mt-6 text-3xl font-semibold tracking-[-0.045em]">{value}</p><p className="mt-2 text-xs text-zinc-600">{detail}</p></article>)}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <article className="rounded-[26px] border border-[#24272b] bg-[#111315] p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-white">Coming up</h3><p className="mt-1 text-xs text-zinc-600">Your next reservations</p></div><Link className="text-xs text-zinc-400 hover:text-white" href="/member/reservations">View all</Link></div>
          <div className="mt-5 space-y-2">
            {upcoming.map((booking) => <div className="flex items-center gap-4 rounded-2xl border border-[#292d32] bg-[#181a1d] p-4" key={booking.id}><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#343941] text-zinc-500"><CalendarClock className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-200">{booking.resource.name}</p><p className="mt-1 truncate text-xs text-zinc-600">{booking.purpose} · {booking.resource.location}</p></div><p className="shrink-0 text-xs text-zinc-500">{formatDate(booking.startTime, timezone)}</p></div>)}
            {upcoming.length === 0 && <Empty text="No upcoming reservations." />}
          </div>
        </article>

        <article className="rounded-[26px] border border-[#24272b] bg-[#111315] p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white">Recently booked</h3><p className="mt-1 text-xs text-zinc-600">Resources you used recently</p>
          <div className="mt-5 space-y-2">{recentResources.map((resource) => <Link className="flex items-center justify-between rounded-xl border border-[#292d32] bg-[#181a1d] px-4 py-3 hover:border-[#484e57]" href="/member/resources" key={resource.id}><div className="min-w-0"><p className="truncate text-sm text-zinc-200">{resource.name}</p><p className="mt-1 truncate text-[11px] text-zinc-600">{resource.type} · {resource.location}</p></div><ArrowRight className="size-4 text-zinc-600" /></Link>)}{recentResources.length === 0 && <Empty text="Your recent resources will appear here." />}</div>
        </article>
      </section>
    </>
  );
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[#30343a] px-5 py-10 text-center text-sm text-zinc-600">{text}</div>; }
