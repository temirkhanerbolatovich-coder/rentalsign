"use client";

import { T, translate, useLanguage } from "@/components/language";

import { ApartmentPhoto } from "./apartment-photo";
import styles from "./apartment-gallery.module.css";
import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import type { ApartmentPhoto as CatalogPhoto } from "@/catalog/apartments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ApartmentGallery({
  photos,
  address,
}: {
  photos: CatalogPhoto[];
  address: string;
}) {
  const language = useLanguage();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const photo = photos[index];

  function movePhoto(offset: number) {
    setIndex((current) => (current + offset + photos.length) % photos.length);
  }

  function handleArrowKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      movePhoto(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStart.current = event.changedTouches[0]?.clientX ?? null;
  }
  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStart.current === null) return;
    const distance =
      (event.changedTouches[0]?.clientX ?? touchStart.current) -
      touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) > 50 && photos.length > 1)
      movePhoto(distance < 0 ? 1 : -1);
  }

  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <section
        aria-label={translate("Фотографии квартиры", language)}
        onKeyDown={handleArrowKeys}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(styles.frame, photos.length < 3 && "lg:!grid-cols-1")}
        >
          <div className={styles.main}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="relative block aspect-[4/3] w-full focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-teal-700"
                aria-label={`${translate("Открыть фото", language)} ${index + 1} ${translate("на весь экран", language)}`}
              >
                <ApartmentPhoto
                  src={photo.src}
                  alt={photo.alt}
                  sizes="(max-width: 1023px) 100vw, 65vw"
                  preload={index === 0}
                  className="object-contain"
                />
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm">
                  <Expand size={15} aria-hidden="true" />{" "}
                  <T text="На весь экран" />{" "}
                </span>
              </button>
            </DialogTrigger>
            {photos.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => movePhoto(-1)}
                  aria-label={translate("Предыдущее фото", language)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow-sm"
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => movePhoto(1)}
                  aria-label={translate("Следующее фото", language)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow-sm"
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </>
            )}
            <p
              className="pointer-events-none absolute left-4 top-4 rounded-lg bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white"
              aria-live="polite"
            >
              {" "}
              <T text="Фото" /> {index + 1} <T text="из" /> {photos.length}
            </p>
          </div>
          {photos.length > 2 && (
            <div className={styles.previews}>
              {[1, 2].map((offset) => {
                const previewIndex = (index + offset) % photos.length;
                const preview = photos[previewIndex];
                return (
                  <button
                    key={preview.src}
                    type="button"
                    className="relative min-h-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
                    aria-label={`${translate("Выбрать фото", language)} ${previewIndex + 1}`}
                    onClick={() => setIndex(previewIndex)}
                  >
                    <ApartmentPhoto
                      src={preview.src}
                      alt=""
                      sizes="33vw"
                      className="object-cover"
                      compact
                    />
                    <span
                      className="absolute bottom-3 right-3 rounded-lg bg-white/95 px-2 py-1 text-xs font-medium text-stone-700"
                      aria-hidden="true"
                    >
                      <T text="Фото" /> {previewIndex + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div
          className="mt-3 flex gap-2 overflow-x-auto p-1 -mx-1"
          aria-label={translate("Миниатюры фотографий", language)}
        >
          {photos.map((item, photoIndex) => (
            <button
              key={item.src}
              type="button"
              aria-label={`${translate("Показать фото", language)} ${photoIndex + 1}`}
              aria-pressed={photoIndex === index}
              onClick={() => setIndex(photoIndex)}
              className={cn(
                "gallery-thumbnail relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
                photoIndex === index
                  ? "border-teal-700"
                  : "border-transparent opacity-65 hover:opacity-100",
              )}
            >
              <ApartmentPhoto
                compact
                src={item.src}
                alt=""
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {" "}
          <T text="Выберите миниатюру или используйте стрелки. Нажмите на фото, чтобы рассмотреть детали." />{" "}
        </p>
      </section>
      <DialogContent
        className="max-w-6xl p-4 sm:p-5"
        onKeyDown={handleArrowKeys}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <DialogTitle className="pr-9 text-base font-semibold text-slate-900">
          {" "}
          <T text="Фотографии квартиры" />{" "}
        </DialogTitle>
        <DialogDescription className="mb-4 mt-1 pr-9 text-sm text-slate-500">
          {address}{" "}
          <T text=". Стрелки ← → переключают фотографии, Esc закрывает просмотр." />{" "}
        </DialogDescription>
        <div className="relative h-[58dvh] rounded-lg bg-slate-950 sm:h-[64dvh]">
          <ApartmentPhoto
            src={photo.src}
            alt={photo.alt}
            sizes="95vw"
            className="object-contain"
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => movePhoto(-1)}
            aria-label={translate("Предыдущее фото", language)}
            disabled={photos.length < 2}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p className="text-sm text-slate-600" aria-live="polite">
            {" "}
            <T text="Фото" /> {index + 1} <T text="из" /> {photos.length}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => movePhoto(1)}
            aria-label={translate("Следующее фото", language)}
            disabled={photos.length < 2}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
