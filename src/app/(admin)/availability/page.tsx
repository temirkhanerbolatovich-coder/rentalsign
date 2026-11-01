import { requirePageAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { getCatalogApartments } from "@/services/property-photos";
import { contractReservations } from "@/services/contract-availability";
import { AvailabilityManager } from "@/components/availability-manager";
export default async function AvailabilityPage() {
  const admin = await requirePageAdmin();
  const [properties, periods, bookings, apartments] = await Promise.all([
    db.property.findMany({
      where: { ownerId: admin.id },
      select: { id: true, name: true, catalogSlug: true, archived: true },
      orderBy: { name: "asc" },
    }),
    db.availability.findMany({
      where: { ownerId: admin.id },
      orderBy: { startDate: "asc" },
    }),
    contractReservations({ ownerId: admin.id }),
    getCatalogApartments(),
  ]);
  return (
    <AvailabilityManager
      apartments={apartments
        .filter((a) =>
          properties.some((p) => !p.archived && p.catalogSlug === a.slug),
        )
        .map(({ slug, title }) => ({ slug, title }))}
      properties={properties
        .filter(
          (property) =>
            !property.archived ||
            bookings.some((booking) => booking.propertyId === property.id) ||
            periods.some(
              (period) =>
                period.catalogSlug === property.catalogSlug &&
                property.catalogSlug !== null,
            ),
        )
        .map(({ id, name }) => ({ id, name }))}
      bookings={bookings}
      periods={periods.map(
        ({ id, catalogSlug, startDate, endDate, status }) => ({
          id,
          catalogSlug,
          propertyId:
            properties.find((property) => property.catalogSlug === catalogSlug)
              ?.id ?? null,
          startDate,
          endDate,
          status,
        }),
      )}
    />
  );
}
