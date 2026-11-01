import { z } from "zod";
import { requireAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import {
  changePropertyGallery,
  getPropertyGallery,
  readImage,
} from "@/services/property-photos";

type Context = { params: Promise<{ id: string }> };
async function ownedProperty(ownerId: string, id: string) {
  const property = await db.property.findFirst({
    where: { id, ownerId },
    select: { id: true, ownerId: true, catalogSlug: true },
  });
  if (!property) throw new AppError(404, "Объект не найден");
  return property;
}
export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    return getPropertyGallery(await ownedProperty(admin.id, id));
  });
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const { id } = await context.params;
    await ownedProperty(admin.id, id);
    const header = request.headers.get("x-gallery-revision");
    if (!header || !/^\d{1,9}$/.test(header))
      throw new AppError(400, "Укажите версию галереи");
    const image = await readImage(request);
    return changePropertyGallery(admin.id, id, Number(header), {
      action: "add",
      image,
    });
  });
}
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const { id } = await context.params;
    const { revision, action, key } = z
      .object({
        revision: z.number().int().min(0).max(999999999),
        action: z.enum(["delete", "cover", "left", "right"]),
        key: z.string().min(1).max(500),
      })
      .strict()
      .parse(await jsonBody(request));
    return changePropertyGallery(admin.id, id, revision, { action, key });
  });
}
