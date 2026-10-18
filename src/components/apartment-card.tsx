import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Images, Layers3, MapPin } from "lucide-react";
import type { Apartment } from "@/catalog/apartments";
import { ApartmentPrice } from "@/components/apartment-price";

export function ApartmentCard({
  apartment,
  preload = false,
}: {
  apartment: Apartment;
  preload?: boolean;
}) {
  const photo = apartment.photos[0];
  const href = `/apartments/${apartment.slug}`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg hover:shadow-slate-200/60">
      <Link
        href={href}
        aria-label={`Фотографии и описание: ${apartment.title}`}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            preload={preload}
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025]"
          />
        )}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1.5 text-xs font-medium text-white">
          <Images size={14} aria-hidden="true" />
          {apartment.photos.length} фото
        </span>
      </Link>
      <div className="p-5">
        {apartment.residentialComplex && (
          <p className="mb-2 text-xs font-medium text-teal-700">
            {apartment.residentialComplex}
          </p>
        )}
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-slate-900">
          <Link
            href={href}
            className="hover:text-teal-700 focus-visible:outline-teal-700"
          >
            {apartment.title}
          </Link>
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Квартира {apartment.unit} · Подъезд {apartment.entrance}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Layers3 size={14} aria-hidden="true" />
            Этаж {apartment.floor}
          </span>
          {apartment.mapUrl && (
            <a
              href={apartment.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${apartment.address} в 2ГИС (откроется в новой вкладке)`}
              className="inline-flex items-center gap-1 text-teal-700 hover:underline"
            >
              <MapPin size={14} aria-hidden="true" />
              На карте 2ГИС
            </a>
          )}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <ApartmentPrice
            apartment={apartment}
            className="block text-xl font-semibold tracking-tight text-slate-900"
          />
          {apartment.priceMin !== null &&
            apartment.pricingPeriod === "unconfirmed" && (
              <p className="mt-1 text-xs text-slate-500">
                Период аренды уточняется
              </p>
            )}
          <Link
            href={href}
            className="mt-4 flex min-h-10 items-center justify-between rounded-lg bg-teal-50 px-3 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Подробнее
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
