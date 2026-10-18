ALTER TABLE "Property" ADD COLUMN "catalogSlug" TEXT;

CREATE UNIQUE INDEX "Property_ownerId_catalogSlug_key" ON "Property"("ownerId", "catalogSlug");
