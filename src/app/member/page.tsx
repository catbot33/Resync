import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberOverview } from "@/components/member/member-overview";
import { MemberShell } from "@/components/member/member-shell";
import { getMemberWorkspace } from "@/lib/auth/member-workspace";
import { getMemberDashboard } from "@/lib/member/data";

export const metadata: Metadata = { title: "Member Dashboard | Resync", description: "Your active and upcoming resource reservations." };

export default async function MemberDashboardPage() {
  const context = await getMemberWorkspace();
  if (!context.ok) redirect(context.destination);
  const data = await getMemberDashboard(context.organization.id, context.user.id);
  const userName = context.user.name ?? context.user.username ?? "Member";
  return <MemberShell active="dashboard" organizationName={context.organization.name} title="Dashboard" userName={userName}><MemberOverview {...data} timezone={context.organization.timezone} userName={userName} /></MemberShell>;
}
