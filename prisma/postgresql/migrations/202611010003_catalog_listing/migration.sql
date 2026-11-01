CREATE TABLE "CatalogListing" (
    "propertyId" TEXT NOT NULL PRIMARY KEY,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "arrivalInstructions" TEXT,
    "mapUrl" TEXT,
    "priceMin" INTEGER,
    "priceMax" INTEGER,
    CONSTRAINT "CatalogListing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
