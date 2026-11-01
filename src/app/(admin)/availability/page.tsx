import { requirePageAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { getCatalogApartments } from "@/services/property-photos";
import { contractReservations } from "@/services/contract-availability";
import { AvailabilityManager } from "@/components/availability-manager";
export default async function AvailabilityPage() {
  const admin = await requirePageAdmin();
  const [properties, periods, bookings, apartments] = await Promise.all([
    db.property.findMany({
      where: { ownerId: admin.id, archived: false },
      select: { catalogSlug: true },
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
        .filter((a) => properties.some((p) => p.catalogSlug === a.slug))
        .map(({ slug, title }) => ({ slug, title }))}
      bookings={bookings}
      periods={periods.map(
        ({ id, catalogSlug, startDate, endDate, status }) => ({
          id,
          catalogSlug,
          startDate,
          endDate,
          status,
        }),
      )}
    />
  );
}
