import { Prisma, UserRole } from "@/generated/prisma/client";
import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { employeeUpdateSchema } from "@/lib/employees/validation";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ employeeId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const context = await getAdminOrganization();
  if (!context.ok) {
    return Response.json({ message: context.error }, { status: context.status });
  }

  const parsed = employeeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the employee details." }, { status: 400 });
  }

  const { employeeId } = await params;
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, organizationId: context.organizationId, role: UserRole.MEMBER },
    select: { id: true },
  });

  if (!employee) {
    return Response.json({ message: "Employee not found." }, { status: 404 });
  }

  try {
    const updatedEmployee = await prisma.user.update({
      where: { id: employee.id },
      data: parsed.data,
      select: { id: true, name: true, username: true, isActive: true },
    });

    return Response.json({ employee: updatedEmployee });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ message: "That username is already in use." }, { status: 409 });
    }

    console.error("Employee update failed", error);
    return Response.json({ message: "We could not update the employee." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const context = await getAdminOrganization();
  if (!context.ok) {
    return Response.json({ message: context.error }, { status: context.status });
  }

  const { employeeId } = await params;
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, organizationId: context.organizationId, role: UserRole.MEMBER },
    select: { id: true, _count: { select: { reservations: true } } },
  });

  if (!employee) {
    return Response.json({ message: "Employee not found." }, { status: 404 });
  }

  // Preserve historical bookings and their audit trail.
  if (employee._count.reservations > 0) {
    return Response.json({ message: "This employee has reservation history. Deactivate the account instead." }, { status: 409 });
  }

  await prisma.user.delete({ where: { id: employee.id } });
  return new Response(null, { status: 204 });
}
