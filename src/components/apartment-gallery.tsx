"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import type { ApartmentPhoto } from "@/catalog/apartments";
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
  photos: ApartmentPhoto[];
  address: string;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
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
    const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) > 50 && photos.length > 1) movePhoto(distance < 0 ? 1 : -1);
  }
  function markFailed(src: string) {
    setFailedPhotos((current) => current.includes(src) ? current : [...current, src]);
  }

  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <section aria-label="Фотографии квартиры" onKeyDown={handleArrowKeys} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <DialogTrigger asChild>
            <button
              type="button"
              className="relative block aspect-[4/3] w-full focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-teal-700"
              aria-label={`Открыть фото ${index + 1} на весь экран`}
            >
              {failedPhotos.includes(photo.src) ? <span className="grid h-full place-items-center text-sm text-slate-600">Не удалось загрузить фотографию</span> : <Image
                key={photo.src}
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 1023px) 100vw, 65vw"
                preload={index === 0}
                onError={() => markFailed(photo.src)}
                className="photo-reveal object-contain"
              />}
              <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm">
                <Expand size={15} aria-hidden="true" /> На весь экран
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
                aria-label="Предыдущее фото"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow-sm"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => movePhoto(1)}
                aria-label="Следующее фото"
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
            Фото {index + 1} из {photos.length}
          </p>
        </div>
        <div
          className="mt-3 flex gap-2 overflow-x-auto p-1 -mx-1"
          aria-label="Миниатюры фотографий"
        >
          {photos.map((item, photoIndex) => (
            <button
              key={item.src}
              type="button"
              aria-label={`Показать фото ${photoIndex + 1}`}
              aria-pressed={photoIndex === index}
              onClick={() => setIndex(photoIndex)}
              className={cn(
                "gallery-thumbnail relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
                photoIndex === index
                  ? "border-teal-700"
                  : "border-transparent opacity-65 hover:opacity-100",
              )}
            >
              <Image
                src={item.src}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Выберите миниатюру или используйте стрелки. Нажмите на фото, чтобы
          рассмотреть детали.
        </p>
      </section>
      <DialogContent
        className="max-w-6xl p-4 sm:p-5"
        onKeyDown={handleArrowKeys}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <DialogTitle className="pr-9 text-base font-semibold text-slate-900">
          Фотографии квартиры
        </DialogTitle>
        <DialogDescription className="mb-4 mt-1 pr-9 text-sm text-slate-500">
          {address}. Стрелки ← → переключают фотографии, Esc закрывает просмотр.
        </DialogDescription>
        <div className="relative h-[58dvh] rounded-lg bg-slate-950 sm:h-[64dvh]">
          {failedPhotos.includes(photo.src) ? <p className="grid h-full place-items-center text-sm text-white">Не удалось загрузить фотографию</p> : <Image
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="95vw"
            onError={() => markFailed(photo.src)}
            className="photo-reveal object-contain"
          />}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => movePhoto(-1)}
            aria-label="Предыдущее фото"
            disabled={photos.length < 2}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p className="text-sm text-slate-600" aria-live="polite">
            Фото {index + 1} из {photos.length}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => movePhoto(1)}
            aria-label="Следующее фото"
            disabled={photos.length < 2}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
