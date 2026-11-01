import { requireAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { availabilitySchema } from "@/lib/availability";
import { findApartment } from "@/catalog/apartments";
import { z } from "zod";
import { contractReservations } from "@/services/contract-availability";
import { catalogOwnerEmail } from "@/services/property-photos";
export async function GET(request: Request) {
  return api(async () => {
    const slug = new URL(request.url).searchParams.get("apartment");
    if (slug) {
      if (!findApartment(slug)) throw new AppError(404, "Квартира не найдена");
      const ownerEmail = catalogOwnerEmail();
      const [manual, automatic] = await Promise.all([
        ownerEmail
          ? db.availability.findMany({
              where: { catalogSlug: slug, owner: { email: ownerEmail } },
              select: { startDate: true, endDate: true, status: true },
              orderBy: { startDate: "asc" },
            })
          : Promise.resolve([]),
        contractReservations({ catalogSlug: slug }),
      ]);
      return [
        ...manual,
        ...automatic.map(({ startDate, endDate, status }) => ({
          startDate,
          endDate,
          status,
        })),
      ].sort((a, b) => a.startDate.localeCompare(b.startDate));
    }
    const admin = await requireAdmin();
    return db.availability.findMany({
      where: { ownerId: admin.id },
      orderBy: { startDate: "asc" },
    });
  });
}
export async function POST(request: Request) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const { confirmOverlap, ...period } = z
      .object({ confirmOverlap: z.boolean().optional() })
      .passthrough()
      .parse(await jsonBody(request));
    const data = availabilitySchema.parse(period);
    if (
      !findApartment(data.catalogSlug) ||
      !(await db.property.findFirst({
        where: {
          ownerId: admin.id,
          catalogSlug: data.catalogSlug,
          archived: false,
        },
      }))
    ) {
      throw new AppError(404, "Добавьте квартиру каталога в свои объекты");
    }
    const bookings = await contractReservations({ ownerId: admin.id });
    const overlaps = bookings.some(
      (booking) =>
        booking.catalogSlug === data.catalogSlug &&
        booking.startDate <= data.endDate &&
        booking.endDate >= data.startDate,
    );
    if (overlaps && !confirmOverlap) {
      return Response.json(
        {
          code: "BOOKING_OVERLAP",
          error:
            "Этот период пересекается с бронью по договору. Сохранить отметку?",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    return db.availability.create({ data: { ...data, ownerId: admin.id } });
  });
}
export async function DELETE(request: Request) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const { id } = z
      .object({ id: z.string().min(1).max(100) })
      .strict()
      .parse(await jsonBody(request));
    const result = await db.availability.deleteMany({
      where: { id, ownerId: admin.id },
    });
    if (!result.count) throw new AppError(404, "Запись не найдена");
    return { ok: true };
  });
}
