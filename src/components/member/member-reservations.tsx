"use client";

import { CalendarClock, Clock3, MapPin, Pencil, Plus, UsersRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { addDaysToDateKey, dateKeyInTimezone, zonedDateTimeToUtc } from "@/lib/datetime/timezone";

type Filter = "all" | "upcoming" | "active" | "completed" | "cancelled";
interface ResourceOption { id: string; name: string; location: string; quantity: number; available: number }
interface MemberReservation { id: string; purpose: string; attendeeCount: number; startTime: string; endTime: string; status: string; state: Exclude<Filter, "all">; resourceId: string; resource: { name: string; location: string; quantity: number; isActive: boolean } }
interface Draft { resourceId: string; date: string; start: string; end: string; purpose: string; attendeeCount: number }

function timeInTimezone(value: string, timezone: string) { return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
function displayDate(value: string, timezone: string) { return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }
function timeFromMinutes(value: number) { return `${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`; }

export function MemberReservations({ reservations, resources, timezone, userId }: { reservations: MemberReservation[]; resources: ResourceOption[]; timezone: string; userId: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [editing, setEditing] = useState<MemberReservation | "new" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const filtered = useMemo(() => reservations.filter((reservation) => filter === "all" || reservation.state === filter), [filter, reservations]);
  const counts = useMemo(() => Object.fromEntries((["upcoming", "active", "completed", "cancelled"] as const).map((item) => [item, reservations.filter((reservation) => reservation.state === item).length])), [reservations]);

  function openNew() {
    const current = new Date();
    let date = dateKeyInTimezone(current, timezone);
    const [hour, minute] = timeInTimezone(current.toISOString(), timezone).split(":").map(Number);
    let startMinutes = Math.ceil((hour * 60 + minute) / 30) * 30;
    if (startMinutes >= 23 * 60) {
      date = addDaysToDateKey(date, 1);
      startMinutes = 9 * 60;
    }
    setEditing("new");
    setDraft({ resourceId: resources[0]?.id ?? "", date, start: timeFromMinutes(startMinutes), end: timeFromMinutes(startMinutes + 60), purpose: "", attendeeCount: 1 });
    setError("");
  }

  function openEdit(reservation: MemberReservation) {
    setEditing(reservation);
    setDraft({ resourceId: reservation.resourceId, date: dateKeyInTimezone(new Date(reservation.startTime), timezone), start: timeInTimezone(reservation.startTime, timezone), end: timeInTimezone(reservation.endTime, timezone), purpose: reservation.purpose === "Reserved" ? "" : reservation.purpose, attendeeCount: reservation.attendeeCount });
    setError("");
    setConfirmCancel(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !draft) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(editing === "new" ? "/api/reservations" : `/api/reservations/${editing.id}`, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: draft.resourceId, userId, startTime: zonedDateTimeToUtc(draft.date, draft.start, timezone).toISOString(), endTime: zonedDateTimeToUtc(draft.date, draft.end, timezone).toISOString(), purpose: draft.purpose, attendeeCount: draft.attendeeCount }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not save the reservation.");
      setEditing(null); setDraft(null); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We could not save the reservation."); }
    finally { setBusy(false); }
  }

  async function cancelReservation() {
    if (!editing || editing === "new") return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/reservations/${editing.id}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not cancel the reservation.");
      setEditing(null); setDraft(null); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We could not cancel the reservation."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <section className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-zinc-500">Your bookings</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">Manage your reservations</h2></div><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-50" disabled={resources.length === 0} onClick={openNew} type="button"><Plus className="size-4" /> New reservation</button></section>
      <section className="mt-7 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{(["all", "upcoming", "active", "completed", "cancelled"] as Filter[]).map((item) => <button className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium capitalize ${filter === item ? "border-zinc-200 bg-zinc-100 text-black" : "border-[#30343a] bg-[#15171a] text-zinc-500"}`} key={item} onClick={() => setFilter(item)} type="button">{item} {item !== "all" && <span className="ml-1 opacity-60">{counts[item]}</span>}</button>)}</section>
      <section className="mt-5 space-y-3">
        {filtered.map((reservation) => { const canEdit = reservation.state === "upcoming" && reservation.resource.isActive; return <article className="rounded-[22px] border border-[#24272b] bg-[#111315] p-5" key={reservation.id}><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#30343a] bg-[#181a1d] text-zinc-500"><CalendarClock className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-base font-semibold text-zinc-100">{reservation.resource.name}</h3><span className="rounded-full border border-[#30343a] bg-[#181a1d] px-2 py-0.5 text-[10px] capitalize text-zinc-500">{reservation.state}</span></div><p className="mt-1 truncate text-sm text-zinc-500">{reservation.purpose}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-600"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{displayDate(reservation.startTime, timezone)}, {timeInTimezone(reservation.startTime, timezone)}–{timeInTimezone(reservation.endTime, timezone)}</span><span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{reservation.resource.location}</span><span className="flex items-center gap-1.5"><UsersRound className="size-3.5" />{reservation.attendeeCount}</span></div></div>{canEdit && <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#30343a] px-4 text-xs text-zinc-300 hover:bg-[#24272b]" onClick={() => openEdit(reservation)} type="button"><Pencil className="size-3.5" /> Edit</button>}</div></article>; })}
        {filtered.length === 0 && <div className="rounded-[22px] border border-dashed border-[#30343a] px-6 py-20 text-center text-sm text-zinc-600">No {filter === "all" ? "" : filter} reservations.</div>}
      </section>

      {editing && draft && <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" onMouseDown={() => setEditing(null)}><aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[#30343a] bg-[#15181c]" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-[#30343a] p-5"><div><p className="text-xs text-zinc-600">Reservation</p><h3 className="mt-1 text-xl font-semibold">{editing === "new" ? "New reservation" : "Edit reservation"}</h3></div><button aria-label="Close" className="grid size-9 place-items-center rounded-xl border border-[#30343a] text-zinc-500" onClick={() => setEditing(null)} type="button"><X className="size-4" /></button></header><form className="flex min-h-0 flex-1 flex-col" onSubmit={save}><div className="flex-1 space-y-4 overflow-y-auto p-5"><Field label="Resource"><select className={inputClass} onChange={(event) => setDraft({ ...draft, resourceId: event.target.value })} value={draft.resourceId}>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} · {resource.location}</option>)}</select></Field><Field label="Date"><input className={inputClass} onChange={(event) => setDraft({ ...draft, date: event.target.value })} type="date" value={draft.date} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Start"><input className={inputClass} onChange={(event) => setDraft({ ...draft, start: event.target.value })} type="time" value={draft.start} /></Field><Field label="End"><input className={inputClass} onChange={(event) => setDraft({ ...draft, end: event.target.value })} type="time" value={draft.end} /></Field></div><Field label="Purpose"><input className={inputClass} maxLength={120} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} placeholder="Team planning" value={draft.purpose} /></Field><Field label="Attendees"><input className={inputClass} min={1} onChange={(event) => setDraft({ ...draft, attendeeCount: Number(event.target.value) })} type="number" value={draft.attendeeCount} /></Field>{error && <p className="rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">{error}</p>}{confirmCancel && <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4"><p className="text-sm text-red-200">Cancel this reservation?</p><div className="mt-3 flex gap-2"><button className="rounded-lg border border-[#3b3f45] px-3 py-2 text-xs" onClick={() => setConfirmCancel(false)} type="button">Keep it</button><button className="rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-200" onClick={cancelReservation} type="button">Yes, cancel</button></div></div>}</div><footer className="flex items-center justify-between border-t border-[#30343a] p-5">{editing !== "new" ? <button className="text-sm text-red-300" onClick={() => setConfirmCancel(true)} type="button">Cancel reservation</button> : <span />}<button className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-50" disabled={busy} type="submit">{busy ? "Saving…" : editing === "new" ? "Create" : "Save changes"}</button></footer></form></aside></div>}
    </>
  );
}

const inputClass = "mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#1a1d22] px-3 text-sm text-zinc-200 outline-none focus:border-zinc-500";
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="block text-xs font-medium text-zinc-400">{label}{children}</label>; }
