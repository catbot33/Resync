"use client";

import { Check, Eye, EyeOff, Save, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#30343a] bg-[#181a1d] px-3.5 text-sm text-zinc-100 outline-none focus:border-zinc-500";

export function MemberSettings({ email, hasPassword, name, username }: { email: string; hasPassword: boolean; name: string; username: string }) {
  const router = useRouter();
  const [section, setSection] = useState<"profile" | "security">("profile");
  const [profile, setProfile] = useState({ name, username });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    try { const response = await fetch("/api/member/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) }); const result = await response.json(); if (!response.ok) throw new Error(result?.message); setNotice({ error: false, text: result.message }); router.refresh(); }
    catch (caught) { setNotice({ error: true, text: caught instanceof Error ? caught.message : "We could not save your profile." }); }
    finally { setBusy(false); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null);
    if (passwords.next !== passwords.confirm) { setNotice({ error: true, text: "The new passwords do not match." }); return; }
    setBusy(true);
    try { const response = await fetch("/api/member/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }) }); const result = await response.json(); if (!response.ok) throw new Error(result?.message); setPasswords({ current: "", next: "", confirm: "" }); setNotice({ error: false, text: result.message }); }
    catch (caught) { setNotice({ error: true, text: caught instanceof Error ? caught.message : "We could not update the password." }); }
    finally { setBusy(false); }
  }

  return (
    <section className="pt-8"><p className="text-sm text-zinc-500">Your account</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">Profile & settings</h2>
      <div className="mt-8 grid gap-5 lg:grid-cols-[220px_minmax(0,700px)]">
        <aside className="h-fit rounded-[22px] border border-[#24272b] bg-[#111315] p-2"><button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm ${section === "profile" ? "bg-[#24272b] text-white" : "text-zinc-500"}`} onClick={() => { setSection("profile"); setNotice(null); }} type="button"><UserRound className="size-4" />Personal information</button><button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm ${section === "security" ? "bg-[#24272b] text-white" : "text-zinc-500"}`} onClick={() => { setSection("security"); setNotice(null); }} type="button"><ShieldCheck className="size-4" />Password</button><div className="mt-2 border-t border-[#24272b] p-2"><SignOutButton /></div></aside>
        <div>{notice && <p className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${notice.error ? "border-red-900/50 bg-red-950/20 text-red-300" : "border-[#3a3f46] bg-[#181a1d] text-zinc-200"}`}>{!notice.error && <Check className="size-4" />}{notice.text}</p>}
          {section === "profile" ? <Card title="Personal information" description="Update the details attached to your member account."><form className="mt-7 space-y-5" onSubmit={saveProfile}><Label text="Display name"><input className={fieldClass} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required value={profile.name} /></Label><Label text="Username"><input autoCapitalize="none" className={fieldClass} onChange={(event) => setProfile({ ...profile, username: event.target.value.toLowerCase() })} required value={profile.username} /></Label><Label text="Email"><input className={`${fieldClass} opacity-60`} disabled value={email || "No email connected"} /></Label><Submit busy={busy} label="Save profile" /></form></Card>
          : <Card title="Password" description="Change the password used for member sign-in."><form className="mt-7 space-y-5" onSubmit={savePassword}>{hasPassword && <Password label="Current password" show={visible.current} toggle={() => setVisible({ ...visible, current: !visible.current })} value={passwords.current} change={(value) => setPasswords({ ...passwords, current: value })} />}<Password label="New password" show={visible.next} toggle={() => setVisible({ ...visible, next: !visible.next })} value={passwords.next} change={(value) => setPasswords({ ...passwords, next: value })} /><Password label="Confirm new password" show={visible.confirm} toggle={() => setVisible({ ...visible, confirm: !visible.confirm })} value={passwords.confirm} change={(value) => setPasswords({ ...passwords, confirm: value })} /><p className="text-[11px] text-zinc-600">Use 8–72 characters with at least one letter and one number.</p><Submit busy={busy} label="Update password" /></form></Card>}
        </div>
      </div>
    </section>
  );
}

function Card({ children, description, title }: { children: React.ReactNode; description: string; title: string }) { return <article className="rounded-[26px] border border-[#24272b] bg-[#111315] p-5 sm:p-7"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm text-zinc-600">{description}</p>{children}</article>; }
function Label({ children, text }: { children: React.ReactNode; text: string }) { return <label className="block text-xs font-medium text-zinc-400">{text}{children}</label>; }
function Submit({ busy, label }: { busy: boolean; label: string }) { return <div className="flex justify-end border-t border-[#24272b] pt-5"><button className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black disabled:opacity-50" disabled={busy} type="submit"><Save className="size-4" />{busy ? "Saving…" : label}</button></div>; }
function Password({ change, label, show, toggle, value }: { change: (value: string) => void; label: string; show: boolean; toggle: () => void; value: string }) { return <Label text={label}><div className="relative"><input className={`${fieldClass} pr-11`} minLength={8} onChange={(event) => change(event.target.value)} required type={show ? "text" : "password"} value={value} /><button aria-label={`${show ? "Hide" : "Show"} ${label.toLowerCase()}`} className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center text-zinc-500" onClick={toggle} type="button">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></Label>; }
