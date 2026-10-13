import { requireAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { propertySchema } from "@/validation/schemas";
export async function GET() {
  return api(async () => {
    const admin = await requireAdmin();
    return db.property.findMany({
      where: { ownerId: admin.id },
      orderBy: { createdAt: "desc" },
    });
  });
}
export async function POST(request: Request) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const data = propertySchema.parse(await jsonBody(request));
    return db.property.create({ data: { ...data, ownerId: admin.id } });
  });
}
