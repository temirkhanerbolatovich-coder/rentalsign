import { requireAdmin } from "@/auth/session";
import { api, checkOrigin } from "@/lib/http";
import { importCatalogProperties } from "@/services/admin-workspace";

export async function POST(request: Request) {
  return api(async () => {
    const owner = await requireAdmin();
    checkOrigin(request);
    return importCatalogProperties(owner.id);
  });
}
