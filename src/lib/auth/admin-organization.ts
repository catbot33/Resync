import "server-only";

import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getAdminOrganization() {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to continue.", status: 401 as const };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, organizationId: true },
  });

  if (!user || user.role !== UserRole.ADMIN) {
    return { ok: false as const, error: "Administrator access is required.", status: 403 as const };
  }

  if (!user.organizationId) {
    return { ok: false as const, error: "Create your organization first.", status: 409 as const };
  }

  return { ok: true as const, organizationId: user.organizationId, userId: session.user.id };
}
