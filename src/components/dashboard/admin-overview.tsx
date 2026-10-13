import {
  CalendarClock,
  CalendarRange,
  Clock3,
  History,
  PackageCheck,
  PackageOpen,
  UsersRound,
} from "lucide-react";

import { AdminNavigation } from "@/components/dashboard/admin-navigation";
import type { getAdminOverview } from "@/lib/dashboard/admin-overview";

type OverviewData = Awaited<ReturnType<typeof getAdminOverview>>;

interface AdminOverviewProps {
  data: OverviewData;
  organizationName: string;
  timezone: string;
  userName: string;
}

function formatInTimezone(date: Date, timezone: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: timezone }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

function formatActivityTime(date: Date, now: Date, timezone: string) {
  const sameDay = formatInTimezone(date, timezone, { dateStyle: "short" }) === formatInTimezone(now, timezone, { dateStyle: "short" });

  return sameDay
    ? formatInTimezone(date, timezone, { hour: "numeric", minute: "2-digit" })
    : formatInTimezone(date, timezone, { month: "short", day: "numeric" });
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-[#2e3238] bg-[#0f1113] px-6 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

export function AdminOverview({ data, organizationName, timezone, userName }: AdminOverviewProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const statCards = [
    {
      label: "Total employees",
      value: data.employeeTotal,
      detail: `${data.activeEmployeeTotal} active`,
      icon: UsersRound,
    },
    {
      label: "Total resources",
      value: data.resourceTotal,
      detail: `${data.resourceRecordTotal} resource ${data.resourceRecordTotal === 1 ? "type" : "types"}`,
      icon: PackageOpen,
    },
    {
      label: "Available now",
      value: data.availableResourceTotal,
      detail: "Across active resources",
      icon: PackageCheck,
    },
    {
      label: "Active reservations",
      value: data.activeReservationTotal,
      detail: "In progress now",
      icon: CalendarClock,
    },
    {
      label: "Upcoming",
      value: data.upcomingReservationTotal,
      detail: "Scheduled ahead",
      icon: CalendarRange,
    },
  ];

  return (
    <main className="dashboard-canvas min-h-screen bg-[#0b0c0d] pb-28 text-white lg:pb-10 lg:pl-[92px]">
      <AdminNavigation />

      <div className="mx-auto w-full max-w-[1540px] px-5 py-6 sm:px-8 lg:px-10 lg:py-9 xl:px-14">
        <header className="flex items-center justify-between gap-5 border-b border-[#202326] pb-6">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{organizationName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">Overview</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-200">{userName}</p>
              <p className="mt-0.5 text-xs text-zinc-600">Administrator</p>
            </div>
            <div aria-label={`Signed in as ${userName}`} className="grid size-11 place-items-center rounded-2xl border border-[#2e3238] bg-[#181a1d] text-xs font-semibold text-zinc-200">
              {initials || "A"}
            </div>
          </div>
        </header>

        <section className="mt-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-zinc-500">
              {formatInTimezone(data.now, timezone, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[32px]">Your workspace today</h2>
          </div>
          <p className="text-xs text-zinc-600">Times shown in {timezone.replaceAll("_", " ")}</p>
        </section>

        <section aria-label="Workspace totals" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map(({ detail, icon: Icon, label, value }) => (
            <article className="rounded-[22px] border border-[#24272b] bg-[#111315] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)]" key={label}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-zinc-400">{label}</p>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#2e3238] bg-[#181a1d] text-zinc-400">
                  <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </span>
              </div>
              <p className="mt-7 text-3xl font-semibold tracking-[-0.045em] text-white">{value.toLocaleString()}</p>
              <p className="mt-2 text-xs text-zinc-600">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-12">
          <article className="rounded-[26px] border border-[#24272b] bg-[#111315] p-5 sm:p-6 xl:col-span-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Resource availability</h3>
                <p className="mt-1 text-xs text-zinc-600">Free units right now</p>
              </div>
              <span className="rounded-full border border-[#2e3238] bg-[#181a1d] px-3 py-1.5 text-xs font-medium text-zinc-400">
                {data.availableResourceTotal} available
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {data.resources.length === 0 ? (
                <EmptyState>No resources added yet.</EmptyState>
              ) : (
                data.resources.slice(0, 6).map((resource) => {
                  const percentage = resource.quantity === 0 ? 0 : Math.round((resource.available / resource.quantity) * 100);

                  return (
                    <div className="rounded-2xl border border-[#24272b] bg-[#0f1113] p-4" key={resource.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-200">{resource.name}</p>
                          <p className="mt-1 truncate text-xs text-zinc-600">{resource.type} · {resource.location}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-white">{resource.available}/{resource.quantity}</p>
                      </div>
                      <div aria-label={`${percentage}% available`} className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#24272b]" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={percentage}>
                        <div className="h-full rounded-full bg-zinc-200" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className="rounded-[26px] border border-[#24272b] bg-[#111315] p-5 sm:p-6 xl:col-span-5">
            <div>
              <h3 className="text-base font-semibold text-white">Upcoming reservations</h3>
              <p className="mt-1 text-xs text-zinc-600">Next confirmed or pending bookings</p>
            </div>

            <div className="mt-5 space-y-3">
              {data.upcomingReservations.length === 0 ? (
                <EmptyState>No upcoming reservations.</EmptyState>
              ) : (
                data.upcomingReservations.map((reservation) => (
                  <div className="flex gap-4 rounded-2xl border border-[#24272b] bg-[#0f1113] p-4" key={reservation.id}>
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#2e3238] bg-[#181a1d] text-zinc-400">
                      <Clock3 aria-hidden="true" className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-medium text-zinc-200">{reservation.resource.name}</p>
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-zinc-600">{reservation.status.toLowerCase()}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-500">{reservation.user.name ?? reservation.user.username ?? "Member"}</p>
                      <p className="mt-2 text-xs text-zinc-400">
                        {formatInTimezone(reservation.startTime, timezone, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[26px] border border-[#24272b] bg-[#111315] p-5 sm:p-6 xl:col-span-12">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl border border-[#2e3238] bg-[#181a1d] text-zinc-400">
                <History aria-hidden="true" className="size-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">Recent activity</h3>
                <p className="mt-0.5 text-xs text-zinc-600">Latest organization changes</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.activities.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState>No activity yet.</EmptyState>
                </div>
              ) : (
                data.activities.map((activity) => (
                  <div className="flex items-center gap-4 rounded-2xl border border-[#24272b] bg-[#0f1113] p-4" key={activity.id}>
                    <span className="size-2 shrink-0 rounded-full bg-zinc-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-200">{activity.title}</p>
                      <p className="mt-1 truncate text-xs text-zinc-600">{activity.detail}</p>
                    </div>
                    <time className="shrink-0 text-xs text-zinc-600" dateTime={activity.occurredAt.toISOString()}>
                      {formatActivityTime(activity.occurredAt, data.now, timezone)}
                    </time>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
