import { Prisma, UserRole } from "@/generated/prisma/client";
import { getReservationActor } from "@/lib/auth/reservation-actor";
import { prisma } from "@/lib/prisma";
import { adminProfileSchema } from "@/lib/settings/validation";

export async function PATCH(request: Request) {
  const actor = await getReservationActor();
  if (!actor.ok) return Response.json({ message: actor.error }, { status: actor.status });
  if (actor.role !== UserRole.MEMBER) return Response.json({ message: "Member access is required." }, { status: 403 });
  const parsed = adminProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: parsed.error.issues[0]?.message ?? "Check your profile details." }, { status: 400 });

  try {
    const user = await prisma.user.update({ where: { id: actor.userId }, data: parsed.data, select: { id: true, name: true, username: true, email: true } });
    return Response.json({ message: "Profile saved.", user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ message: "That username is already in use." }, { status: 409 });
    console.error("Member profile update failed", error);
    return Response.json({ message: "We could not save your profile." }, { status: 500 });
  }
}
