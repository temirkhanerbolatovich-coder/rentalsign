CREATE TABLE "Availability" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "catalogSlug" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Availability_catalogSlug_startDate_endDate_idx" ON "Availability"("catalogSlug", "startDate", "endDate");
CREATE INDEX "Availability_ownerId_idx" ON "Availability"("ownerId");
