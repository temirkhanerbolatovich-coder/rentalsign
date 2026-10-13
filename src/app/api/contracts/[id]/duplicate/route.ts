import { requireAdmin } from "@/auth/session";
import { api, checkOrigin } from "@/lib/http";
import { duplicateContract } from "@/services/contracts";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    return duplicateContract(admin.id, (await context.params).id);
  });
}
