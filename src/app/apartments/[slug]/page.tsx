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
        className="mb-7 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-800"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Все квартиры
      </Link>
      <div className="mb-7">
        {apartment.residentialComplex && (
          <p className="mb-2 text-sm font-medium text-blue-800">
            {apartment.residentialComplex}
          </p>
        )}
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
          {apartment.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-600">
          <span>Квартира {apartment.unit}</span>
          <span>Подъезд {apartment.entrance}</span>
          <span className="inline-flex items-center gap-1.5">
            <Layers3 size={16} aria-hidden="true" /> Этаж {apartment.floor}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Images size={16} aria-hidden="true" /> {apartment.photos.length}{" "}
            фото
          </span>
          {apartment.mapUrl && (
            <a
              href={apartment.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-blue-800 hover:underline"
              aria-label="Открыть в 2ГИС (новая вкладка)"
            >
              <MapPin size={16} aria-hidden="true" /> Открыть в 2ГИС{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-9">
        <div className="min-w-0">
          <ApartmentGallery
            photos={apartment.photos}
            address={apartment.address}
          />
          <section
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            aria-labelledby="apartment-address-title"
          >
            <h2
              id="apartment-address-title"
              className="text-lg font-semibold text-slate-900"
            >
              Адрес и расположение
            </h2>
            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-600">
              <MapPin
                size={17}
                className="mt-0.5 shrink-0 text-blue-800"
                aria-hidden="true"
              />{" "}
              {apartment.address}
            </p>
            {apartment.residentialComplex && (
              <p className="mt-2 text-sm text-slate-500">
                {apartment.residentialComplex}
              </p>
            )}
            {apartment.mapUrl && (
              <Button asChild variant="outline" className="mt-4">
                <a
                  href={apartment.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Посмотреть на карте 2ГИС <ArrowUpRight aria-hidden="true" />
                </a>
              </Button>
            )}
            {apartment.arrivalInstructions && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                  <DoorOpen size={17} aria-hidden="true" /> Информация для гостей
                </h3>
                <p className="mt-2 text-sm leading-6 text-amber-950">
                  {apartment.arrivalInstructions}
                </p>
              </div>
            )}
          </section>
          {apartment.wifi && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="wifi-title">
              <h2 id="wifi-title" className="text-lg font-semibold text-slate-900">Wi-Fi для гостей</h2>
              <p className="mt-3 text-sm text-slate-600">Сеть: <span className="font-medium text-slate-900 break-all">{apartment.wifi.network}</span></p>
              <p className="mt-2 text-sm text-slate-600">Пароль: <span className="font-medium text-slate-900 break-all">{apartment.wifi.password}</span></p>
            </section>
          )}
        </div>

        <aside
          className="rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-7"
          aria-label="Цена и условия аренды"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Стоимость аренды
          </p>
          <ApartmentPrice
            apartment={apartment}
            className="block text-3xl font-semibold tracking-tight text-slate-900"
          />
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {apartment.priceMin === null
              ? "Стоимость уточняется у владельца."
              : "Указанная владельцем цена."}{" "}
            {apartment.pricingPeriod === "unconfirmed" &&
              "Период аренды и итоговую стоимость нужно согласовать."}
          </p>
          <div className="my-5 border-t border-slate-100" />
          <h2 className="text-sm font-semibold text-slate-900">
            Понравилась квартира?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Сначала согласуйте с владельцем даты, стоимость и условия
            проживания. После этого владелец подготовит договор и отправит
            персональную ссылку.
          </p>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-600">
              Для владельца квартиры
            </p>
            <Button asChild className="mt-3 w-full">
              <Link
                href={`/login?apartment=${encodeURIComponent(apartment.slug)}`}
              >
                <FileText aria-hidden="true" /> Подготовить договор
              </Link>
            </Button>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              После входа выбранная квартира будет передана в форму договора.
            </p>
          </div>
          <div className="mt-4">
            <DemoNotice compact />
          </div>
        </aside>
      </div>

      <section
        className="mt-10 border-t border-slate-200 pt-8"
        aria-labelledby="apartment-contract-flow-title"
      >
        <h2
          id="apartment-contract-flow-title"
          className="text-xl font-semibold tracking-tight text-slate-900"
        >
          От выбора квартиры к договору
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
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-50 text-sm font-semibold text-amber-950">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step.text}
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
