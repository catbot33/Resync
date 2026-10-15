-- Track the individual unit used when a resource has a quantity above one.
ALTER TABLE "Reservation"
ADD COLUMN "resourceUnit" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "Reservation_resourceId_resourceUnit_startTime_endTime_idx"
ON "Reservation"("resourceId", "resourceUnit", "startTime", "endTime");
