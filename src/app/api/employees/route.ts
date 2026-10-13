import { hash } from "bcryptjs";

import { Prisma, UserRole } from "@/generated/prisma/client";
import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { employeeSchema } from "@/lib/employees/validation";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const context = await getAdminOrganization();
  if (!context.ok) {
    return Response.json({ message: context.error }, { status: context.status });
  }

  const parsed = employeeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the employee details." }, { status: 400 });
  }

  try {
    const employee = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
        // Plaintext passwords never leave this request handler.
        passwordHash: await hash(parsed.data.password, 12),
        isActive: parsed.data.isActive,
        role: UserRole.MEMBER,
        organizationId: context.organizationId,
      },
      select: { id: true, name: true, username: true, isActive: true },
    });

    return Response.json({ employee }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ message: "That username is already in use." }, { status: 409 });
    }

    console.error("Employee creation failed", error);
    return Response.json({ message: "We could not add the employee." }, { status: 500 });
  }
}
