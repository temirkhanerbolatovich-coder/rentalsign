import { requireAdmin } from "@/auth/session";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { listContracts } from "@/repositories/contracts";
import { createContract } from "@/services/contracts";
import { contractSchema } from "@/validation/schemas";
export async function GET() {
  return api(async () => listContracts((await requireAdmin()).id));
}
export async function POST(request: Request) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    return createContract(
      admin.id,
      contractSchema.parse(await jsonBody(request)),
    );
  });
}
