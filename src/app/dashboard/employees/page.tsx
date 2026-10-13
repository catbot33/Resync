import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminShell } from "@/components/dashboard/admin-shell";
import { EmployeeManager } from "@/components/employees/employee-manager";
import { UserRole } from "@/generated/prisma/client";
import { getAdminEmployees } from "@/lib/dashboard/employees";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Employees | Resync",
  description: "Manage organization employees, access, passwords, and reservation history.",
};

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.role !== UserRole.ADMIN) redirect("/dashboard");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      organization: { select: { id: true, name: true, timezone: true } },
    },
  });

  if (!currentUser) redirect("/");
  if (!currentUser.organization) redirect("/onboarding");

  const data = await getAdminEmployees(currentUser.organization.id);

  return (
    <AdminShell active="employees" organizationName={currentUser.organization.name} title="Employees" userName={currentUser.name ?? currentUser.username ?? "Administrator"}>
      <EmployeeManager employees={data.employees} stats={data.stats} timezone={currentUser.organization.timezone} />
    </AdminShell>
  );
}
