import { requireAdmin } from "@/auth/session";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { getOwnedLink, issueLink, revokeLink } from "@/services/contracts";
import { issueSchema } from "@/validation/schemas";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return api(async () =>
    getOwnedLink((await requireAdmin()).id, (await context.params).id),
  );
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const body = issueSchema.parse(await jsonBody(request));
    return issueLink(
      admin.id,
      (await context.params).id,
      body.ttlHours,
      body.revision,
    );
  });
}
export async function DELETE(request: Request, context: Context) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    return revokeLink(admin.id, (await context.params).id);
  });
}
