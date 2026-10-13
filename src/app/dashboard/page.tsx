import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { UserRole } from "@/generated/prisma/client";
import { getAdminOverview } from "@/lib/dashboard/admin-overview";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Overview | Resync",
  description: "Organization resources, employees, availability, and reservations.",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      isActive: true,
      organization: { select: { id: true, name: true, timezone: true } },
    },
  });

  // A JWT can outlive a reset user, so confirm the database record still exists.
  if (!currentUser || !currentUser.isActive) {
    redirect("/");
  }

  if (session.user.role === UserRole.ADMIN) {
    if (!currentUser.organization) {
      redirect("/onboarding");
    }

    const overview = await getAdminOverview(currentUser.organization.id);

    return (
      <AdminOverview
        data={overview}
        organizationName={currentUser.organization.name}
        timezone={currentUser.organization.timezone}
        userName={currentUser.name ?? currentUser.username ?? "Administrator"}
      />
    );
  }

  redirect("/member");
}
