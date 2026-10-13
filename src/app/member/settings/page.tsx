import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberSettings } from "@/components/member/member-settings";
import { MemberShell } from "@/components/member/member-shell";
import { getMemberWorkspace } from "@/lib/auth/member-workspace";

export const metadata: Metadata = { title: "Profile & Settings | Resync", description: "Manage your member profile and password." };

export default async function MemberSettingsPage() {
  const context = await getMemberWorkspace();
  if (!context.ok) redirect(context.destination);
  const userName = context.user.name ?? context.user.username ?? "Member";
  return <MemberShell active="settings" organizationName={context.organization.name} title="Profile & Settings" userName={userName}><MemberSettings email={context.user.email ?? ""} hasPassword={Boolean(context.user.passwordHash)} name={userName} username={context.user.username ?? ""} /></MemberShell>;
}
