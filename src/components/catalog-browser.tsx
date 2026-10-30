"use client";

import { Localized, T, translate, useLanguage } from "@/components/language";

import { useSyncExternalStore } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Apartment } from "@/catalog/apartments";
import { ApartmentCard } from "@/components/apartment-card";
import { Button } from "@/components/ui/button";

const FILTER_STORAGE_KEY = "rentalsign.catalog.filters";
const FILTER_CHANGE_EVENT = "rentalsign.catalog.filters.changed";
type CatalogFilters = { search: string; maxPrice: string; sort: string };
let volatileFilters = "";
let storageUnavailable = false;

function subscribeToFilters(onChange: () => void) {
  window.addEventListener(FILTER_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FILTER_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readFilters() {
  try {
    return storageUnavailable
      ? volatileFilters
      : (sessionStorage.getItem(FILTER_STORAGE_KEY) ?? "");
  } catch {
    storageUnavailable = true;
    return volatileFilters;
  }
}

function saveFilters(filters: CatalogFilters) {
  volatileFilters = JSON.stringify(filters);
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, volatileFilters);
  } catch {
    storageUnavailable = true;
  }
  window.dispatchEvent(new Event(FILTER_CHANGE_EVENT));
}

export function CatalogBrowser({ apartments }: { apartments: Apartment[] }) {
  const language = useLanguage();
  const stored = useSyncExternalStore(
    subscribeToFilters,
    readFilters,
    () => "",
  );
  let filters: CatalogFilters = { search: "", maxPrice: "", sort: "default" };
  try {
    const saved = JSON.parse(stored || "null");
    if (saved && typeof saved === "object")
      filters = {
        search: typeof saved.search === "string" ? saved.search : "",
        maxPrice: typeof saved.maxPrice === "string" ? saved.maxPrice : "",
        sort: ["default", "price-asc", "price-desc"].includes(saved.sort)
          ? saved.sort
          : "default",
      };
  } catch {
    // Invalid stored filters fall back to the default view.
  }
  const { search, maxPrice, sort } = filters;
  const normalizedSearch = search.trim().toLocaleLowerCase("ru");
  const priceLimit = maxPrice.trim() ? Number(maxPrice) : null;
  const hasFilters = Boolean(search || maxPrice || sort !== "default");
  const filtered = apartments
    .filter((apartment) => {
      const searchableText = [
        apartment.title,
        apartment.address,
        apartment.residentialComplex,
      ]
        .join(" ")
        .toLocaleLowerCase("ru");

      return (
        searchableText.includes(normalizedSearch) &&
        (priceLimit === null ||
          (Number.isFinite(priceLimit) &&
            apartment.priceMin !== null &&
            apartment.priceMin <= priceLimit))
      );
    })
    .sort((first, second) => {
      if (sort === "default") return 0;
      if (first.priceMin === null) return second.priceMin === null ? 0 : 1;
      if (second.priceMin === null) return -1;
      return sort === "price-asc"
        ? first.priceMin - second.priceMin
        : second.priceMin - first.priceMin;
    });

  function resetFilters() {
    saveFilters({ search: "", maxPrice: "", sort: "default" });
  }

  return (
    <>
      <section
        aria-label={translate("Поиск квартир", language)}
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <label htmlFor="apartment-search" className="label">
              {" "}
              <T text="Поиск по адресу" />{" "}
            </label>
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-3 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="apartment-search"
                type="search"
                value={search}
                onChange={(event) =>
                  saveFilters({ search: event.target.value, maxPrice, sort })
                }
                placeholder={translate(
                  "Улица, дом или жилой комплекс",
                  language,
                )}
                className="field pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="apartment-budget" className="label">
              {" "}
              <T text="Начальная цена не выше, ₸" />{" "}
            </label>
            <input
              id="apartment-budget"
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              value={maxPrice}
              onChange={(event) =>
                saveFilters({ search, maxPrice: event.target.value, sort })
              }
              placeholder={translate("Без ограничения", language)}
              aria-describedby="apartment-budget-help"
              className="field"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="apartment-sort" className="label">
              {" "}
              <T text="Порядок квартир" />{" "}
            </label>
            <select
              id="apartment-sort"
              value={sort}
              onChange={(event) =>
                saveFilters({ search, maxPrice, sort: event.target.value })
              }
              className="field"
            >
              <option value="default">
                {" "}
                <T text="По порядку в каталоге" />{" "}
              </option>
              <option value="price-asc">
                {" "}
                <T text="Сначала дешевле" />{" "}
              </option>
              <option value="price-desc">
                {" "}
                <T text="Сначала дороже" />{" "}
              </option>
            </select>
          </div>
        </div>
        <p
          id="apartment-budget-help"
          className="mt-3 text-xs leading-5 text-slate-500"
        >
          {" "}
          <T text="Фильтр сравнивает нижнюю границу цены. При ограничении цены варианты без указанной стоимости скрываются." />{" "}
        </p>
      </section>

      <div className="flex min-h-16 items-center justify-between gap-3 py-4">
        <div>
          <p role="status" className="text-sm text-slate-600">
            {" "}
            <T text="Показано" />{" "}
            <strong className="font-semibold text-slate-900">
              {filtered.length}
            </strong>{" "}
            <T text="из" /> {apartments.length}
          </p>
          {hasFilters && (
            <p className="mt-1 text-xs text-slate-600">
              <Localized>
                {[
                  search.trim() &&
                    `${translate("Поиск:", language)} ${search.trim()}`,
                  maxPrice && `${translate("Цена до", language)} ${maxPrice} ₸`,
                  sort !== "default" &&
                    translate(
                      sort === "price-asc"
                        ? "Сначала дешевле"
                        : "Сначала дороже",
                      language,
                    ),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Localized>
            </p>
          )}
        </div>
        {hasFilters && filtered.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X aria-hidden="true" /> <T text="Сбросить фильтры" />{" "}
          </Button>
        )}
      </div>

      <section
        aria-label={translate("Каталог квартир", language)}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filtered.map((apartment, index) => (
          <ApartmentCard
            key={apartment.slug}
            apartment={apartment}
            preload={index === 0}
          />
        ))}
      </section>
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <SlidersHorizontal
            size={28}
            className="mx-auto mb-4 text-slate-400"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold text-slate-900">
            {" "}
            <T text="Квартиры не найдены" />{" "}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {" "}
            <T text="Попробуйте другой адрес или измените ограничение цены." />{" "}
          </p>
          <Button variant="outline" className="mt-5" onClick={resetFilters}>
            {" "}
            <T text="Сбросить фильтры" />{" "}
          </Button>
        </div>
      )}
    </>
  );
}
