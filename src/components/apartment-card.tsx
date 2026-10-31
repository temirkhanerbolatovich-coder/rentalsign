"use client";
import { T, translate, useLanguage } from "@/components/language";
import { ApartmentPhoto } from "./apartment-photo";
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
  const language = useLanguage();
  const photo = apartment.photos[0];
  const href = `/apartments/${apartment.slug}`;

  return (
    <article className="apartment-card group flex h-full flex-col overflow-hidden rounded-[20px] border border-stone-200/80 bg-white shadow-[0_3px_16px_-8px_#6b4b2525]">
      <Link
        href={href}
        aria-label={`${translate("Фотографии и описание:", language)} ${translate(apartment.title, language)}`}
        className="relative block aspect-[4/3] shrink-0 overflow-hidden bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {photo ? (
          <ApartmentPhoto
            src={photo.src}
            alt={photo.alt}
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            preload={preload}
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025]"
          />
        ) : (
          <span className="grid h-full place-items-center text-sm text-slate-600">
            {" "}
            <T text="Фото отсутствует" />{" "}
          </span>
        )}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1.5 text-xs font-medium text-white">
          <Images size={14} aria-hidden="true" />
          {apartment.photos.length} <T text="фото" />{" "}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="min-h-[72px]">
          <ApartmentPrice
            apartment={apartment}
            className="block text-2xl font-semibold tracking-tight text-slate-900"
          />
          {apartment.priceMin !== null &&
            apartment.pricingPeriod === "unconfirmed" && (
              <p className="mt-1 text-xs text-slate-600">
                {" "}
                <T text="Период аренды уточняется" />{" "}
              </p>
            )}
        </div>
        <div className="mt-1 min-h-5">
          {apartment.residentialComplex && (
            <p className="text-xs font-medium text-amber-800">
              {apartment.residentialComplex}
            </p>
          )}
        </div>
        <h2 className="mt-2 sm:min-h-14 text-lg font-semibold leading-snug tracking-tight text-slate-900">
          <Link
            href={href}
            className="hover:text-amber-800 hover:underline focus-visible:outline-amber-800"
          >
            <T text={apartment.title} />
          </Link>
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          {" "}
          <T text="Квартира" /> {apartment.unit} <T text="· Подъезд" />{" "}
          {apartment.entrance}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Layers3 size={14} aria-hidden="true" /> <T text="Этаж" />{" "}
            {apartment.floor}
          </span>
          {apartment.mapUrl && (
            <a
              href={apartment.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${apartment.address} · ${translate("2ГИС (откроется в новой вкладке)", language)}`}
              className="inline-flex min-h-11 items-center gap-1 text-amber-800 hover:underline"
            >
              <MapPin size={14} aria-hidden="true" />{" "}
              <T text="На карте 2ГИС" />{" "}
            </a>
          )}
        </div>
        <div className="mt-auto pt-4">
          <Link
            href={href}
            className="flex min-h-11 items-center justify-between rounded-xl border border-amber-200/70 bg-[#fbefcf] px-4 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {" "}
            <T text="Подробнее" /> <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
