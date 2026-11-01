"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Apartment } from "@/catalog/apartments";
import { catalogListingSchema } from "@/validation/catalog-listing";
import { clientApi } from "./client-api";
import { T, Localized } from "./language";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

export function CatalogListingEditor({
  propertyId,
  apartment,
  revision,
}: {
  propertyId: string;
  apartment: Apartment;
  revision: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const price = (key: string) => (value(key) ? Number(value(key)) : null);
    const parsed = catalogListingSchema.safeParse({
      revision,
      title: value("title"),
      address: value("address"),
      description: value("description") || null,
      arrivalInstructions: value("arrivalInstructions") || null,
      mapUrl: value("mapUrl") || null,
      priceMin: price("priceMin"),
      priceMax: price("priceMax"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await clientApi(
        `/api/properties/${propertyId}/listing`,
        "PUT",
        parsed.data,
      );
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <T text="Редактировать карточку сайта" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>
            <T text="Карточка квартиры на сайте" />
          </DialogTitle>
          <DialogDescription>
            <T text="Данные видны всем посетителям. Адрес также обновится в объекте для новых договоров; сохранённые договоры не изменятся." />
          </DialogDescription>
          <p className="text-sm text-slate-600">
            <T text="Свободный текст показывается на введённом языке. Не добавляйте личные данные, которые нельзя публиковать." />
          </p>
          <form className="space-y-4" onSubmit={save}>
            <label className="block">
              <span className="label">
                <T text="Название на сайте" />
              </span>
              <input
                className="field"
                name="title"
                defaultValue={apartment.title}
                maxLength={160}
                required
              />
            </label>
            <label className="block">
              <span className="label">
                <T text="Адрес" />
              </span>
              <input
                className="field"
                name="address"
                defaultValue={apartment.address}
                maxLength={300}
                required
              />
            </label>
            <label className="block">
              <span className="label">
                <T text="Описание квартиры" />
              </span>
              <textarea
                className="field min-h-24"
                name="description"
                defaultValue={apartment.description ?? ""}
                maxLength={3000}
              />
            </label>
            <label className="block">
              <span className="label">
                <T text="Инструкции для гостей" />
              </span>
              <textarea
                className="field min-h-24"
                name="arrivalInstructions"
                defaultValue={apartment.arrivalInstructions ?? ""}
                maxLength={3000}
              />
            </label>
            <label className="block">
              <span className="label">
                <T text="Ссылка на карту 2ГИС" />
              </span>
              <input
                className="field"
                type="url"
                name="mapUrl"
                defaultValue={apartment.mapUrl ?? ""}
                maxLength={1000}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">
                  <T text="Цена от, ₸ за сутки" />
                </span>
                <input
                  className="field"
                  type="number"
                  name="priceMin"
                  min="1"
                  max="100000000"
                  step="1"
                  defaultValue={apartment.priceMin ?? ""}
                />
              </label>
              <label className="block">
                <span className="label">
                  <T text="Цена до, ₸ за сутки" />
                </span>
                <input
                  className="field"
                  type="number"
                  name="priceMax"
                  min="1"
                  max="100000000"
                  step="1"
                  defaultValue={apartment.priceMax ?? ""}
                />
              </label>
            </div>
            <p className="text-sm text-slate-600">
              <T text="Для цены по запросу оставьте оба поля цены пустыми. Для фиксированной цены можно заполнить только первое поле." />
            </p>
            {error && (
              <p role="alert" className="error">
                <Localized>{error}</Localized>
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              <Localized>
                {busy ? "Сохраняем…" : "Сохранить карточку"}
              </Localized>
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
