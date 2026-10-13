import { Prisma, ReservationStatus, UserRole } from "@/generated/prisma/client";
import { getReservationActor } from "@/lib/auth/reservation-actor";
import { prisma } from "@/lib/prisma";
import { updateReservationSchema } from "@/lib/reservations/validation";

class ReservationConflictError extends Error {}
class ReservationReferenceError extends Error {}

interface RouteContext {
  params: Promise<{ reservationId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const actor = await getReservationActor();
  if (!actor.ok) return Response.json({ message: actor.error }, { status: actor.status });

  const parsed = updateReservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the reservation details." }, { status: 400 });
  }

  const { reservationId } = await params;
  const existing = await prisma.reservation.findFirst({
    where: { id: reservationId, organizationId: actor.organizationId },
  });
  if (!existing) return Response.json({ message: "Reservation not found." }, { status: 404 });
  if (actor.role !== UserRole.ADMIN && existing.userId !== actor.userId) {
    return Response.json({ message: "You can only change your own reservations." }, { status: 403 });
  }
  if (actor.role !== UserRole.ADMIN && (existing.status === ReservationStatus.CANCELLED || existing.status === ReservationStatus.COMPLETED || existing.startTime <= new Date())) {
    return Response.json({ message: "Only upcoming reservations can be changed." }, { status: 409 });
  }

  const startTime = parsed.data.startTime ? new Date(parsed.data.startTime) : existing.startTime;
  const endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : existing.endTime;
  if (startTime >= endTime || endTime.getTime() - startTime.getTime() > 24 * 60 * 60 * 1000) {
    return Response.json({ message: "Choose an end time after the start, within 24 hours." }, { status: 400 });
  }
  if (actor.role !== UserRole.ADMIN && startTime < new Date()) {
    return Response.json({ message: "Choose a future reservation time." }, { status: 400 });
  }

  const resourceId = parsed.data.resourceId ?? existing.resourceId;
  const bookingUserId = actor.role === UserRole.ADMIN ? (parsed.data.userId ?? existing.userId) : actor.userId;

  try {
    const reservation = await prisma.$transaction(async (transaction) => {
      const [resource, bookingUser] = await Promise.all([
        transaction.resource.findFirst({
          where: { id: resourceId, organizationId: actor.organizationId, isActive: true },
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
          id: { not: reservationId },
          resourceId,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (overlapping >= resource.quantity) throw new ReservationConflictError();

      return transaction.reservation.update({
        where: { id: reservationId },
        data: {
          resourceId,
          userId: bookingUserId,
          startTime,
          endTime,
          purpose: parsed.data.purpose === undefined ? existing.purpose : parsed.data.purpose || null,
          attendeeCount: parsed.data.attendeeCount ?? existing.attendeeCount,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return Response.json({ reservation });
  } catch (error) {
    if (error instanceof ReservationConflictError || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
      return Response.json({ message: "That resource is already fully reserved for this time." }, { status: 409 });
    }
    if (error instanceof ReservationReferenceError) {
      return Response.json({ message: "Choose an active resource and employee in your organization." }, { status: 400 });
    }
    console.error("Reservation update failed", error);
    return Response.json({ message: "We could not update the reservation." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const actor = await getReservationActor();
  if (!actor.ok) return Response.json({ message: actor.error }, { status: actor.status });

  const { reservationId } = await params;
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, organizationId: actor.organizationId },
    select: { id: true, userId: true, status: true },
  });
  if (!reservation) return Response.json({ message: "Reservation not found." }, { status: 404 });
  if (actor.role !== UserRole.ADMIN && reservation.userId !== actor.userId) {
    return Response.json({ message: "You can only cancel your own reservations." }, { status: 403 });
  }
  if (actor.role !== UserRole.ADMIN && (reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.COMPLETED)) {
    return Response.json({ message: "Only upcoming or active reservations can be cancelled." }, { status: 409 });
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: ReservationStatus.CANCELLED },
  });
  return new Response(null, { status: 204 });
}
