import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getReservationActor() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to continue.", status: 401 as const };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true, organizationId: true },
  });

  if (!user?.isActive || !user.organizationId) {
    return { ok: false as const, error: "An active organization account is required.", status: 403 as const };
  }

  return { ok: true as const, userId: user.id, role: user.role, organizationId: user.organizationId };
}
