import { compare, hash } from "bcryptjs";

import { UserRole } from "@/generated/prisma/client";
import { getReservationActor } from "@/lib/auth/reservation-actor";
import { prisma } from "@/lib/prisma";
import { adminPasswordSchema } from "@/lib/settings/validation";

export async function PATCH(request: Request) {
  const actor = await getReservationActor();
  if (!actor.ok) return Response.json({ message: actor.error }, { status: actor.status });
  if (actor.role !== UserRole.MEMBER) return Response.json({ message: "Member access is required." }, { status: 403 });
  const parsed = adminPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the password." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { passwordHash: true } });
  if (!user) return Response.json({ message: "Your account could not be found." }, { status: 404 });
  if (user.passwordHash && (!parsed.data.currentPassword || !(await compare(parsed.data.currentPassword, user.passwordHash)))) return Response.json({ message: "The current password is incorrect." }, { status: 400 });

  await prisma.user.update({ where: { id: actor.userId }, data: { passwordHash: await hash(parsed.data.newPassword, 12) } });
  return Response.json({ message: "Password updated." });
}
