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
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md hover:shadow-slate-200/50">
      <Link
        href={href}
        aria-label={`Фотографии и описание: ${apartment.title}`}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {photo ? (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            preload={preload}
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025]"
          />
        ) : <span className="grid h-full place-items-center text-sm text-slate-600">Фото отсутствует</span>}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1.5 text-xs font-medium text-white">
          <Images size={14} aria-hidden="true" />
          {apartment.photos.length} фото
        </span>
      </Link>
      <div className="p-5">
        <ApartmentPrice
          apartment={apartment}
          className="block text-xl font-semibold tracking-tight text-slate-900"
        />
        {apartment.priceMin !== null && apartment.pricingPeriod === "unconfirmed" && (
          <p className="mt-1 text-xs text-slate-600">Период аренды уточняется</p>
        )}
        {apartment.residentialComplex && (
          <p className="mt-4 text-xs font-medium text-amber-800">
            {apartment.residentialComplex}
          </p>
        )}
        <h2 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-slate-900">
          <Link
            href={href}
            className="hover:text-blue-800 hover:underline focus-visible:outline-blue-700"
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
              className="inline-flex min-h-11 items-center gap-1 text-blue-800 hover:underline"
            >
              <MapPin size={14} aria-hidden="true" />
              На карте 2ГИС
            </a>
          )}
        </div>
        <div className="border-t border-slate-100 pt-2">
          <Link
            href={href}
            className="flex min-h-11 items-center justify-between rounded-lg bg-amber-100 px-3 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Подробнее
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
