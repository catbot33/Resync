import "server-only";

import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getMemberWorkspace() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, destination: "/" };
  if (session.user.role !== UserRole.MEMBER) return { ok: false as const, destination: "/dashboard" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      passwordHash: true,
      isActive: true,
      organization: { select: { id: true, name: true, timezone: true, shifts: true } },
    },
  });
  if (!user?.isActive || !user.organization) return { ok: false as const, destination: "/" };

  return { ok: true as const, user, organization: user.organization };
}
