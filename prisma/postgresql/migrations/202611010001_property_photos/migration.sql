CREATE TABLE "PropertyGallery" (
  "propertyId" TEXT NOT NULL PRIMARY KEY REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "PropertyPhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES "PropertyGallery"("propertyId") ON DELETE CASCADE ON UPDATE CASCADE,
  "position" INTEGER NOT NULL,
  "staticSrc" TEXT,
  "data" BYTEA,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "alt" TEXT NOT NULL
);
CREATE INDEX "PropertyPhoto_propertyId_position_idx" ON "PropertyPhoto"("propertyId", "position");
