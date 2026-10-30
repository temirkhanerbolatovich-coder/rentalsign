import { T } from "@/components/language";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { apartments } from "@/catalog/apartments";
import { CatalogBrowser } from "@/components/catalog-browser";

export const metadata: Metadata = {
  title: "Каталог квартир",
  description:
    "Фотографии квартир, адреса, указанные владельцем цены и расположение в 2ГИС. Условия аренды согласуются с владельцем.",
};

export default function ApartmentsPage() {
  return (
    <>
      <div className="mb-6 max-w-3xl sm:mb-8">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
          <MapPin size={14} aria-hidden="true" />{" "}
          <T text="Каталог жилья" />{" "}
        </p>
        <h1 className="title-reveal text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {" "}
          <T text="Квартиры для аренды" />{" "}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
          {" "}
          <T text="Посмотрите фотографии, сравните цены и расположение. Выбранную квартиру можно использовать при подготовке договора с владельцем." />{" "}
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {" "}
          <T text="Доступность на нужные даты, период аренды и окончательную стоимость уточняйте у владельца." />{" "}
        </p>
      </div>
      <CatalogBrowser apartments={apartments} />
    </>
  );
}
