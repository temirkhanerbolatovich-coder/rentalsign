import { Prisma } from "@prisma/client";
import { findApartment } from "@/catalog/apartments";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { catalogOwnerEmail } from "@/services/property-photos";
import { catalogListingSchema } from "@/validation/catalog-listing";

export async function saveCatalogListing(
  ownerId: string,
  propertyId: string,
  input: unknown,
) {
  const { revision, ...values } = catalogListingSchema.parse(input);
  const email = catalogOwnerEmail();
  if (!email) throw new AppError(403, "Владелец каталога не настроен");
  try {
    return await db.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: { id: propertyId, ownerId, owner: { email }, archived: false },
        select: { id: true, catalogSlug: true },
      });
      if (!property?.catalogSlug || !findApartment(property.catalogSlug))
        throw new AppError(404, "Квартира каталога не найдена");
      if (revision === 0) {
        await tx.catalogListing.create({ data: { propertyId, ...values } });
      } else {
        const updated = await tx.catalogListing.updateMany({
          where: { propertyId, revision },
          data: { ...values, revision: { increment: 1 } },
        });
        if (!updated.count)
          throw new AppError(409, "Карточка изменилась. Обновите страницу");
      }
      await tx.property.update({
        where: { id: propertyId },
        data: { address: values.address },
      });
      return { revision: revision + 1 };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    )
      throw new AppError(409, "Карточка изменилась. Обновите страницу");
    throw error;
  }
}
