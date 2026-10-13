import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { SettingsManager } from "@/components/settings/settings-manager";
import { Prisma, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Settings | Resync",
  description: "Manage organization settings, working hours, and administrator access.",
};

type StoredShift = { name: "Morning" | "Evening" | "Night"; start: string; end: string };

function readShifts(value: Prisma.JsonValue): StoredShift[] {
  if (!Array.isArray(value)) return [{ name: "Morning", start: "08:00", end: "16:00" }];
  const shifts = value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { name, start, end } = item;
    if ((name !== "Morning" && name !== "Evening" && name !== "Night") || typeof start !== "string" || typeof end !== "string") return [];
    return [{ name: name as StoredShift["name"], start, end }];
  });
  return shifts.length > 0 ? shifts : [{ name: "Morning", start: "08:00", end: "16:00" }];
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.role !== UserRole.ADMIN) redirect("/dashboard");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      email: true,
      passwordHash: true,
      organization: { select: { name: true, description: true, logoUrl: true, timezone: true, shifts: true } },
    },
  });
  if (!currentUser) redirect("/");
  if (!currentUser.organization) redirect("/onboarding");

  return (
    <AdminShell active="settings" organizationName={currentUser.organization.name} title="Settings" userName={currentUser.name ?? currentUser.username ?? "Administrator"}>
      <SettingsManager
        account={{
          name: currentUser.name ?? "Administrator",
          username: currentUser.username ?? "",
          email: currentUser.email ?? "",
          hasPassword: Boolean(currentUser.passwordHash),
        }}
        organization={{
          name: currentUser.organization.name,
          description: currentUser.organization.description ?? "",
          logoUrl: currentUser.organization.logoUrl ?? "",
          timezone: currentUser.organization.timezone,
          shifts: readShifts(currentUser.organization.shifts),
        }}
      />
    </AdminShell>
  );
}
