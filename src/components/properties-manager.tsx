"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  MapPin,
  Pencil,
  Archive,
  RotateCcw,
  DoorOpen,
  Search,
  FilePlus2,
  Images,
  ExternalLink,
  Download,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { ConfirmAction } from "./confirm-action";
import { PageTitle } from "./page-title";
import { clientApi } from "./client-api";
import { money, propertyTypes } from "@/domain/contracts";
import { propertySchema, type PropertyInput } from "@/validation/schemas";
import { findApartment } from "@/catalog/apartments";
import { ApartmentPrice } from "./apartment-price";
type PropertyRow = PropertyInput & {
  id: string;
  archived: boolean;
  catalogSlug?: string | null;
};
export function PropertiesManager({
  properties,
}: {
  properties: PropertyRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  function edit(property: PropertyRow | null) {
    setEditing(property);
    setError("");
    setOpen(true);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(form.entries());
    const parsed = propertySchema.safeParse({
      ...input,
      rent: Number(input.rent),
      deposit: Number(input.deposit),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setBusy(false);
      return;
    }
    try {
      await clientApi(
        editing ? `/api/properties/${editing.id}` : "/api/properties",
        editing ? "PATCH" : "POST",
        parsed.data,
      );
      setOpen(false);
      setMessage(editing ? "Объект обновлён" : "Объект создан");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function archive(property: PropertyRow) {
    await clientApi(`/api/properties/${property.id}`, "PATCH", {
      archived: !property.archived,
    });
    setMessage(
      property.archived ? "Объект восстановлен" : "Объект архивирован",
    );
    router.refresh();
  }
  async function importCatalog() {
    setImporting(true);
    setImportError("");
    setMessage("");
    try {
      const result = await clientApi<{ imported: number; total: number }>(
        "/api/catalog/import",
        "POST",
      );
      setMessage(
        result.imported
          ? `Добавлено квартир: ${result.imported}. Всего из каталога: ${result.total}.`
          : "Все квартиры из каталога уже добавлены.",
      );
      setShowArchive(false);
      setSearch("");
      router.refresh();
    } catch (e) {
      setImportError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }
  const activeCount = properties.filter(
    (property) => !property.archived,
  ).length;
  const archivedCount = properties.length - activeCount;
  const searchTerms = search
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .split(/[\s,.]+/)
    .filter(Boolean);
  const visible = properties.filter((property) => {
    if (property.archived !== showArchive) return false;
    const searchable = `${property.name} ${property.address} ${property.unit}`
      .toLocaleLowerCase("ru")
      .replace(/ё/g, "е");
    return searchTerms.every((term) => searchable.includes(term));
  });
  return (
    <>
      <PageTitle
        title="Объекты недвижимости"
        description="Ваши квартиры, фотографии и цены. Выберите квартиру — данные сразу попадут в новый договор."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={importCatalog}
            disabled={importing}
          >
            <Download />
            {importing ? "Добавляем…" : "Добавить из каталога"}
          </Button>
          <Button onClick={() => edit(null)}>
            <Plus />
            Добавить объект
          </Button>
        </div>
      </PageTitle>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" aria-label="Статус квартир">
          <Button
            variant={showArchive ? "outline" : "default"}
            onClick={() => setShowArchive(false)}
            aria-pressed={!showArchive}
          >
            Активные <span className="ml-1 opacity-70">{activeCount}</span>
          </Button>
          <Button
            variant={showArchive ? "default" : "outline"}
            onClick={() => setShowArchive(true)}
            aria-pressed={showArchive}
          >
            В архиве <span className="ml-1 opacity-70">{archivedCount}</span>
          </Button>
        </div>
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Поиск по квартирам</span>
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-3 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Адрес, название или номер квартиры"
            className="field pl-10"
          />
        </label>
      </div>
      {importError && (
        <p role="alert" className="error mb-5">
          {importError}
        </p>
      )}
      {message && (
        <p role="status" className="success mb-5">
          {message}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((property) => {
          const apartment = property.catalogSlug
            ? findApartment(property.catalogSlug)
            : undefined;
          const cover = apartment?.photos[0];
          return (
            <article
              key={property.id}
              className={`card flex min-w-0 flex-col overflow-hidden ${property.archived ? "opacity-80" : ""}`}
            >
              {cover && apartment ? (
                <Link
                  href={`/apartments/${apartment.slug}`}
                  className="relative block aspect-[16/10]"
                  aria-label={`Фотографии и описание: ${property.name}`}
                >
                  <Image
                    src={cover.src}
                    alt={cover.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <span className="absolute bottom-3 left-3 rounded-md bg-white px-3 py-1 text-xs text-teal-800">
                    {property.archived ? "В архиве" : "Из каталога"}
                  </span>
                  <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1 text-xs text-white">
                    <Images size={14} />
                    {apartment.photos.length} фото
                  </span>
                </Link>
              ) : (
                <div className="flex h-24 items-center justify-between bg-gradient-to-br from-[#e5eeeb] to-[#f3f6f5] px-6">
                  <Building2
                    className="text-teal-700/60"
                    size={35}
                    strokeWidth={1.3}
                  />
                  <span className="rounded-md bg-white/70 px-3 py-1 text-[11px] text-teal-800">
                    {property.archived
                      ? "В архиве"
                      : propertyTypes[property.type]}
                  </span>
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <h2 className="break-words text-base font-semibold leading-6">
                  {property.name}
                </h2>
                <p className="mt-2 flex gap-2 text-sm leading-5 text-slate-500">
                  <MapPin size={15} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    {property.address}
                  </span>
                </p>
                {property.unit && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <DoorOpen size={15} />
                    {property.type === "APARTMENT"
                      ? "Квартира"
                      : "Помещение"}{" "}
                    {property.unit}
                    {apartment &&
                      ` · ${apartment.floor} этаж · ${apartment.entrance} подъезд`}
                  </p>
                )}
                {property.description && (
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                    {property.description}
                  </p>
                )}
                {apartment?.arrivalInstructions && (
                  <p className="mt-3 rounded-lg border border-teal-100 bg-teal-50 p-3 text-xs leading-5 text-teal-900">
                    <span className="font-semibold">Вход в подъезд: </span>
                    {apartment.arrivalInstructions}
                  </p>
                )}
                {apartment && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Цена в каталоге</p>
                    <ApartmentPrice
                      apartment={apartment}
                      className="mt-1 block text-lg font-semibold"
                    />
                    {apartment.priceMin !== null &&
                      apartment.pricingPeriod === "unconfirmed" && (
                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          Период цены ещё не указан. Уточните сумму и сроки при
                          оформлении.
                        </p>
                      )}
                  </div>
                )}
                <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
                  <div>
                    <p className="text-xs leading-5 text-slate-500">
                      Сумма для договора
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {property.catalogSlug && !property.rent
                        ? "Указать в договоре"
                        : money(property.rent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs leading-5 text-slate-500">Депозит</p>
                    <p className="mt-1 text-sm font-semibold">
                      {money(property.deposit)}
                    </p>
                  </div>
                </div>
                {apartment && (
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-teal-800">
                    <Link
                      href={`/apartments/${apartment.slug}`}
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Images size={14} />
                      Фото и подробности
                    </Link>
                    {apartment.mapUrl && (
                      <a
                        href={apartment.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <ExternalLink size={14} />
                        Открыть 2ГИС
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3 border-t border-slate-100 p-4">
                {!property.archived && (
                  <Button className="w-full" asChild>
                    <Link href={`/contracts/new?propertyId=${property.id}`}>
                      <FilePlus2 />
                      Создать договор
                    </Link>
                  </Button>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => edit(property)}
                  >
                    <Pencil />
                    Изменить
                  </Button>
                  <ConfirmAction
                    title={
                      property.archived
                        ? "Восстановить объект?"
                        : "Архивировать объект?"
                    }
                    description="Существующие договоры и их снимки сохранятся. Архивный объект нельзя выбрать для нового договора."
                    label={property.archived ? "Восстановить" : "Архивировать"}
                    trigger={
                      <>
                        {property.archived ? <RotateCcw /> : <Archive />}
                        {property.archived ? "Восстановить" : "В архив"}
                      </>
                    }
                    onConfirm={() => archive(property)}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <div className="card py-20 text-center">
          <Building2 size={36} className="mx-auto mb-4 text-slate-300" />
          <p className="font-medium">
            {search.trim()
              ? "Квартиры не найдены"
              : showArchive
                ? "В архиве пока нет квартир"
                : "Добавьте первую квартиру"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {search.trim()
              ? "Попробуйте другой адрес, название или номер квартиры."
              : showArchive
                ? "Здесь будут квартиры, которые вы убрали из активного списка."
                : "Можно добавить все ваши квартиры из каталога одним нажатием."}
          </p>
          {search.trim() ? (
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => setSearch("")}
            >
              Сбросить поиск
            </Button>
          ) : (
            !showArchive && (
              <Button
                className="mt-5"
                onClick={importCatalog}
                disabled={importing}
              >
                <Download />
                {importing ? "Добавляем…" : "Добавить из каталога"}
              </Button>
            )
          )}
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogTitle className="text-xl font-semibold">
            {editing ? "Редактировать объект" : "Новый объект"}
          </DialogTitle>
          <DialogDescription className="mb-6 mt-2 text-sm text-slate-500">
            Эти данные подставляются в новые договоры. Уже созданные договоры
            сохраняют прежние данные.
          </DialogDescription>
          <form onSubmit={save} className="space-y-4">
            {[
              { name: "name", label: "Название объекта", max: 120 },
              { name: "address", label: "Адрес", max: 300 },
            ].map((field) => (
              <label key={field.name} className="block">
                <span className="label">{field.label}</span>
                <input
                  className="field"
                  name={field.name}
                  required
                  maxLength={field.max}
                  defaultValue={
                    editing?.[field.name as "name" | "address"] || ""
                  }
                />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="label">Тип объекта</span>
                <select
                  className="field"
                  name="type"
                  defaultValue={editing?.type || "APARTMENT"}
                >
                  {Object.entries(propertyTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Номер помещения</span>
                <input
                  className="field"
                  name="unit"
                  maxLength={40}
                  defaultValue={editing?.unit || ""}
                />
              </label>
            </div>
            <label className="block">
              <span className="label">Описание</span>
              <textarea
                className="field min-h-24"
                name="description"
                maxLength={2000}
                defaultValue={editing?.description || ""}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="label">Сумма аренды для договора, ₸</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  max={100000000}
                  step={1}
                  required
                  name="rent"
                  defaultValue={editing?.rent ?? 0}
                />
              </label>
              <label>
                <span className="label">Депозит, ₸</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  max={100000000}
                  step={1}
                  required
                  name="deposit"
                  defaultValue={editing?.deposit ?? 0}
                />
              </label>
            </div>
            {editing?.catalogSlug && (
              <p className="text-xs leading-5 text-slate-500">
                Сумма для договора хранится отдельно от цены в публичном
                каталоге. Если она не указана, заполните её при оформлении
                договора.
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <Button disabled={busy} className="w-full">
              {busy ? "Сохраняем…" : "Сохранить объект"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
