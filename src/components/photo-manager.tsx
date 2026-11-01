"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { T, translate, useLanguage } from "./language";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { clientApi } from "./client-api";
import type { Gallery } from "@/services/property-photos";

type PhotoProperty = {
  id: string;
  name: string;
  gallery: Gallery;
  publishesPhotos: boolean;
};
type Action = "delete" | "cover" | "left" | "right";
export function PhotoManager({
  property,
  onClose,
}: {
  property: PhotoProperty;
  onClose: () => void;
}) {
  const [gallery, setGallery] = useState(property.gallery);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const language = useLanguage();
  async function change(action: Action, key: string) {
    if (
      action === "delete" &&
      !window.confirm(translate("Удалить фотографию?", language))
    )
      return;
    setBusy(true);
    setError("");
    try {
      setGallery(
        await clientApi<Gallery>(
          `/api/properties/${property.id}/photos`,
          "PATCH",
          { revision: gallery.revision, action, key },
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    let revision = gallery.revision;
    try {
      for (const file of files) {
        const response = await fetch(`/api/properties/${property.id}/photos`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": file.type,
            "X-Gallery-Revision": String(revision),
          },
          body: file,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Не удалось загрузить фото");
        revision = result.revision;
        setGallery(result as Gallery);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
        <DialogTitle className="pr-8 text-xl font-semibold">
          <T text="Фотографии объекта" />: {property.name}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-600">
          {property.publishesPhotos ? (
            <T text="Изменения сразу видны в публичном каталоге." />
          ) : (
            <T text="Фотографии видны только в вашем кабинете." />
          )}{" "}
          <T text="Не более 50 фото, до 8 МБ каждое. JPEG, PNG или WebP." />
        </DialogDescription>
        <label
          className={`mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-700 ${busy ? "pointer-events-none opacity-50" : ""}`}
        >
          <ImagePlus size={18} /> <T text="Добавить фотографии" />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={upload}
            className="sr-only"
          />
        </label>
        {error && (
          <p role="alert" className="error mt-4">
            {error}
          </p>
        )}
        {busy && (
          <p role="status" className="mt-3 text-sm text-slate-600">
            <T text="Сохраняем фотографии…" />
          </p>
        )}
        {!gallery.photos.length && (
          <p className="mt-6 text-sm text-slate-600">
            <T text="Фотографий пока нет." />
          </p>
        )}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.photos.map((photo, index) => (
            <div
              key={photo.key}
              className="overflow-hidden rounded-xl border border-slate-200"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  unoptimized={photo.src.startsWith("/api/property-photos/")}
                  sizes="(max-width: 640px) 90vw, 280px"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded bg-white px-2 py-1 text-xs font-medium">
                    <T text="Обложка" />
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 p-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === 0}
                  onClick={() => change("cover", photo.key)}
                  title={translate("Сделать обложкой", language)}
                  aria-label={`${translate("Сделать обложкой", language)} ${index + 1}`}
                >
                  <Star size={16} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === 0}
                  onClick={() => change("left", photo.key)}
                  aria-label={`${translate("Переместить влево", language)} ${index + 1}`}
                >
                  <ArrowLeft size={16} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === gallery.photos.length - 1}
                  onClick={() => change("right", photo.key)}
                  aria-label={`${translate("Переместить вправо", language)} ${index + 1}`}
                >
                  <ArrowRight size={16} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => change("delete", photo.key)}
                  aria-label={`${translate("Удалить фото", language)} ${index + 1}`}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
