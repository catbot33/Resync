"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { CalendarView } from "@/lib/dashboard/calendar";
import { addDaysToDateKey, startOfWeekDateKey } from "@/lib/datetime/timezone";

interface CalendarResource {
  id: string;
  name: string;
  location: string;
  quantity: number;
  categoryName: string;
}

interface CalendarReservation {
  id: string;
  purpose: string;
  attendeeCount: number;
  startTime: string;
  endTime: string;
  status: string;
  resourceId: string;
  resourceName: string;
  resourceLocation: string;
  resourceQuantity: number;
  userName: string;
  isMine: boolean;
}

interface ReservationCalendarProps {
  dateKey: string;
  reservations: CalendarReservation[];
  resources: CalendarResource[];
  timezone: string;
  view: CalendarView;
  basePath?: string;
  memberMode?: boolean;
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toUtcDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatDateKey(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(toUtcDate(dateKey));
}

function dateKeyFromInstant(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function moveByMonth(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + amount, 1));
  const daysInTargetMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, daysInTargetMonth));
  return target.toISOString().slice(0, 10);
}

function BookingCard({
  compact = false,
  reservation,
  timezone,
  onSelect,
  memberMode = false,
}: {
  compact?: boolean;
  reservation: CalendarReservation;
  timezone: string;
  onSelect: (reservation: CalendarReservation) => void;
  memberMode?: boolean;
}) {
  const privateBooking = memberMode && !reservation.isMine;
  return (
    <button
      className="w-full rounded-xl border border-[#343941] bg-[#202329] px-3 py-2 text-left transition hover:border-[#555b65] hover:bg-[#252930]"
      disabled={privateBooking}
      onClick={() => onSelect(reservation)}
      type="button"
    >
      <span className="block truncate text-xs font-semibold text-zinc-100">{privateBooking ? "Unavailable" : reservation.purpose}</span>
      <span className={`mt-1 block truncate text-[11px] text-zinc-500 ${compact ? "" : "sm:text-xs"}`}>
        {formatTime(reservation.startTime, timezone)}–{formatTime(reservation.endTime, timezone)}
        {!compact && ` · ${reservation.resourceName}`}
      </span>
    </button>
  );
}

export function ReservationCalendar({ basePath = "/dashboard/calendar", dateKey, memberMode = false, reservations, resources, timezone, view }: ReservationCalendarProps) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState<CalendarReservation | null>(null);

  const filteredReservations = useMemo(
    () => reservations.filter((reservation) => resourceId === "all" || reservation.resourceId === resourceId),
    [reservations, resourceId],
  );

  const reservationsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarReservation[]>();
    filteredReservations.forEach((reservation) => {
      const key = dateKeyFromInstant(reservation.startTime, timezone);
      grouped.set(key, [...(grouped.get(key) ?? []), reservation]);
    });
    return grouped;
  }, [filteredReservations, timezone]);

  function navigate(nextDate: string, nextView: CalendarView = view) {
    router.push(`${basePath}?date=${nextDate}&view=${nextView}`);
  }

  function move(direction: -1 | 1) {
    if (view === "month") return navigate(moveByMonth(dateKey, direction));
    navigate(addDaysToDateKey(dateKey, direction * (view === "week" ? 7 : 1)));
  }

  const todayKey = dateKeyFromInstant(new Date().toISOString(), timezone);
  const weekStart = startOfWeekDateKey(dateKey);
  const periodTitle = view === "month"
    ? formatDateKey(dateKey, { month: "long", year: "numeric" })
    : view === "week"
      ? `${formatDateKey(weekStart, { month: "short", day: "numeric" })} – ${formatDateKey(addDaysToDateKey(weekStart, 6), { month: "short", day: "numeric", year: "numeric" })}`
      : formatDateKey(dateKey, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="pt-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Resource schedule</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-zinc-100 sm:text-2xl">{periodTitle}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-[#2e3238] bg-[#111315] p-1">
            {(["day", "week", "month"] as CalendarView[]).map((item) => (
              <button
                className={`rounded-lg px-4 py-2 text-xs font-medium capitalize transition ${item === view ? "bg-[#2b2f35] text-white" : "text-zinc-500 hover:text-zinc-200"}`}
                key={item}
                onClick={() => navigate(dateKey, item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <button className="rounded-xl border border-[#2e3238] bg-[#111315] px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-[#181a1d]" onClick={() => navigate(todayKey)} type="button">
            Today
          </button>
          <div className="flex items-center rounded-xl border border-[#2e3238] bg-[#111315] p-1">
            <button aria-label="Previous period" className="grid size-9 place-items-center rounded-lg text-zinc-400 hover:bg-[#24272b] hover:text-white" onClick={() => move(-1)} type="button">
              <ArrowLeft className="size-4" />
            </button>
            <input
              aria-label="Choose date"
              className="h-9 w-[136px] bg-transparent px-2 text-xs text-zinc-300 outline-none [color-scheme:dark]"
              onChange={(event) => event.target.value && navigate(event.target.value)}
              type="date"
              value={dateKey}
            />
            <button aria-label="Next period" className="grid size-9 place-items-center rounded-lg text-zinc-400 hover:bg-[#24272b] hover:text-white" onClick={() => move(1)} type="button">
              <ArrowRight className="size-4" />
            </button>
          </div>
          <Link className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-white" href={memberMode ? "/member/reservations" : `/dashboard/reservations?date=${dateKey}`}>
            <Plus className="size-4" /> New booking
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-y border-[#202326] py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <CalendarDays className="size-4" />
          <span>{filteredReservations.length} {filteredReservations.length === 1 ? "booking" : "bookings"} in this view</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <SlidersHorizontal className="size-4" />
          <select
            className="h-10 min-w-48 rounded-xl border border-[#2e3238] bg-[#111315] px-3 text-xs text-zinc-200 outline-none focus:border-zinc-500"
            onChange={(event) => setResourceId(event.target.value)}
            value={resourceId}
          >
            <option value="all">All resources</option>
            {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
          </select>
        </label>
      </div>

      {resources.length === 0 ? (
        <EmptyCalendar title="No resources yet" message="Add a resource before creating a booking schedule." actionHref="/dashboard/resources" actionLabel="Add resource" />
      ) : view === "month" ? (
        <MonthView dateKey={dateKey} memberMode={memberMode} onSelect={setSelectedReservation} reservationsByDay={reservationsByDay} timezone={timezone} todayKey={todayKey} />
      ) : view === "week" ? (
        <WeekView memberMode={memberMode} onSelect={setSelectedReservation} reservationsByDay={reservationsByDay} timezone={timezone} todayKey={todayKey} weekStart={weekStart} />
      ) : (
        <DayView dateKey={dateKey} memberMode={memberMode} onSelect={setSelectedReservation} reservations={filteredReservations} resources={resources} timezone={timezone} />
      )}

      {selectedReservation && (
        <BookingDetails
          manageHref={memberMode ? `/member/reservations?date=${dateKey}` : `/dashboard/reservations?date=${dateKey}`}
          onClose={() => setSelectedReservation(null)}
          reservation={selectedReservation}
          timezone={timezone}
        />
      )}
    </section>
  );
}

function MonthView({ dateKey, memberMode, onSelect, reservationsByDay, timezone, todayKey }: {
  dateKey: string;
  onSelect: (reservation: CalendarReservation) => void;
  reservationsByDay: Map<string, CalendarReservation[]>;
  timezone: string;
  todayKey: string;
  memberMode: boolean;
}) {
  const monthStart = `${dateKey.slice(0, 7)}-01`;
  const start = startOfWeekDateKey(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => addDaysToDateKey(start, index));

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-[#2e3238] bg-[#111315]">
      <div className="min-w-[840px]">
        <div className="grid grid-cols-7 border-b border-[#2e3238] bg-[#15171a]">
          {weekdayLabels.map((label) => <div className="px-3 py-3 text-xs font-medium text-zinc-500" key={label}>{label}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayReservations = reservationsByDay.get(day) ?? [];
            const currentMonth = day.slice(0, 7) === dateKey.slice(0, 7);
            return (
              <div className={`min-h-36 border-b border-r border-[#25282d] p-2.5 ${index % 7 === 6 ? "border-r-0" : ""} ${index >= 35 ? "border-b-0" : ""} ${currentMonth ? "bg-[#111315]" : "bg-[#0e1012]"}`} key={day}>
                <div className={`grid size-7 place-items-center rounded-full text-xs ${day === todayKey ? "bg-zinc-100 font-semibold text-zinc-950" : currentMonth ? "text-zinc-300" : "text-zinc-700"}`}>
                  {Number(day.slice(-2))}
                </div>
                <div className="mt-2 space-y-1.5">
                  {dayReservations.slice(0, 2).map((reservation) => <BookingCard compact key={reservation.id} memberMode={memberMode} onSelect={onSelect} reservation={reservation} timezone={timezone} />)}
                  {dayReservations.length > 2 && <p className="px-2 text-[11px] text-zinc-500">+{dayReservations.length - 2} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekView({ memberMode, onSelect, reservationsByDay, timezone, todayKey, weekStart }: {
  onSelect: (reservation: CalendarReservation) => void;
  reservationsByDay: Map<string, CalendarReservation[]>;
  timezone: string;
  todayKey: string;
  weekStart: string;
  memberMode: boolean;
}) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {weekdayLabels.map((label, index) => {
        const day = addDaysToDateKey(weekStart, index);
        const dayReservations = reservationsByDay.get(day) ?? [];
        return (
          <article className="min-h-80 rounded-2xl border border-[#2e3238] bg-[#111315] p-3" key={day}>
            <div className="flex items-center justify-between border-b border-[#25282d] pb-3">
              <div>
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-200">{formatDateKey(day, { month: "short", day: "numeric" })}</p>
              </div>
              {day === todayKey && <span className="size-2 rounded-full bg-zinc-300" />}
            </div>
            <div className="mt-3 space-y-2">
              {dayReservations.map((reservation) => <BookingCard compact key={reservation.id} memberMode={memberMode} onSelect={onSelect} reservation={reservation} timezone={timezone} />)}
              {dayReservations.length === 0 && <p className="pt-3 text-center text-[11px] text-zinc-700">No bookings</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DayView({ dateKey, memberMode, onSelect, reservations, resources, timezone }: {
  dateKey: string;
  onSelect: (reservation: CalendarReservation) => void;
  reservations: CalendarReservation[];
  resources: CalendarResource[];
  timezone: string;
  memberMode: boolean;
}) {
  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
      <div className="rounded-2xl border border-[#2e3238] bg-[#111315] p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#25282d] pb-4">
          <h3 className="text-sm font-semibold text-zinc-100">Bookings</h3>
          <span className="text-xs text-zinc-600">{formatDateKey(dateKey, { month: "short", day: "numeric" })}</span>
        </div>
        <div className="mt-4 space-y-3">
          {reservations.map((reservation) => (
            <button className="flex w-full items-center gap-4 rounded-2xl border border-[#2e3238] bg-[#181a1d] p-4 text-left transition enabled:hover:border-[#555b65]" disabled={memberMode && !reservation.isMine} key={reservation.id} onClick={() => onSelect(reservation)} type="button">
              <div className="w-24 shrink-0 text-xs font-medium text-zinc-300">{formatTime(reservation.startTime, timezone)}</div>
              <div className="min-w-0 flex-1 border-l border-[#343941] pl-4">
                <p className="truncate text-sm font-semibold text-zinc-100">{memberMode && !reservation.isMine ? "Unavailable" : reservation.purpose}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{reservation.resourceName}{!memberMode || reservation.isMine ? ` · ${reservation.userName}` : ""}</p>
              </div>
              <span className="hidden text-xs text-zinc-600 sm:block">until {formatTime(reservation.endTime, timezone)}</span>
            </button>
          ))}
          {reservations.length === 0 && <div className="py-20 text-center text-sm text-zinc-600">No bookings for this day.</div>}
        </div>
      </div>

      <aside className="rounded-2xl border border-[#2e3238] bg-[#111315] p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Resource availability</h3>
        <p className="mt-1 text-xs text-zinc-600">{resources.length} active resources</p>
        <div className="mt-4 space-y-2">
          {resources.map((resource) => {
            const bookings = reservations.filter((reservation) => reservation.resourceId === resource.id);
            return (
              <div className="rounded-xl border border-[#292d32] bg-[#16181b] p-3" key={resource.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-200">{resource.name}</p>
                    <p className="mt-1 truncate text-[11px] text-zinc-600">{resource.location || resource.categoryName}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#24272b] px-2 py-1 text-[10px] text-zinc-400">{bookings.length} booked</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function BookingDetails({ manageHref, onClose, reservation, timezone }: {
  manageHref: string;
  onClose: () => void;
  reservation: CalendarReservation;
  timezone: string;
}) {
  const bookingDate = dateKeyFromInstant(reservation.startTime, timezone);
  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside aria-label="Booking details" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[#2e3238] bg-[#111315] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#2e3238] px-6 py-5">
          <div>
            <p className="text-xs text-zinc-600">Booking details</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{reservation.purpose}</h3>
          </div>
          <button aria-label="Close booking details" className="grid size-10 place-items-center rounded-xl border border-[#2e3238] text-zinc-500 hover:bg-[#24272b] hover:text-white" onClick={onClose} type="button">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          <DetailRow icon={CalendarDays} label="Date" value={formatDateKey(bookingDate, { weekday: "long", month: "long", day: "numeric" })} />
          <DetailRow icon={Clock3} label="Time" value={`${formatTime(reservation.startTime, timezone)} – ${formatTime(reservation.endTime, timezone)}`} />
          <DetailRow icon={CalendarDays} label="Resource" value={reservation.resourceName} />
          <DetailRow icon={MapPin} label="Location" value={reservation.resourceLocation || "No location set"} />
          <DetailRow icon={UsersRound} label="Reserved by" value={reservation.userName} />
          <DetailRow icon={UsersRound} label="Attendees" value={`${reservation.attendeeCount} of ${reservation.resourceQuantity}`} />
          <div className="mt-5 flex items-center justify-between rounded-xl border border-[#2e3238] bg-[#181a1d] p-4">
            <span className="text-xs text-zinc-500">Status</span>
            <span className="rounded-lg bg-[#292d32] px-2.5 py-1 text-[11px] font-medium capitalize text-zinc-300">{reservation.status.toLowerCase()}</span>
          </div>
        </div>

        <footer className="border-t border-[#2e3238] p-5">
          <Link className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-100 text-xs font-semibold text-zinc-950 hover:bg-white" href={manageHref}>
            Open day schedule
          </Link>
        </footer>
      </aside>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#292d32] bg-[#16181b] p-4">
      <Icon className="mt-0.5 size-4 text-zinc-600" />
      <div>
        <p className="text-[11px] text-zinc-600">{label}</p>
        <p className="mt-1 text-sm text-zinc-200">{value}</p>
      </div>
    </div>
  );
}

function EmptyCalendar({ actionHref, actionLabel, message, title }: { actionHref: string; actionLabel: string; message: string; title: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-[#343941] bg-[#111315] px-6 py-20 text-center">
      <CalendarDays className="mx-auto size-7 text-zinc-700" />
      <h3 className="mt-4 text-sm font-semibold text-zinc-200">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-zinc-600">{message}</p>
      <Link className="mt-5 inline-flex rounded-xl border border-[#343941] bg-[#181a1d] px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-[#24272b]" href={actionHref}>{actionLabel}</Link>
    </div>
  );
}
