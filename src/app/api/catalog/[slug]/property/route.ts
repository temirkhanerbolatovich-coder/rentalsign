import { requireAdmin } from "@/auth/session";
import { api, checkOrigin } from "@/lib/http";
import { ensureCatalogProperty } from "@/services/catalog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const { slug } = await params;
    const property = await ensureCatalogProperty(admin.id, slug);
    return { id: property.id };
  });
}
