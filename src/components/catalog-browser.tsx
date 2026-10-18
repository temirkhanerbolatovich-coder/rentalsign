"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Apartment } from "@/catalog/apartments";
import { ApartmentCard } from "@/components/apartment-card";
import { Button } from "@/components/ui/button";

export function CatalogBrowser({ apartments }: { apartments: Apartment[] }) {
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("default");
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
    setSearch("");
    setMaxPrice("");
    setSort("default");
  }

  return (
    <>
      <section
        aria-label="Поиск квартир"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <label htmlFor="apartment-search" className="label">
              Поиск по адресу
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Улица, дом или жилой комплекс"
                className="field pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="apartment-budget" className="label">
              Начальная цена не выше, ₸
            </label>
            <input
              id="apartment-budget"
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Без ограничения"
              aria-describedby="apartment-budget-help"
              className="field"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="apartment-sort" className="label">
              Порядок квартир
            </label>
            <select
              id="apartment-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="field"
            >
              <option value="default">По порядку в каталоге</option>
              <option value="price-asc">Сначала дешевле</option>
              <option value="price-desc">Сначала дороже</option>
            </select>
          </div>
        </div>
        <p
          id="apartment-budget-help"
          className="mt-3 text-xs leading-5 text-slate-500"
        >
          Фильтр сравнивает нижнюю границу цены. При ограничении цены варианты
          без указанной стоимости скрываются.
        </p>
      </section>

      <div className="flex min-h-16 items-center justify-between gap-3 py-4">
        <p role="status" className="text-sm text-slate-600">
          Показано{" "}
          <strong className="font-semibold text-slate-900">
            {filtered.length}
          </strong>{" "}
          из {apartments.length}
        </p>
        {hasFilters && filtered.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X aria-hidden="true" /> Сбросить фильтры
          </Button>
        )}
      </div>

      <section
        aria-label="Каталог квартир"
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
            Квартиры не найдены
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Попробуйте другой адрес или измените ограничение цены.
          </p>
          <Button variant="outline" className="mt-5" onClick={resetFilters}>
            Сбросить фильтры
          </Button>
        </div>
      )}
    </>
  );
}
