import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { catalogOwnerEmail } from "@/services/property-photos";

const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Almaty",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function dateInKazakhstan(value: Date) {
  const parts = localDate.formatToParts(value);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join("-");
}

/** A whole-day calendar marks both the check-in and check-out dates as reserved. */
export function contractCalendarDates(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  )
    throw new AppError(503, "Не удалось загрузить календарь");
  const startDate = dateInKazakhstan(start);
  const endDate = dateInKazakhstan(end);
  return { startDate, endDate };
}

type Filter =
  | { ownerId: string; catalogSlug?: never }
  | { catalogSlug: string; ownerId?: never };
export async function contractReservations(filter: Filter, now = new Date()) {
  const publicOwner = filter.catalogSlug ? catalogOwnerEmail() : "";
  if (filter.catalogSlug && !publicOwner) return [];
  const contracts = await db.contract.findMany({
    where: {
      status: { in: ["PENDING", "DEMO_SIGNED"] },
      ...(filter.ownerId
        ? { ownerId: filter.ownerId }
        : {
            property: {
              catalogSlug: filter.catalogSlug,
              owner: { email: publicOwner },
            },
          }),
    },
    select: {
      id: true,
      status: true,
      property: { select: { name: true, catalogSlug: true } },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          snapshot: true,
          link: { select: { expiresAt: true, revokedAt: true } },
        },
      },
    },
  });
  return contracts
    .flatMap((contract) => {
      const version = contract.versions[0];
      if (!version) throw new AppError(503, "Не удалось загрузить календарь");
      if (
        contract.status === "PENDING" &&
        (!version.link ||
          version.link.revokedAt ||
          version.link.expiresAt <= now)
      )
        return [];
      let snapshot: { checkIn?: unknown; checkOut?: unknown };
      try {
        snapshot = JSON.parse(version.snapshot);
      } catch {
        throw new AppError(503, "Не удалось загрузить календарь");
      }
      if (
        typeof snapshot?.checkIn !== "string" ||
        typeof snapshot?.checkOut !== "string"
      )
        throw new AppError(503, "Не удалось загрузить календарь");
      return [
        {
          id: contract.id,
          propertyName: contract.property.name,
          catalogSlug: contract.property.catalogSlug,
          ...contractCalendarDates(snapshot.checkIn, snapshot.checkOut),
          status: "reserved" as const,
        },
      ];
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
