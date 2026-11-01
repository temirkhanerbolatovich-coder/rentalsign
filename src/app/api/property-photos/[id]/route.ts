import { getAdmin } from "@/auth/session";
import { findApartment } from "@/catalog/apartments";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { api } from "@/lib/http";
import { catalogOwnerEmail } from "@/services/property-photos";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    const photo = await db.propertyPhoto.findUnique({
      where: { id },
      select: {
        data: true,
        gallery: {
          select: {
            property: {
              select: {
                ownerId: true,
                catalogSlug: true,
                owner: { select: { email: true } },
              },
            },
          },
        },
      },
    });
    if (!photo?.data) throw new AppError(404, "Фотография не найдена");
    const property = photo.gallery.property;
    const email = catalogOwnerEmail();
    const published = Boolean(
      email &&
      property.owner.email.toLowerCase() === email &&
      property.catalogSlug &&
      findApartment(property.catalogSlug),
    );
    if (!published && (await getAdmin())?.id !== property.ownerId)
      throw new AppError(404, "Фотография не найдена");
    return new Response(new Uint8Array(photo.data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
