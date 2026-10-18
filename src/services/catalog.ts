import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { findApartment } from "@/catalog/apartments";
import { Prisma } from "@prisma/client";

/** Explicit owner action: link a public listing to a private contract object once. */
export async function ensureCatalogProperty(ownerId: string, slug: string) {
  const apartment = findApartment(slug);
  if (!apartment) throw new AppError(404, "Квартира не найдена");
  const key = { ownerId_catalogSlug: { ownerId, catalogSlug: apartment.slug } };
  const property = await db.property
    .upsert({
      where: key,
      update: {},
      create: {
        ownerId,
        catalogSlug: apartment.slug,
        name: `${apartment.address}, кв. ${apartment.unit}`,
        address: apartment.address,
        type: "APARTMENT",
        unit: apartment.unit,
        description: `Подъезд ${apartment.entrance}, этаж ${apartment.floor}.`,
        // A listing rate is not the total for the dates in a contract.
        rent: 0,
        deposit: 0,
      },
    })
    .catch(async (error: unknown) => {
      // Empty-update upserts can race on first creation; the unique key decides the winner.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await db.property.findUnique({ where: key });
        if (existing) return existing;
      }
      throw error;
    });
  if (property.archived)
    throw new AppError(
      409,
      "Объект в архиве. Восстановите его в разделе «Объекты»",
    );
  return property;
}
