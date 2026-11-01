import { requireAdmin } from "@/auth/session";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { saveCatalogListing } from "@/services/catalog-listing";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const { id } = await context.params;
    return saveCatalogListing(admin.id, id, await jsonBody(request));
  });
}
