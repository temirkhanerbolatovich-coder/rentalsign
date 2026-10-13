import { z } from "zod";
import { requireAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { propertySchema } from "@/validation/schemas";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const { id } = await context.params;
    const data = z
      .union([propertySchema, z.object({ archived: z.boolean() }).strict()])
      .parse(await jsonBody(request));
    const result = await db.property.updateMany({
      where: { id, ownerId: admin.id },
      data,
    });
    if (!result.count) throw new AppError(404, "Объект не найден");
    return { id };
  });
}
