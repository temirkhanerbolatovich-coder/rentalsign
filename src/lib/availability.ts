import { z } from "zod";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Некорректная дата");
export const availabilitySchema = z
  .object({
    catalogSlug: z.string().min(1).max(100),
    startDate: date,
    endDate: date,
    status: z.enum(["occupied", "reserved"]),
  })
  .strict()
  .refine(
    (value) =>
      value.endDate >= value.startDate &&
      new Date(value.endDate).getTime() - new Date(value.startDate).getTime() <=
        366 * 86400000,
    "Период должен быть от 1 до 367 дней",
  );
export type PublicAvailability = {
  startDate: string;
  endDate: string;
  status: string;
};
export function dayStatus(date: string, ranges: PublicAvailability[]) {
  const matches = ranges.filter(
    (range) => range.startDate <= date && range.endDate >= date,
  );
  return matches.some((range) => range.status === "occupied")
    ? "occupied"
    : matches.some((range) => range.status === "reserved")
      ? "reserved"
      : "unknown";
}

/** Use the property's timezone on both server and browser at month boundaries. */
export function calendarMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "numeric",
    timeZone: "Asia/Almaty",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")!.value);
  const month = Number(parts.find((part) => part.type === "month")!.value);
  return new Date(Date.UTC(year, month - 1, 1));
}
