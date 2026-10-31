"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { T } from "./language";
import { cn } from "@/lib/utils";
import styles from "./apartment-gallery.module.css";

type ApartmentPhotoProps = Pick<
  ImageProps,
  "alt" | "sizes" | "className" | "preload" | "loading"
> & { src: string; compact?: boolean };

/** The parent reserves the photo's dimensions; every image keeps its own load state. */
export function ApartmentPhoto(props: ApartmentPhotoProps) {
  // Remount on source changes so the next photo starts with its own placeholder.
  return <PhotoContent key={props.src} {...props} />;
}

function PhotoContent({
  compact = false,
  className,
  alt,
  ...imageProps
}: ApartmentPhotoProps) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  if (state === "failed") {
    return (
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-100 p-3 text-center text-stone-600">
        <ImageOff size={compact ? 18 : 28} aria-hidden="true" />
        <span
          className={
            compact ? "sr-only" : "max-w-52 text-xs leading-5 sm:text-sm"
          }
        >
          <T text="Не удалось загрузить фотографию" />
        </span>
      </span>
    );
  }

  return (
    <>
      {state === "loading" && (
        <span aria-hidden="true" className={styles.skeleton} />
      )}
      <Image
        {...imageProps}
        alt={alt}
        fill
        onLoad={() => setState("loaded")}
        onError={() => setState("failed")}
        className={cn(
          className,
          "transition-[opacity,transform] duration-300 motion-reduce:transition-none",
          state === "loaded" ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}
