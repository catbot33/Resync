import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberReservations } from "@/components/member/member-reservations";
import { MemberShell } from "@/components/member/member-shell";
import { getMemberWorkspace } from "@/lib/auth/member-workspace";
import { getMemberReservations, getMemberResources } from "@/lib/member/data";

export const metadata: Metadata = { title: "My Reservations | Resync", description: "View and manage your resource reservations." };

export default async function MemberReservationsPage() {
  const context = await getMemberWorkspace();
  if (!context.ok) redirect(context.destination);
  const [reservations, resources] = await Promise.all([getMemberReservations(context.organization.id, context.user.id), getMemberResources(context.organization.id)]);
  return <MemberShell active="reservations" organizationName={context.organization.name} title="My Reservations" userName={context.user.name ?? context.user.username ?? "Member"}><MemberReservations reservations={reservations} resources={resources} timezone={context.organization.timezone} userId={context.user.id} /></MemberShell>;
}
