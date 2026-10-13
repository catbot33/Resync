import { hash } from "bcryptjs";

import { UserRole } from "@/generated/prisma/client";
import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { employeePasswordSchema } from "@/lib/employees/validation";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ employeeId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const context = await getAdminOrganization();
  if (!context.ok) {
    return Response.json({ message: context.error }, { status: context.status });
  }

  const parsed = employeePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the new password." }, { status: 400 });
  }

  const { employeeId } = await params;
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, organizationId: context.organizationId, role: UserRole.MEMBER },
    select: { id: true },
  });

  if (!employee) {
    return Response.json({ message: "Employee not found." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: employee.id },
    data: { passwordHash: await hash(parsed.data.password, 12) },
  });

  return Response.json({ message: "Password updated." });
}
