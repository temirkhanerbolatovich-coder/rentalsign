import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullable();
const optionalPrice = z.number().int().min(1).max(100_000_000).nullable();

export const catalogListingSchema = z
  .object({
    revision: z.number().int().min(0).max(999999999),
    title: z.string().trim().min(1).max(160),
    address: z.string().trim().min(1).max(300),
    description: optionalText(3000),
    arrivalInstructions: optionalText(3000),
    mapUrl: optionalText(1000).refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          !url.username &&
          !url.password &&
          !url.port &&
          ["2gis.kz", "2gis.ru", "2gis.com"].some(
            (domain) =>
              url.hostname === domain || url.hostname.endsWith(`.${domain}`),
          )
        );
      } catch {
        return false;
      }
    }, "Укажите ссылку HTTPS на 2ГИС"),
    priceMin: optionalPrice,
    priceMax: optionalPrice,
  })
  .strict()
  .refine(
    (value) =>
      value.priceMin === null
        ? value.priceMax === null
        : value.priceMax === null || value.priceMax >= value.priceMin,
    {
      message: "Верхняя цена должна быть не меньше нижней",
      path: ["priceMax"],
    },
  );
