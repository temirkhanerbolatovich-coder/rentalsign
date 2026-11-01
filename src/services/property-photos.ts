import { Prisma } from "@prisma/client";
import sharp from "sharp";
import {
  apartments,
  findApartment,
  type Apartment,
  type ApartmentPhoto,
} from "@/catalog/apartments";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const MAX_PHOTOS = 50;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 768 * 1024;

type PhotoRow = {
  id: string;
  staticSrc: string | null;
  width: number;
  height: number;
  alt: string;
};
export type ManagedPhoto = ApartmentPhoto & { key: string };
type Property = { id: string; ownerId: string; catalogSlug: string | null };
export type Gallery = { revision: number; photos: ManagedPhoto[] };

export function catalogOwnerEmail() {
  return (process.env.CATALOG_OWNER_EMAIL || process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
}

function toPhoto(row: PhotoRow): ManagedPhoto {
  return {
    key: row.staticSrc ? `static:${row.staticSrc}` : row.id,
    src: row.staticSrc || `/api/property-photos/${row.id}`,
    width: row.width,
    height: row.height,
    alt: row.alt,
  };
}

function originalPhotos(property: Property): ManagedPhoto[] {
  return (
    (property.catalogSlug
      ? findApartment(property.catalogSlug)?.photos
      : undefined
    )?.map((photo) => ({
      ...photo,
      key: `static:${photo.src}`,
    })) ?? []
  );
}

const photoSelect = {
  id: true,
  staticSrc: true,
  width: true,
  height: true,
  alt: true,
} as const;

export async function getPropertyGallery(property: Property): Promise<Gallery> {
  const gallery = await db.propertyGallery.findUnique({
    where: { propertyId: property.id },
    select: {
      revision: true,
      photos: { orderBy: { position: "asc" }, select: photoSelect },
    },
  });
  return gallery
    ? { revision: gallery.revision, photos: gallery.photos.map(toPhoto) }
    : { revision: 0, photos: originalPhotos(property) };
}

/** Only the configured catalog owner can publish photos to the shared public catalog. */
export async function getCatalogApartments(): Promise<Apartment[]> {
  const email = catalogOwnerEmail();
  if (!email) return apartments;
  const properties = await db.property.findMany({
    where: { owner: { email }, catalogSlug: { not: null } },
    select: {
      catalogSlug: true,
      listing: true,
      gallery: {
        select: {
          photos: { orderBy: { position: "asc" }, select: photoSelect },
        },
      },
    },
  });
  const overrides = new Map(
    properties.map((property) => [property.catalogSlug, property]),
  );
  return apartments.map((apartment) => {
    const property = overrides.get(apartment.slug);
    const listing = property?.listing;
    return {
      ...apartment,
      ...(listing
        ? {
            title: listing.title,
            address: listing.address,
            description: listing.description,
            arrivalInstructions: listing.arrivalInstructions,
            mapUrl: listing.mapUrl,
            priceMin: listing.priceMin,
            priceMax: listing.priceMax,
          }
        : {}),
      photos: property?.gallery
        ? property.gallery.photos.map(toPhoto)
        : apartment.photos,
    };
  });
}

export async function readImage(request: Request) {
  const mime = request.headers.get("content-type")?.split(";")[0].toLowerCase();
  if (!mime || !["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new AppError(415, "Поддерживаются только JPEG, PNG и WebP");
  if (!request.body) throw new AppError(400, "Выберите фотографию");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_UPLOAD_BYTES) {
      await reader.cancel();
      throw new AppError(413, "Фотография больше 8 МБ");
    }
    chunks.push(value);
  }
  try {
    const input = Buffer.concat(chunks);
    const image = sharp(input, {
      limitInputPixels: 40_000_000,
      animated: true,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      (metadata.pages ?? 1) !== 1
    )
      throw new Error("Unsupported image");
    const resized = image.rotate().resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    });
    let result = await resized
      .clone()
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    if (result.data.length > MAX_OUTPUT_BYTES)
      result = await resized
        .clone()
        .webp({ quality: 60 })
        .toBuffer({ resolveWithObject: true });
    if (result.data.length > MAX_OUTPUT_BYTES)
      result = await resized
        .clone()
        .webp({ quality: 40 })
        .toBuffer({ resolveWithObject: true });
    if (result.data.length > MAX_OUTPUT_BYTES)
      throw new AppError(413, "Не удалось уменьшить фотографию до 768 КБ");
    return {
      data: result.data,
      width: result.info.width,
      height: result.info.height,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "Не удалось прочитать фотографию");
  }
}

type Change =
  | { action: "add"; image: Awaited<ReturnType<typeof readImage>> }
  | { action: "delete" | "cover" | "left" | "right"; key: string };
export async function changePropertyGallery(
  ownerId: string,
  propertyId: string,
  revision: number,
  change: Change,
): Promise<Gallery> {
  try {
    return await db.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: { id: propertyId, ownerId },
        select: { id: true, ownerId: true, catalogSlug: true },
      });
      if (!property) throw new AppError(404, "Объект не найден");
      let gallery = await tx.propertyGallery.findUnique({
        where: { propertyId },
        select: { revision: true },
      });
      if (!gallery) {
        if (revision !== 0)
          throw new AppError(409, "Галерея изменилась. Обновите страницу");
        gallery = await tx.propertyGallery.create({
          data: {
            propertyId,
            photos: {
              create: originalPhotos(property).map((photo, position) => ({
                staticSrc: photo.src,
                position,
                width: photo.width,
                height: photo.height,
                alt: photo.alt,
              })),
            },
          },
          select: { revision: true },
        });
      }
      const updated = await tx.propertyGallery.updateMany({
        where: { propertyId, revision },
        data: { revision: { increment: 1 } },
      });
      if (!updated.count)
        throw new AppError(409, "Галерея изменилась. Обновите страницу");
      const rows = await tx.propertyPhoto.findMany({
        where: { propertyId },
        orderBy: { position: "asc" },
        select: photoSelect,
      });
      if (change.action === "add") {
        if (rows.length >= MAX_PHOTOS)
          throw new AppError(400, `Не более ${MAX_PHOTOS} фотографий`);
        await tx.propertyPhoto.create({
          data: {
            propertyId,
            position: rows.length,
            ...change.image,
            alt: "Фотография объекта",
          },
        });
      } else {
        const index = rows.findIndex((row) => toPhoto(row).key === change.key);
        if (index < 0) throw new AppError(404, "Фотография не найдена");
        if (change.action === "delete") {
          await tx.propertyPhoto.delete({ where: { id: rows[index].id } });
          rows.splice(index, 1);
        } else {
          const target =
            change.action === "cover"
              ? 0
              : change.action === "left"
                ? Math.max(index - 1, 0)
                : Math.min(index + 1, rows.length - 1);
          const [row] = rows.splice(index, 1);
          rows.splice(target, 0, row);
        }
        for (const [position, row] of rows.entries())
          await tx.propertyPhoto.update({
            where: { id: row.id },
            data: { position },
          });
      }
      const result = await tx.propertyGallery.findUniqueOrThrow({
        where: { propertyId },
        select: {
          revision: true,
          photos: { orderBy: { position: "asc" }, select: photoSelect },
        },
      });
      return { revision: result.revision, photos: result.photos.map(toPhoto) };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    )
      throw new AppError(409, "Галерея изменилась. Обновите страницу");
    throw error;
  }
}
