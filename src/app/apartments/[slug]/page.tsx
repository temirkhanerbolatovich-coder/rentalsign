import { AvailabilityCalendar } from "@/components/availability-calendar";
import { T } from "@/components/language";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Images,
  Layers3,
  MapPin,
  DoorOpen,
  Wifi,
  ChevronDown,
} from "lucide-react";
import { apartments, findApartment } from "@/catalog/apartments";
import { ApartmentGallery } from "@/components/apartment-gallery";
import { ApartmentPrice } from "@/components/apartment-price";
import { DemoNotice } from "@/components/demo-notice";
import { Button } from "@/components/ui/button";

type ApartmentPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return apartments.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ApartmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const apartment = findApartment(slug);
  if (!apartment) return { title: "Квартира не найдена" };

  return {
    title: apartment.title,
    description: `${apartment.title}: фотографии, указанная стоимость и расположение. Условия и даты аренды согласуются с владельцем.`,
  };
}

export default async function ApartmentPage({ params }: ApartmentPageProps) {
  const { slug } = await params;
  const apartment = findApartment(slug);
  if (!apartment) notFound();

  return (
    <>
      <Link
        href="/apartments"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-amber-800 hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" /> <T text="Все квартиры" />
      </Link>
      <header className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          {apartment.residentialComplex && (
            <p className="mb-2 text-sm font-medium text-amber-800">
              {apartment.residentialComplex}
            </p>
          )}
          <h1 className="title-reveal text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            <T text={apartment.title} />
          </h1>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-600">
            <MapPin
              size={17}
              className="mt-0.5 shrink-0 text-amber-800"
              aria-hidden="true"
            />
            {apartment.address}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <span>
              <T text="Квартира" /> {apartment.unit}
            </span>
            <span>
              <T text="Подъезд" /> {apartment.entrance}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers3 size={16} aria-hidden="true" /> <T text="Этаж" />{" "}
              {apartment.floor}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Images size={16} aria-hidden="true" /> {apartment.photos.length}{" "}
              <T text="фото" />
            </span>
            {apartment.mapUrl && (
              <a
                href={apartment.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 font-medium text-amber-800 hover:underline"
              >
                <T text="Открыть в 2ГИС" />
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200/60 bg-[#fff9eb] px-5 py-4 lg:max-w-[340px]">
          <p className="mb-1 text-xs text-amber-900">
            <T text="Стоимость аренды" />
          </p>
          <ApartmentPrice
            apartment={apartment}
            className="block text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
          />
          <p className="mt-2 text-xs leading-5 text-slate-600">
            {apartment.priceMin === null ? (
              <T text="Стоимость уточняется у владельца." />
            ) : (
              <T text="Указанная владельцем цена." />
            )}{" "}
            {apartment.pricingPeriod === "unconfirmed" && (
              <T text="Период аренды и итоговую стоимость нужно согласовать." />
            )}
          </p>
        </div>
      </header>

      <ApartmentGallery photos={apartment.photos} address={apartment.address} />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <AvailabilityCalendar slug={apartment.slug} />
          {(apartment.arrivalInstructions || apartment.wifi) && (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              aria-labelledby="guest-information-title"
            >
              <h2
                id="guest-information-title"
                className="mb-4 text-lg font-semibold text-slate-900"
              >
                <T text="Информация для гостей" />
              </h2>
              <div className="space-y-3">
                {apartment.arrivalInstructions && (
                  <details className="guest-details rounded-xl border border-stone-200/80 bg-[#fdfbf7]">
                    <summary className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-amber-800">
                      <DoorOpen
                        size={19}
                        className="shrink-0 text-amber-800"
                        aria-hidden="true"
                      />
                      <span className="flex-1">
                        <T text="Вход и домофон" />
                      </span>
                      <ChevronDown
                        size={17}
                        className="guest-details-chevron shrink-0"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="border-t border-stone-200/60 px-4 py-4 text-sm leading-7 text-slate-600">
                      <T text={apartment.arrivalInstructions} />
                    </p>
                  </details>
                )}
                {apartment.wifi && (
                  <details className="guest-details rounded-xl border border-stone-200/80 bg-[#fdfbf7]">
                    <summary className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-amber-800">
                      <Wifi
                        size={19}
                        className="shrink-0 text-amber-800"
                        aria-hidden="true"
                      />
                      <span className="flex-1">
                        <T text="Wi-Fi для гостей" />
                      </span>
                      <ChevronDown
                        size={17}
                        className="guest-details-chevron shrink-0"
                        aria-hidden="true"
                      />
                    </summary>
                    <dl className="space-y-3 border-t border-stone-200/60 px-4 py-4 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">
                          <T text="Сеть:" />
                        </dt>
                        <dd className="mt-1 break-all font-medium text-slate-900">
                          {apartment.wifi.network}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">
                          <T text="Пароль:" />
                        </dt>
                        <dd className="mt-1 break-all font-medium text-slate-900">
                          {apartment.wifi.password}
                        </dd>
                      </div>
                    </dl>
                  </details>
                )}
              </div>
            </section>
          )}
        </div>
        <aside
          className="space-y-5 lg:sticky lg:top-6"
          aria-labelledby="apartment-stay-title"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2
              id="apartment-stay-title"
              className="text-lg font-semibold text-slate-900"
            >
              <T text="Понравилась квартира?" />
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              <T text="Сначала согласуйте с владельцем даты, стоимость и условия проживания. После этого владелец подготовит договор и отправит персональную ссылку." />
            </p>
            {apartment.mapUrl && (
              <Button
                asChild
                variant="outline"
                className="mt-5 w-full whitespace-normal text-center"
              >
                <a
                  href={apartment.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Открыть в 2ГИС (новая вкладка)"
                >
                  <MapPin aria-hidden="true" />
                  <T text="Посмотреть на карте 2ГИС" />
                  <ArrowUpRight className="shrink-0" aria-hidden="true" />
                </a>
              </Button>
            )}
          </section>
          <section
            className="rounded-2xl border border-dashed border-stone-300/80 p-5"
            aria-labelledby="apartment-owner-title"
          >
            <h2
              id="apartment-owner-title"
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
            >
              <FileText size={17} aria-hidden="true" />
              <T text="Для владельца квартиры" />
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              <T text="После входа выбранная квартира будет передана в форму договора." />
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-4 w-full whitespace-normal"
            >
              <Link
                href={`/login?apartment=${encodeURIComponent(apartment.slug)}`}
              >
                <T text="Подготовить договор" />
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </section>
        </aside>
      </div>

      <section
        className="mt-10 border-t border-stone-200 pt-8"
        aria-labelledby="apartment-contract-flow-title"
      >
        <h2
          id="apartment-contract-flow-title"
          className="text-xl font-semibold tracking-tight text-slate-900"
        >
          <T text="От выбора квартиры к договору" />
        </h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Выберите квартиру",
              text: "Изучите фотографии, указанную цену и расположение на карте.",
            },
            {
              title: "Согласуйте условия",
              text: "Обсудите с владельцем даты, итоговую стоимость, залог и другие условия аренды.",
            },
            {
              title: "Получите ссылку на договор",
              text: "Владелец заполнит договор и отправит персональную ссылку для проверки, демоподписания и скачивания PDF.",
            },
          ].map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-100/70 text-sm font-semibold text-amber-950">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  <T text={step.title} />
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  <T text={step.text} />
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-7">
          <DemoNotice />
        </div>
      </section>
    </>
  );
}
