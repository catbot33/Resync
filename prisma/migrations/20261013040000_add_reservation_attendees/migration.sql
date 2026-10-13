-- Store booking size for the reservation editor and future member view.
ALTER TABLE "Reservation" ADD COLUMN "attendeeCount" INTEGER NOT NULL DEFAULT 1;
