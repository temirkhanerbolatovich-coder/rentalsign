import { findApartment, type Apartment } from "@/catalog/apartments";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RENT = 100_000_000;

/** Catalog rates are per 24 hours; a partial day is billed as a full day. */
export function catalogRent(
  catalogSlug: string | null | undefined,
  checkIn: string,
  checkOut: string,
  currentApartment?: Apartment | null,
) {
  const apartment =
    currentApartment ?? (catalogSlug ? findApartment(catalogSlug) : undefined);
  if (
    !apartment ||
    apartment.pricingPeriod !== "day" ||
    apartment.priceMin === null
  )
    return null;
  const duration = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const days = Math.ceil(duration / DAY_MS);
  const total = days * apartment.priceMin;
  if (!Number.isSafeInteger(total) || total > MAX_RENT) return null;
  return {
    days,
    dailyRate: apartment.priceMin,
    maxDailyRate: apartment.priceMax,
    total,
  };
}
