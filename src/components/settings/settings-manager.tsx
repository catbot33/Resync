"use client";

import {
  Building2,
  Check,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ShiftName = "Morning" | "Evening" | "Night";
type SettingsSection = "company" | "schedule" | "account" | "security";

interface ShiftSetting {
  name: ShiftName;
  start: string;
  end: string;
}

interface SettingsManagerProps {
  account: {
    name: string;
    username: string;
    email: string;
    hasPassword: boolean;
  };
  organization: {
    name: string;
    description: string;
    logoUrl: string;
    timezone: string;
    shifts: ShiftSetting[];
  };
}

const sections = [
  { id: "company", label: "Company profile", icon: Building2 },
  { id: "schedule", label: "Working hours", icon: Clock3 },
  { id: "account", label: "Admin account", icon: UserRound },
  { id: "security", label: "Security", icon: ShieldCheck },
] as const;

const shiftDefaults: Record<ShiftName, { start: string; end: string }> = {
  Morning: { start: "08:00", end: "16:00" },
  Evening: { start: "16:00", end: "00:00" },
  Night: { start: "00:00", end: "08:00" },
};

const timezones = [
  "UTC",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#181a1d] px-3.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-zinc-500";

export function SettingsManager({ account, organization }: SettingsManagerProps) {
  const router = useRouter();
  const [section, setSection] = useState<SettingsSection>("company");
  const [organizationDraft, setOrganizationDraft] = useState(organization);
  const [accountDraft, setAccountDraft] = useState({ name: account.name, username: account.username });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, next: false, confirm: false });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const initials = useMemo(
    () => organizationDraft.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "R",
    [organizationDraft.name],
  );

  function changeSection(nextSection: SettingsSection) {
    setSection(nextSection);
    setNotice(null);
  }

  function toggleShift(name: ShiftName) {
    setOrganizationDraft((current) => {
      const exists = current.shifts.some((shift) => shift.name === name);
      return {
        ...current,
        shifts: exists
          ? current.shifts.filter((shift) => shift.name !== name)
          : [...current.shifts, { name, ...shiftDefaults[name] }],
      };
    });
  }

  function updateShift(name: ShiftName, field: "start" | "end", value: string) {
    setOrganizationDraft((current) => ({
      ...current,
      shifts: current.shifts.map((shift) => shift.name === name ? { ...shift, [field]: value } : shift),
    }));
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);

    try {
      const response = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(organizationDraft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not save the organization settings.");
      setNotice({ kind: "success", text: result.message });
      router.refresh();
    } catch (caught) {
      setNotice({ kind: "error", text: caught instanceof Error ? caught.message : "We could not save the organization settings." });
    } finally {
      setBusy(false);
    }
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountDraft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not save the account details.");
      setNotice({ kind: "success", text: result.message });
      router.refresh();
    } catch (caught) {
      setNotice({ kind: "error", text: caught instanceof Error ? caught.message : "We could not save the account details." });
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (passwords.newPassword !== passwords.confirmPassword) {
      setNotice({ kind: "error", text: "The new passwords do not match." });
      return;
    }
    setBusy(true);

    try {
      const response = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message ?? "We could not update the password.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice({ kind: "success", text: result.message });
      router.refresh();
    } catch (caught) {
      setNotice({ kind: "error", text: caught instanceof Error ? caught.message : "We could not update the password." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pt-7">
      <div className="max-w-2xl">
        <p className="text-sm text-zinc-500">Workspace configuration</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[32px]">Keep your workspace accurate</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">Manage company details, booking hours, and administrator access.</p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[240px_minmax(0,760px)] xl:gap-8">
        <nav aria-label="Settings sections" className="h-fit rounded-[22px] border border-[#24272b] bg-[#111315] p-2">
          {sections.map(({ id, icon: Icon, label }) => (
            <button
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${section === id ? "bg-[#24272b] text-white" : "text-zinc-500 hover:bg-[#181a1d] hover:text-zinc-200"}`}
              key={id}
              onClick={() => changeSection(id)}
              type="button"
            >
              <Icon className="size-4" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        <div>
          {notice && (
            <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${notice.kind === "success" ? "border-[#3a3f46] bg-[#181a1d] text-zinc-200" : "border-red-900/50 bg-red-950/20 text-red-300"}`}>
              {notice.kind === "success" && <Check className="size-4" />}
              {notice.text}
            </div>
          )}

          {section === "company" && (
            <SettingsCard description="The name and identity employees see across Resync." title="Company profile">
              <form className="mt-7 space-y-5" onSubmit={saveOrganization}>
                <div className="flex flex-col gap-4 rounded-2xl border border-[#2b2f34] bg-[#16181b] p-4 sm:flex-row sm:items-center">
                  <div
                    aria-label="Company logo preview"
                    className="grid size-16 shrink-0 place-items-center rounded-2xl border border-[#383d45] bg-[#24272b] bg-cover bg-center text-sm font-semibold text-zinc-300"
                    style={organizationDraft.logoUrl ? { backgroundImage: `url(${organizationDraft.logoUrl})` } : undefined}
                  >
                    {!organizationDraft.logoUrl && initials}
                  </div>
                  <label className="min-w-0 flex-1 text-xs font-medium text-zinc-400">
                    Logo URL
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-3.5 top-1/2 mt-1 size-4 -translate-y-1/2 text-zinc-600" />
                      <input className={`${fieldClass} pl-10`} onChange={(event) => setOrganizationDraft({ ...organizationDraft, logoUrl: event.target.value })} placeholder="https://company.com/logo.png" type="url" value={organizationDraft.logoUrl} />
                    </div>
                  </label>
                </div>
                <label className="block text-xs font-medium text-zinc-400">Organization name<input className={fieldClass} maxLength={80} onChange={(event) => setOrganizationDraft({ ...organizationDraft, name: event.target.value })} required value={organizationDraft.name} /></label>
                <label className="block text-xs font-medium text-zinc-400">Description<textarea className="mt-2 min-h-28 w-full resize-none rounded-xl border border-[#30343a] bg-[#181a1d] px-3.5 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-zinc-500" maxLength={240} onChange={(event) => setOrganizationDraft({ ...organizationDraft, description: event.target.value })} placeholder="What does your organization do?" value={organizationDraft.description} /><span className="mt-2 block text-right text-[11px] text-zinc-700">{organizationDraft.description.length}/240</span></label>
                <SaveButton busy={busy} label="Save company profile" />
              </form>
            </SettingsCard>
          )}

          {section === "schedule" && (
            <SettingsCard description="Used for reservation timelines and organization-wide availability." title="Working hours">
              <form className="mt-7 space-y-6" onSubmit={saveOrganization}>
                <label className="block text-xs font-medium text-zinc-400">Timezone<select className={fieldClass} onChange={(event) => setOrganizationDraft({ ...organizationDraft, timezone: event.target.value })} value={organizationDraft.timezone}>{!timezones.includes(organizationDraft.timezone) && <option value={organizationDraft.timezone}>{organizationDraft.timezone}</option>}{timezones.map((timezone) => <option key={timezone}>{timezone}</option>)}</select></label>
                <div>
                  <p className="text-xs font-medium text-zinc-400">Active shifts</p>
                  <div className="mt-3 space-y-3">
                    {(Object.keys(shiftDefaults) as ShiftName[]).map((name) => {
                      const shift = organizationDraft.shifts.find((item) => item.name === name);
                      return (
                        <div className={`rounded-2xl border p-4 transition ${shift ? "border-[#444a53] bg-[#181a1d]" : "border-[#292d32] bg-[#131517]"}`} key={name}>
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-3 text-sm font-medium text-zinc-200"><input checked={Boolean(shift)} className="size-4 accent-zinc-200" onChange={() => toggleShift(name)} type="checkbox" />{name}</label>
                            <span className="text-[11px] text-zinc-600">{shift ? "Enabled" : "Disabled"}</span>
                          </div>
                          {shift && <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[11px] text-zinc-500">Starts<input className={fieldClass} onChange={(event) => updateShift(name, "start", event.target.value)} type="time" value={shift.start} /></label><label className="text-[11px] text-zinc-500">Ends<input className={fieldClass} onChange={(event) => updateShift(name, "end", event.target.value)} type="time" value={shift.end} /></label></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <SaveButton busy={busy} label="Save working hours" />
              </form>
            </SettingsCard>
          )}

          {section === "account" && (
            <SettingsCard description="Your administrator identity and credentials username." title="Admin account">
              <form className="mt-7 space-y-5" onSubmit={saveAccount}>
                <label className="block text-xs font-medium text-zinc-400">Display name<input className={fieldClass} maxLength={80} onChange={(event) => setAccountDraft({ ...accountDraft, name: event.target.value })} required value={accountDraft.name} /></label>
                <label className="block text-xs font-medium text-zinc-400">Username<input autoCapitalize="none" className={fieldClass} maxLength={32} onChange={(event) => setAccountDraft({ ...accountDraft, username: event.target.value.toLowerCase() })} required value={accountDraft.username} /><span className="mt-2 block text-[11px] text-zinc-600">Used when signing in with a password.</span></label>
                <label className="block text-xs font-medium text-zinc-400">Email<input className={`${fieldClass} cursor-not-allowed opacity-60`} disabled value={account.email || "No email connected"} /><span className="mt-2 block text-[11px] text-zinc-600">Managed by your connected Google account.</span></label>
                <SaveButton busy={busy} label="Save account" />
              </form>
            </SettingsCard>
          )}

          {section === "security" && (
            <SettingsCard description={account.hasPassword ? "Change the password used for administrator sign-in." : "Create a password to enable username sign-in alongside Google."} title="Password">
              <form className="mt-7 space-y-5" onSubmit={savePassword}>
                {account.hasPassword && <PasswordField label="Current password" onChange={(value) => setPasswords({ ...passwords, currentPassword: value })} onToggle={() => setVisiblePasswords({ ...visiblePasswords, current: !visiblePasswords.current })} show={visiblePasswords.current} value={passwords.currentPassword} />}
                <PasswordField label="New password" onChange={(value) => setPasswords({ ...passwords, newPassword: value })} onToggle={() => setVisiblePasswords({ ...visiblePasswords, next: !visiblePasswords.next })} show={visiblePasswords.next} value={passwords.newPassword} />
                <PasswordField label="Confirm new password" onChange={(value) => setPasswords({ ...passwords, confirmPassword: value })} onToggle={() => setVisiblePasswords({ ...visiblePasswords, confirm: !visiblePasswords.confirm })} show={visiblePasswords.confirm} value={passwords.confirmPassword} />
                <p className="text-[11px] leading-5 text-zinc-600">Use 8–72 characters with at least one letter and one number.</p>
                <SaveButton busy={busy} label={account.hasPassword ? "Update password" : "Create password"} />
              </form>
            </SettingsCard>
          )}
        </div>
      </div>
    </section>
  );
}

function SettingsCard({ children, description, title }: { children: React.ReactNode; description: string; title: string }) {
  return <article className="rounded-[26px] border border-[#24272b] bg-[#111315] p-5 sm:p-7"><h3 className="text-lg font-semibold tracking-[-0.025em] text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>{children}</article>;
}

function SaveButton({ busy, label }: { busy: boolean; label: string }) {
  return <div className="flex justify-end border-t border-[#24272b] pt-5"><button className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60" disabled={busy} type="submit"><Save className="size-4" />{busy ? "Saving…" : label}</button></div>;
}

function PasswordField({ label, onChange, onToggle, show, value }: { label: string; onChange: (value: string) => void; onToggle: () => void; show: boolean; value: string }) {
  return <label className="block text-xs font-medium text-zinc-400">{label}<div className="relative"><KeyRound className="pointer-events-none absolute left-3.5 top-1/2 mt-1 size-4 -translate-y-1/2 text-zinc-600" /><input className={`${fieldClass} pl-10 pr-11`} minLength={8} onChange={(event) => onChange(event.target.value)} required type={show ? "text" : "password"} value={value} /><button aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center text-zinc-500 hover:text-white" onClick={onToggle} type="button">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>;
}
