import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberShell } from "@/components/member/member-shell";
import { ResourceExplorer } from "@/components/member/resource-explorer";
import { getMemberWorkspace } from "@/lib/auth/member-workspace";
import { getMemberResources } from "@/lib/member/data";

export const metadata: Metadata = { title: "Explore Resources | Resync", description: "Search available organization resources." };

export default async function MemberResourcesPage() {
  const context = await getMemberWorkspace();
  if (!context.ok) redirect(context.destination);
  const resources = await getMemberResources(context.organization.id);
  return <MemberShell active="resources" organizationName={context.organization.name} title="Explore Resources" userName={context.user.name ?? context.user.username ?? "Member"}><ResourceExplorer resources={resources} /></MemberShell>;
}
