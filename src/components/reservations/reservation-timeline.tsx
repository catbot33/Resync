"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  PackageOpen,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { addDaysToDateKey, dateKeyInTimezone, zonedDateTimeToUtc } from "@/lib/datetime/timezone";

interface TimelineReservation {
  id: string;
  purpose: string;
  attendeeCount: number;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  resourceId: string;
  userId: string;
  userName: string;
  isMine: boolean;
}

interface TimelineResource {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  location: string;
  reservedNow: number;
  reservations: TimelineReservation[];
}

interface BookingPerson {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
}

interface ReservationTimelineProps {
  canManageAll: boolean;
  currentUserId: string;
  dateKey: string;
  endHour: number;
  people: BookingPerson[];
  resources: TimelineResource[];
  startHour: number;
  timezone: string;
}

interface BookingDraft {
  resourceId: string;
  userId: string;
  date: string;
  start: string;
  end: string;
  purpose: string;
  attendeeCount: number;
}

const hourWidth = 88;
const resourceColumnWidth = 220;

function minutesFromMidnight(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(value: number) {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeInTimezone(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function layoutReservations(reservations: TimelineReservation[]) {
  const laneEnds: number[] = [];
  const entries = [...reservations]
    .sort((first, second) => new Date(first.startTime).getTime() - new Date(second.startTime).getTime())
    .map((reservation) => {
      const start = new Date(reservation.startTime).getTime();
      const end = new Date(reservation.endTime).getTime();
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      return { reservation, lane };
    });

  return { entries, laneCount: Math.max(laneEnds.length, 1) };
}

export function ReservationTimeline({
  canManageAll,
  currentUserId,
  dateKey,
  endHour,
  people,
  resources,
  startHour,
  timezone,
}: ReservationTimelineProps) {
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [editing, setEditing] = useState<TimelineReservation | "new" | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const hours = useMemo(() => Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index), [endHour, startHour]);
  const timeOptions = useMemo(() => Array.from({ length: (endHour - startHour) * 2 + 1 }, (_, index) => timeFromMinutes(startHour * 60 + index * 30)), [endHour, startHour]);
  const categories = useMemo(() => Array.from(new Map(resources.map((resource) => [resource.categoryId ?? resource.categoryName, resource.categoryName]))), [resources]);
  const filteredResources = useMemo(() => resources.filter((resource) => {
    const matchesCategory = category === "all" || (resource.categoryId ?? resource.categoryName) === category;
    const matchesAvailability = !freeOnly || resource.reservedNow < resource.quantity;
    return matchesCategory && matchesAvailability;
  }), [category, freeOnly, resources]);
  const totalUnits = resources.reduce((total, resource) => total + resource.quantity, 0);
  const availableUnits = resources.reduce((total, resource) => total + Math.max(resource.quantity - resource.reservedNow, 0), 0);
  const timelineWidth = (endHour - startHour) * hourWidth;

  function initialTimes() {
    const now = new Date();
    const isToday = dateKeyInTimezone(now, timezone) === dateKey;
    const localTime = isToday ? timeInTimezone(now.toISOString(), timezone) : `${startHour.toString().padStart(2, "0")}:00`;
    const rounded = Math.ceil(minutesFromMidnight(localTime) / 30) * 30;
    const start = Math.min(Math.max(rounded, startHour * 60), endHour * 60 - 30);
    return { start: timeFromMinutes(start), end: timeFromMinutes(Math.min(start + 60, endHour * 60)) };
  }

  function openNew(resourceId = filteredResources[0]?.id ?? resources[0]?.id ?? "", start?: string) {
    const times = initialTimes();
    const selectedStart = start ?? times.start;
    const selectedEnd = timeFromMinutes(Math.min(minutesFromMidnight(selectedStart) + 60, endHour * 60));
    setEditing("new");
    setDraft({
      resourceId,
      userId: currentUserId,
      date: dateKey,
      start: selectedStart,
      end: selectedEnd,
      purpose: "",
      attendeeCount: 1,
    });
    setError("");
    setConfirmCancel(false);
  }

  function openExisting(reservation: TimelineReservation) {
    if (!canManageAll && !reservation.isMine) return;
    setEditing(reservation);
    setDraft({
      resourceId: reservation.resourceId,
      userId: reservation.userId,
      date: dateKeyInTimezone(new Date(reservation.startTime), timezone),
      start: timeInTimezone(reservation.startTime, timezone),
      end: timeInTimezone(reservation.endTime, timezone),
      purpose: reservation.purpose === "Reserved" ? "" : reservation.purpose,
      attendeeCount: reservation.attendeeCount,
    });
    setError("");
    setConfirmCancel(false);
  }

  function selectTimelineSlot(event: React.MouseEvent<HTMLDivElement>, resourceId: string) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const minutes = startHour * 60 + Math.round(((event.clientX - bounds.left) / bounds.width) * (endHour - startHour) * 2) * 30;
    const clamped = Math.min(Math.max(minutes, startHour * 60), endHour * 60 - 30);
    openNew(resourceId, timeFromMinutes(clamped));
  }

  const availability = useMemo(() => {
    if (!draft) return { available: false, message: "Choose a resource and time." };
    const resource = resources.find((item) => item.id === draft.resourceId);
    if (!resource) return { available: false, message: "Choose a resource." };
    if (draft.date !== dateKey) return { available: true, message: "Availability will be verified when you save." };
    const start = zonedDateTimeToUtc(draft.date, draft.start, timezone);
    const end = zonedDateTimeToUtc(draft.date, draft.end, timezone);
    if (start >= end) return { available: false, message: "End time must be after the start." };
    const overlapping = resource.reservations.filter((reservation) =>
      reservation.id !== (editing === "new" ? "" : editing?.id) &&
      new Date(reservation.startTime) < end &&
      new Date(reservation.endTime) > start
    ).length;
    const free = Math.max(resource.quantity - overlapping, 0);
    return free > 0
      ? { available: true, message: `${resource.name} has ${free} ${free === 1 ? "unit" : "units"} available.` }
      : { available: false, message: `${resource.name} is fully reserved for this time.` };
  }, [dateKey, draft, editing, resources, timezone]);

  async function saveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !editing || !availability.available) return;
    setBusy(true);
    setError("");

    const endpoint = editing === "new" ? "/api/reservations" : `/api/reservations/${editing.id}`;
    try {
      const response = await fetch(endpoint, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: draft.resourceId,
          userId: canManageAll ? draft.userId : currentUserId,
          startTime: zonedDateTimeToUtc(draft.date, draft.start, timezone).toISOString(),
          endTime: zonedDateTimeToUtc(draft.date, draft.end, timezone).toISOString(),
          purpose: draft.purpose,
          attendeeCount: draft.attendeeCount,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not save the reservation.");
      setEditing(null);
      setDraft(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not save the reservation.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking() {
    if (!editing || editing === "new") return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/reservations/${editing.id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not cancel the reservation.");
      setEditing(null);
      setDraft(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not cancel the reservation.");
    } finally {
      setBusy(false);
    }
  }

  function navigateDate(nextDate: string) {
    router.push(`/dashboard/reservations?date=${nextDate}`);
  }

  return (
    <>
      <section className="mt-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Daily schedule</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[32px]">{formatDateLabel(dateKey)}</h2>
          <p className="mt-2 text-sm text-zinc-500"><span className="font-semibold text-zinc-200">{availableUnits}</span> of {totalUnits} resource units free now</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button aria-label="Previous day" className="grid size-10 place-items-center rounded-xl border border-[#30343a] bg-[#181a1d] text-zinc-400 hover:text-white" onClick={() => navigateDate(addDaysToDateKey(dateKey, -1))} type="button"><ChevronLeft className="size-4" /></button>
          <label className="relative"><span className="sr-only">Reservation date</span><input className="h-10 rounded-xl border border-[#30343a] bg-[#181a1d] px-3 text-sm font-medium text-zinc-200 outline-none focus:border-zinc-500" onChange={(event) => navigateDate(event.target.value)} type="date" value={dateKey} /></label>
          <button aria-label="Next day" className="grid size-10 place-items-center rounded-xl border border-[#30343a] bg-[#181a1d] text-zinc-400 hover:text-white" onClick={() => navigateDate(addDaysToDateKey(dateKey, 1))} type="button"><ChevronRight className="size-4" /></button>
          <button className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200" disabled={resources.length === 0} onClick={() => openNew()} type="button"><Plus className="size-4" /> New booking</button>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-2">
        <button className={`h-9 rounded-full border px-4 text-xs font-medium transition ${category === "all" ? "border-zinc-200 bg-zinc-100 text-black" : "border-[#30343a] bg-[#15171a] text-zinc-500 hover:text-white"}`} onClick={() => setCategory("all")} type="button">All resources</button>
        {categories.map(([id, name]) => <button className={`h-9 rounded-full border px-4 text-xs font-medium transition ${category === id ? "border-zinc-200 bg-zinc-100 text-black" : "border-[#30343a] bg-[#15171a] text-zinc-500 hover:text-white"}`} key={id} onClick={() => setCategory(id)} type="button">{name}</button>)}
        <button aria-pressed={freeOnly} className={`ml-auto inline-flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-medium transition ${freeOnly ? "border-zinc-400 bg-[#24272b] text-white" : "border-[#30343a] bg-[#15171a] text-zinc-500 hover:text-white"}`} onClick={() => setFreeOnly(!freeOnly)} type="button"><span className="size-1.5 rounded-full bg-zinc-400" /> Free now only</button>
      </section>

      <section className="mt-5 overflow-hidden rounded-[24px] border border-[#282c31] bg-[#111315]">
        {filteredResources.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#30343a] bg-[#181a1d] text-zinc-500"><CalendarDays className="size-5" /></span><p className="mt-4 text-sm font-medium text-zinc-300">No resources to schedule</p><p className="mt-1 text-xs text-zinc-600">Add an active resource or change the filters.</p></div></div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: resourceColumnWidth + timelineWidth }}>
              <div className="flex h-12 border-b border-[#282c31] bg-[#15181c]">
                <div className="sticky left-0 z-20 flex shrink-0 items-center border-r border-[#30343a] bg-[#15181c] px-4 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600" style={{ width: resourceColumnWidth }}>Resource</div>
                <div className="relative shrink-0" style={{ width: timelineWidth }}>
                  {hours.slice(0, -1).map((hour, index) => <span className="absolute top-0 flex h-12 items-center border-l border-[#282c31] pl-2 font-mono text-[11px] text-zinc-600" key={hour} style={{ left: index * hourWidth, width: hourWidth }}>{hour.toString().padStart(2, "0")}:00</span>)}
                </div>
              </div>

              {filteredResources.map((resource) => {
                const layout = layoutReservations(resource.reservations);
                const rowHeight = Math.max(72, layout.laneCount * 38 + 14);
                return (
                  <div className="flex border-b border-[#24272b] last:border-0" key={resource.id} style={{ height: rowHeight }}>
                    <div className="sticky left-0 z-20 flex shrink-0 items-center gap-3 border-r border-[#30343a] bg-[#111315] px-4" style={{ width: resourceColumnWidth }}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#30343a] bg-[#181a1d] text-zinc-500"><PackageOpen className="size-4" /></span>
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{resource.name}</p><p className="mt-1 truncate text-[11px] text-zinc-600">{Math.max(resource.quantity - resource.reservedNow, 0)} of {resource.quantity} free · {resource.location}</p></div>
                    </div>
                    <div aria-label={`Schedule for ${resource.name}`} className="relative shrink-0 cursor-crosshair bg-[linear-gradient(to_right,#25292e_1px,transparent_1px)] bg-[length:88px_100%]" onClick={(event) => selectTimelineSlot(event, resource.id)} style={{ width: timelineWidth }}>
                      {layout.entries.map(({ reservation, lane }) => {
                        const start = minutesFromMidnight(timeInTimezone(reservation.startTime, timezone));
                        const end = minutesFromMidnight(timeInTimezone(reservation.endTime, timezone));
                        const left = Math.max(0, ((start - startHour * 60) / 60) * hourWidth);
                        const right = Math.min(timelineWidth, ((end - startHour * 60) / 60) * hourWidth);
                        return <button className={`absolute z-10 overflow-hidden rounded-lg border px-2.5 text-left transition enabled:hover:-translate-y-0.5 ${reservation.isMine ? "border-zinc-300 bg-zinc-100 text-black" : "border-[#414752] bg-[#262b33] text-zinc-200"} ${!canManageAll && !reservation.isMine ? "cursor-default" : ""}`} disabled={!canManageAll && !reservation.isMine} key={reservation.id} onClick={(event) => { event.stopPropagation(); openExisting(reservation); }} style={{ left: left + 3, top: 7 + lane * 38, width: Math.max(right - left - 6, 44), height: 32 }} type="button"><span className="block truncate text-xs font-semibold">{reservation.purpose}</span><span className={`block truncate text-[10px] ${reservation.isMine ? "text-zinc-600" : "text-zinc-500"}`}>{timeInTimezone(reservation.startTime, timezone)}–{timeInTimezone(reservation.endTime, timezone)}</span></button>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="mt-4 flex flex-wrap gap-5 text-xs text-zinc-500"><span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm bg-zinc-100" /> Your bookings</span><span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm border border-[#414752] bg-[#262b33]" /> Booked by others</span><span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm border border-dashed border-zinc-600" /> Click an empty slot to book it</span></div>

      {editing && draft ? (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" onMouseDown={() => setEditing(null)}>
          <aside aria-labelledby="booking-drawer-title" aria-modal="true" className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-[#30343a] bg-[#15181c] shadow-2xl" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <header className="flex items-center justify-between border-b border-[#30343a] px-5 py-5 sm:px-6"><div><p className="text-xs uppercase tracking-[0.12em] text-zinc-600">Reservation</p><h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white" id="booking-drawer-title">{editing === "new" ? "New booking" : "Change booking"}</h3></div><button aria-label="Close booking panel" className="grid size-9 place-items-center rounded-xl border border-[#30343a] text-zinc-500 hover:text-white" onClick={() => setEditing(null)} type="button"><X className="size-4" /></button></header>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveBooking}>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                <label className="block text-xs font-medium text-zinc-400">Resource<select className="mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#1a1d22] px-3 text-sm text-zinc-200 outline-none focus:border-zinc-500" onChange={(event) => setDraft({ ...draft, resourceId: event.target.value })} value={draft.resourceId}>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} ({resource.quantity})</option>)}</select><span className="mt-2 block text-[11px] text-zinc-600">{resources.find((resource) => resource.id === draft.resourceId)?.categoryName} · {resources.find((resource) => resource.id === draft.resourceId)?.location}</span></label>
                {canManageAll ? <label className="block text-xs font-medium text-zinc-400">Book for<select className="mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#1a1d22] px-3 text-sm text-zinc-200 outline-none focus:border-zinc-500" onChange={(event) => setDraft({ ...draft, userId: event.target.value })} value={draft.userId}>{people.map((person) => <option key={person.id} value={person.id}>{person.name}{person.role === "ADMIN" ? " (Admin)" : ""}</option>)}</select></label> : null}
                <label className="block text-xs font-medium text-zinc-400">Day<input className="mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#1a1d22] px-3 text-sm text-zinc-200 outline-none focus:border-zinc-500" onChange={(event) => setDraft({ ...draft, date: event.target.value })} type="date" value={draft.date} /></label>
                <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-medium text-zinc-400">Start<select className="mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#1a1d22] px-3 text-sm text-zinc-200 outline-none focus:border-zinc-500" onChange={(event) => setDraft({ ...draft, start: event.target.value })} value={draft.start}>{timeOptions.slice(0, -1).map((time) => <option key={time} value={time}>{time}</option>)}</select></label><label className="block text-xs font-medium text-zinc-400">End<select className="mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#1a1d22] px-3 text-sm text-zinc-200 outline-none focus:border-zinc-500" onChange={(event) => setDraft({ ...draft, end: event.target.value })} value={draft.end}>{timeOptions.slice(1).map((time) => <option key={time} value={time}>{time}</option>)}</select></label></div>
                <div className="flex flex-wrap gap-2">{[30, 60, 90, 120, 180].map((duration) => <button className="h-9 rounded-xl border border-[#30343a] bg-[#1a1d22] px-3 text-xs font-medium text-zinc-400 hover:text-white" key={duration} onClick={() => setDraft({ ...draft, end: timeFromMinutes(Math.min(minutesFromMidnight(draft.start) + duration, endHour * 60)) })} type="button">{duration < 60 ? `${duration} min` : `${duration / 60} ${duration === 60 ? "hour" : "hours"}`}</button>)}</div>
                <div className={`rounded-2xl border px-4 py-3 ${availability.available ? "border-[#3a3e45] bg-[#1c2025]" : "border-red-900/50 bg-red-950/20"}`}><div className="flex items-start gap-3"><Clock3 className={`mt-0.5 size-4 shrink-0 ${availability.available ? "text-zinc-300" : "text-red-300"}`} /><div><p className={`text-sm font-medium ${availability.available ? "text-zinc-200" : "text-red-300"}`}>{availability.message}</p><p className="mt-1 text-xs text-zinc-600">{formatDateLabel(draft.date)}, {draft.start}–{draft.end}</p></div></div></div>
                <label className="block text-xs font-medium text-zinc-400">Purpose <span className="font-normal text-zinc-700">optional</span><input className="mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#1a1d22] px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-zinc-500" maxLength={120} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} placeholder="Team planning" value={draft.purpose} /></label>
                <label className="block text-xs font-medium text-zinc-400">Attendees<div className="relative"><UsersRound className="pointer-events-none absolute left-3 top-1/2 mt-1 size-4 -translate-y-1/2 text-zinc-600" /><input className="mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#1a1d22] pl-10 pr-3 text-sm text-zinc-200 outline-none focus:border-zinc-500" min={1} onChange={(event) => setDraft({ ...draft, attendeeCount: Number(event.target.value) })} type="number" value={draft.attendeeCount} /></div></label>
                {error ? <p className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p> : null}
                {confirmCancel ? <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-4"><p className="text-sm text-red-200">Cancel this reservation?</p><div className="mt-3 flex gap-2"><button className="h-9 rounded-xl border border-[#3b3f45] px-3 text-xs text-zinc-300" onClick={() => setConfirmCancel(false)} type="button">Keep booking</button><button className="h-9 rounded-xl bg-red-950/60 px-3 text-xs font-medium text-red-200" disabled={busy} onClick={cancelBooking} type="button">Yes, cancel</button></div></div> : null}
              </div>
              <footer className="flex items-center justify-between gap-3 border-t border-[#30343a] bg-[#131619] px-5 py-4 sm:px-6">{editing !== "new" ? <button className="text-sm font-medium text-red-300 hover:text-red-200" onClick={() => setConfirmCancel(true)} type="button">Cancel reservation</button> : <span />}<div className="flex gap-2"><button className="h-10 rounded-xl border border-[#30343a] px-4 text-sm text-zinc-300" onClick={() => setEditing(null)} type="button">Close</button><button className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !availability.available} type="submit">{busy ? "Saving…" : editing === "new" ? "Create booking" : "Save changes"}</button></div></footer>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
