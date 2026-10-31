import { T } from "./language";
import type { Apartment } from "@/catalog/apartments";

const currency = new Intl.NumberFormat("ru-RU");

export function ApartmentPrice({
  apartment,
  className,
}: {
  apartment: Pick<Apartment, "priceMin" | "priceMax" | "pricingPeriod">;
  className?: string;
}) {
  const { priceMin, priceMax, pricingPeriod } = apartment;
  const price =
    priceMin === null
      ? "Цена по запросу"
      : priceMax !== null && priceMax !== priceMin
        ? `${currency.format(priceMin)}–${currency.format(priceMax)} ₸`
        : `${currency.format(priceMin)} ₸`;

  return (
    <span className={`apartment-price ${className ?? ""}`}>
      <T text={price} />
      {priceMin !== null && pricingPeriod !== "unconfirmed" && (
        <span className="ml-1 text-sm font-normal text-slate-500">
          / <T text={pricingPeriod === "day" ? "сутки" : "месяц"} />
        </span>
      )}
    </span>
  );
}
