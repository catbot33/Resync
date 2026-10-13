"use client";

import {
  CalendarClock,
  CalendarRange,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UsersRound,
  UserX,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

interface EmployeeReservation {
  id: string;
  purpose: string | null;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  resource: { name: string; location: string };
}

interface EmployeeItem {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  reservationCount: number;
  upcomingCount: number;
  reservations: EmployeeReservation[];
}

interface EmployeeManagerProps {
  employees: EmployeeItem[];
  stats: { total: number; active: number; withUpcoming: number; inactive: number };
  timezone: string;
}

interface EmployeeDraft {
  name: string;
  username: string;
  password: string;
  isActive: boolean;
}

const emptyDraft: EmployeeDraft = { name: "", username: "", password: "", isActive: true };
const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#181a1d] px-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-500";

function Modal({ children, onClose, title, wide = false }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section aria-labelledby="employee-modal-title" aria-modal="true" className={`max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-[26px] border border-[#30343a] bg-[#111315] p-5 shadow-2xl sm:p-7 ${wide ? "max-w-3xl" : "max-w-xl"}`} onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-white" id="employee-modal-title">{title}</h2>
          <button aria-label="Close" className="grid size-9 place-items-center rounded-xl border border-[#30343a] text-zinc-400 transition hover:bg-[#1b1e22] hover:text-white" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function formatDate(value: string, timezone: string, withTime = false) {
  const options: Intl.DateTimeFormatOptions = withTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone }
    : { month: "short", day: "numeric", year: "numeric", timeZone: timezone };

  try {
    return new Intl.DateTimeFormat("en-US", options).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: undefined }).format(new Date(value));
  }
}

export function EmployeeManager({ employees, stats, timezone }: EmployeeManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [editing, setEditing] = useState<EmployeeItem | "new" | null>(null);
  const [draft, setDraft] = useState<EmployeeDraft>(emptyDraft);
  const [resetTarget, setResetTarget] = useState<EmployeeItem | null>(null);
  const [reservationTarget, setReservationTarget] = useState<EmployeeItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("en-US");
    return employees.filter((employee) => {
      const matchesTerm = !term || [employee.name, employee.username].some((value) => value.toLocaleLowerCase("en-US").includes(term));
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? employee.isActive : !employee.isActive);
      return matchesTerm && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  function openEmployeeForm(employee?: EmployeeItem) {
    setError("");
    setShowPassword(false);
    setEditing(employee ?? "new");
    setDraft(employee ? { name: employee.name, username: employee.username, password: "", isActive: employee.isActive } : emptyDraft);
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");

    const creating = editing === "new";
    const body = creating
      ? draft
      : { name: draft.name, username: draft.username, isActive: draft.isActive };

    try {
      const response = await fetch(creating ? "/api/employees" : `/api/employees/${editing.id}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not save the employee.");

      setEditing(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not save the employee.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(employee: EmployeeItem) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !employee.isActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not update the employee.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not update the employee.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/employees/${resetTarget.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not reset the password.");

      setResetTarget(null);
      setNewPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  const statCards = [
    { label: "Total employees", value: stats.total, detail: "Member accounts", icon: UsersRound },
    { label: "Active", value: stats.active, detail: "Can sign in", icon: UserCheck },
    { label: "Upcoming bookings", value: stats.withUpcoming, detail: "Employees with bookings", icon: CalendarClock },
    { label: "Inactive", value: stats.inactive, detail: "Access paused", icon: UserX },
  ];

  return (
    <>
      <section className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-zinc-500">Team</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[32px]">Manage employee access</h2>
        </div>
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200" onClick={() => openEmployeeForm()} type="button"><Plus className="size-4" /> Add employee</button>
      </section>

      <section aria-label="Employee totals" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ detail, icon: Icon, label, value }) => (
          <article className="rounded-[22px] border border-[#24272b] bg-[#111315] p-5" key={label}>
            <div className="flex items-start justify-between gap-4"><p className="text-sm font-medium text-zinc-400">{label}</p><span className="grid size-9 place-items-center rounded-xl border border-[#2e3238] bg-[#181a1d] text-zinc-400"><Icon className="size-4" strokeWidth={1.8} /></span></div>
            <p className="mt-6 text-3xl font-semibold tracking-[-0.045em] text-white">{value.toLocaleString()}</p>
            <p className="mt-2 text-xs text-zinc-600">{detail}</p>
          </article>
        ))}
      </section>

      {error && !editing && !resetTarget ? <p className="mt-5 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p> : null}

      <section className="mt-5 overflow-hidden rounded-[26px] border border-[#24272b] bg-[#111315]">
        <div className="flex flex-col gap-3 border-b border-[#24272b] p-4 sm:flex-row sm:items-center sm:p-5">
          <label className="relative flex-1"><span className="sr-only">Search employees</span><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /><input className="h-11 w-full rounded-xl border border-[#30343a] bg-[#181a1d] pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500" onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or username" value={search} /></label>
          <select aria-label="Filter by status" className="h-11 rounded-xl border border-[#30343a] bg-[#181a1d] px-3 text-sm text-zinc-300 outline-none focus:border-zinc-500" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All statuses</option></select>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#30343a] bg-[#181a1d] text-zinc-500"><UsersRound className="size-5" /></span><p className="mt-4 text-sm font-medium text-zinc-300">No employees found</p><p className="mt-1 text-xs text-zinc-600">Add an employee or adjust the filter.</p></div></div>
        ) : (
          <>
            <div className="divide-y divide-[#202326] md:hidden">
              {filteredEmployees.map((employee) => (
                <article className="p-4" key={employee.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#30343a] bg-[#181a1d] text-xs font-semibold text-zinc-400">{employee.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{employee.name}</p><p className="mt-1 truncate text-xs text-zinc-600">@{employee.username}</p></div></div>
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#30343a] bg-[#181a1d] px-2.5 py-1 text-xs text-zinc-400"><span className={`size-1.5 rounded-full ${employee.isActive ? "bg-zinc-300" : "bg-zinc-700"}`} />{employee.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#24272b] pt-3">
                    <p className="text-xs text-zinc-600">{employee.reservationCount} reservations · {employee.upcomingCount} upcoming</p>
                    <div className="flex gap-1">
                      <button aria-label={`View ${employee.name} reservations`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" onClick={() => setReservationTarget(employee)} type="button"><CalendarRange className="size-4" /></button>
                      <button aria-label={`Edit ${employee.name}`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" onClick={() => openEmployeeForm(employee)} type="button"><Pencil className="size-4" /></button>
                      <button aria-label={`Reset ${employee.name} password`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" onClick={() => { setError(""); setNewPassword(""); setShowPassword(false); setResetTarget(employee); }} type="button"><KeyRound className="size-4" /></button>
                      <button aria-label={`${employee.isActive ? "Deactivate" : "Activate"} ${employee.name}`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" disabled={busy} onClick={() => updateStatus(employee)} type="button">{employee.isActive ? <UserX className="size-4" /> : <Check className="size-4" />}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead><tr className="border-b border-[#24272b] text-[11px] uppercase tracking-[0.1em] text-zinc-600"><th className="px-5 py-4 font-medium">Employee</th><th className="px-4 py-4 font-medium">Username</th><th className="px-4 py-4 font-medium">Reservations</th><th className="px-4 py-4 font-medium">Status</th><th className="px-4 py-4 font-medium">Joined</th><th className="px-5 py-4 text-right font-medium">Actions</th></tr></thead>
              <tbody>{filteredEmployees.map((employee) => (
                <tr className="border-b border-[#202326] last:border-0" key={employee.id}>
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#30343a] bg-[#181a1d] text-xs font-semibold text-zinc-400">{employee.name.slice(0, 1).toUpperCase()}</span><p className="text-sm font-medium text-zinc-200">{employee.name}</p></div></td>
                  <td className="px-4 py-4 text-sm text-zinc-500">@{employee.username}</td>
                  <td className="px-4 py-4"><p className="text-sm font-medium text-zinc-200">{employee.reservationCount}</p><p className="mt-1 text-xs text-zinc-600">{employee.upcomingCount} upcoming</p></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-2 rounded-full border border-[#30343a] bg-[#181a1d] px-2.5 py-1 text-xs text-zinc-400"><span className={`size-1.5 rounded-full ${employee.isActive ? "bg-zinc-300" : "bg-zinc-700"}`} />{employee.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-4 text-sm text-zinc-500">{formatDate(employee.createdAt, timezone)}</td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-1">
                    <button aria-label={`View ${employee.name} reservations`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" onClick={() => setReservationTarget(employee)} type="button"><CalendarRange className="size-4" /></button>
                    <button aria-label={`Edit ${employee.name}`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" onClick={() => openEmployeeForm(employee)} type="button"><Pencil className="size-4" /></button>
                    <button aria-label={`Reset ${employee.name} password`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" onClick={() => { setError(""); setNewPassword(""); setShowPassword(false); setResetTarget(employee); }} type="button"><KeyRound className="size-4" /></button>
                    <button aria-label={`${employee.isActive ? "Deactivate" : "Activate"} ${employee.name}`} className="grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#202328] hover:text-white" disabled={busy} onClick={() => updateStatus(employee)} type="button">{employee.isActive ? <UserX className="size-4" /> : <Check className="size-4" />}</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
            </div>
          </>
        )}
      </section>

      {editing ? (
        <Modal onClose={() => setEditing(null)} title={editing === "new" ? "Add employee" : "Edit employee"}>
          <form className="mt-6 space-y-4" onSubmit={saveEmployee}>
            <label className="block text-xs font-medium text-zinc-400">Full name<input autoFocus className={fieldClass} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Alex Morgan" required value={draft.name} /></label>
            <label className="block text-xs font-medium text-zinc-400">Username<input autoCapitalize="none" className={fieldClass} onChange={(event) => setDraft({ ...draft, username: event.target.value.toLowerCase() })} placeholder="alex_morgan" required value={draft.username} /></label>
            {editing === "new" ? <label className="block text-xs font-medium text-zinc-400">Temporary password<div className="relative"><input className={`${fieldClass} pr-11`} minLength={8} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="At least 8 characters" required type={showPassword ? "text" : "password"} value={draft.password} /><button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center text-zinc-500 hover:text-white" onClick={() => setShowPassword(!showPassword)} type="button">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><span className="mt-2 block text-[11px] text-zinc-600">Use at least one letter and one number.</span></label> : null}
            <label className="flex items-center gap-3 rounded-xl border border-[#30343a] bg-[#181a1d] px-4 py-3 text-sm text-zinc-300"><input checked={draft.isActive} className="size-4 accent-zinc-200" onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} type="checkbox" />Allow this employee to sign in</label>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-2"><button className="h-10 rounded-xl border border-[#30343a] px-4 text-sm text-zinc-300" onClick={() => setEditing(null)} type="button">Cancel</button><button className="h-10 rounded-xl bg-white px-5 text-sm font-semibold text-black disabled:opacity-60" disabled={busy} type="submit">{busy ? "Saving…" : "Save employee"}</button></div>
          </form>
        </Modal>
      ) : null}

      {resetTarget ? (
        <Modal onClose={() => setResetTarget(null)} title="Reset password">
          <p className="mt-3 text-sm text-zinc-500">Set a new password for {resetTarget.name}.</p>
          <form className="mt-5" onSubmit={resetPassword}><label className="block text-xs font-medium text-zinc-400">New password<div className="relative"><input autoFocus className={`${fieldClass} pr-11`} minLength={8} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" required type={showPassword ? "text" : "password"} value={newPassword} /><button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center text-zinc-500 hover:text-white" onClick={() => setShowPassword(!showPassword)} type="button">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><span className="mt-2 block text-[11px] text-zinc-600">Use at least one letter and one number.</span></label>{error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><button className="h-10 rounded-xl border border-[#30343a] px-4 text-sm text-zinc-300" onClick={() => setResetTarget(null)} type="button">Cancel</button><button className="h-10 rounded-xl bg-white px-5 text-sm font-semibold text-black disabled:opacity-60" disabled={busy} type="submit">{busy ? "Updating…" : "Update password"}</button></div></form>
        </Modal>
      ) : null}

      {reservationTarget ? (
        <Modal onClose={() => setReservationTarget(null)} title={`${reservationTarget.name}'s reservations`} wide>
          <div className="mt-6 space-y-2">
            {reservationTarget.reservations.length === 0 ? <p className="rounded-2xl border border-dashed border-[#30343a] p-8 text-center text-sm text-zinc-600">No reservations yet.</p> : reservationTarget.reservations.map((reservation) => (
              <article className="flex flex-col gap-3 rounded-2xl border border-[#24272b] bg-[#181a1d] p-4 sm:flex-row sm:items-center sm:justify-between" key={reservation.id}><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{reservation.resource.name}</p><p className="mt-1 truncate text-xs text-zinc-600">{reservation.purpose || reservation.resource.location}</p></div><div className="sm:text-right"><p className="text-xs text-zinc-400">{formatDate(reservation.startTime, timezone, true)}</p><p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">{reservation.status.toLowerCase()}</p></div></article>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-600">Showing up to 20 recent reservations.</p>
        </Modal>
      ) : null}
    </>
  );
}
