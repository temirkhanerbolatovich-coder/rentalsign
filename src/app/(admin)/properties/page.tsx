import { requirePageAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { findApartment } from "@/catalog/apartments";
import { PropertiesManager } from "@/components/properties-manager";
import {
  catalogOwnerEmail,
  getPropertyGallery,
  getCatalogApartments,
} from "@/services/property-photos";
import type { PropertyInput } from "@/validation/schemas";
export default async function Properties() {
  const admin = await requirePageAdmin();
  const properties = await db.property.findMany({
    where: { ownerId: admin.id },
    orderBy: { createdAt: "desc" },
  });
  const catalog = await getCatalogApartments();
  const listings = await db.catalogListing.findMany({
    where: { property: { ownerId: admin.id } },
    select: { propertyId: true, revision: true },
  });
  return (
    <PropertiesManager
      properties={await Promise.all(
        properties.map(async (p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          type: p.type as PropertyInput["type"],
          unit: p.unit,
          description: p.description,
          rent: p.rent,
          deposit: p.deposit,
          archived: p.archived,
          catalogSlug: p.catalogSlug,
          catalogApartment:
            catalog.find((entry) => entry.slug === p.catalogSlug) ?? null,
          listingRevision:
            listings.find((entry) => entry.propertyId === p.id)?.revision ?? 0,
          gallery: await getPropertyGallery(p),
          publishesPhotos: Boolean(
            p.catalogSlug &&
            findApartment(p.catalogSlug) &&
            catalogOwnerEmail() &&
            admin.email.toLowerCase() === catalogOwnerEmail(),
          ),
        })),
      )}
    />
  );
}
