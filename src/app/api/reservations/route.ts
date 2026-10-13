import { Prisma, ReservationStatus, UserRole } from "@/generated/prisma/client";
import { getReservationActor } from "@/lib/auth/reservation-actor";
import { prisma } from "@/lib/prisma";
import { createReservationSchema } from "@/lib/reservations/validation";

class ReservationConflictError extends Error {}
class ReservationReferenceError extends Error {}

export async function POST(request: Request) {
  const actor = await getReservationActor();
  if (!actor.ok) return Response.json({ message: actor.error }, { status: actor.status });

  const parsed = createReservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the reservation details." }, { status: 400 });
  }

  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(parsed.data.endTime);
  if (startTime >= endTime || endTime.getTime() - startTime.getTime() > 24 * 60 * 60 * 1000) {
    return Response.json({ message: "Choose an end time after the start, within 24 hours." }, { status: 400 });
  }
  if (startTime < new Date()) {
    return Response.json({ message: "Choose a future reservation time." }, { status: 400 });
  }

  const bookingUserId = actor.role === UserRole.ADMIN ? parsed.data.userId : actor.userId;

  try {
    const reservation = await prisma.$transaction(async (transaction) => {
      const [resource, bookingUser] = await Promise.all([
        transaction.resource.findFirst({
          where: { id: parsed.data.resourceId, organizationId: actor.organizationId, isActive: true },
          select: { id: true, quantity: true },
        }),
        transaction.user.findFirst({
          where: { id: bookingUserId, organizationId: actor.organizationId, isActive: true },
          select: { id: true },
        }),
      ]);
      if (!resource || !bookingUser) throw new ReservationReferenceError();

      const overlapping = await transaction.reservation.count({
        where: {
          resourceId: resource.id,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (overlapping >= resource.quantity) throw new ReservationConflictError();

      return transaction.reservation.create({
        data: {
          organizationId: actor.organizationId,
          resourceId: resource.id,
          userId: bookingUser.id,
          startTime,
          endTime,
          purpose: parsed.data.purpose || null,
          attendeeCount: parsed.data.attendeeCount,
          status: ReservationStatus.CONFIRMED,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    if (error instanceof ReservationConflictError || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
      return Response.json({ message: "That resource is already fully reserved for this time." }, { status: 409 });
    }
    if (error instanceof ReservationReferenceError) {
      return Response.json({ message: "Choose an active resource and employee in your organization." }, { status: 400 });
    }
    console.error("Reservation creation failed", error);
    return Response.json({ message: "We could not create the reservation." }, { status: 500 });
  }
}
