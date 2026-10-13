import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { ResourceManager } from "@/components/resources/resource-manager";
import { UserRole } from "@/generated/prisma/client";
import { getAdminResources } from "@/lib/dashboard/resources";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Resources | Resync",
  description: "Manage organization resources, categories, quantities, and availability.",
};

export default async function ResourcesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.role !== UserRole.ADMIN) redirect("/dashboard");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      organization: { select: { id: true, name: true } },
    },
  });

  if (!currentUser) redirect("/");
  if (!currentUser.organization) redirect("/onboarding");

  const data = await getAdminResources(currentUser.organization.id);

  return (
    <AdminShell active="resources" organizationName={currentUser.organization.name} title="Resources" userName={currentUser.name ?? currentUser.username ?? "Administrator"}>
      <ResourceManager categories={data.categories} initialResources={data.resources} stats={data.stats} />
    </AdminShell>
  );
}
