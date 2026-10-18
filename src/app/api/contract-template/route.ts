import { requireAdmin } from "@/auth/session";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import {
  getContractTemplate,
  saveContractTemplate,
} from "@/services/contract-template";

export async function GET() {
  return api(async () => getContractTemplate((await requireAdmin()).id));
}

export async function PUT(request: Request) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    return saveContractTemplate(admin.id, await jsonBody(request));
  });
}
