import { z } from "zod";
import { requireAdmin } from "@/auth/session";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { ownedContract } from "@/repositories/contracts";
import { updateDraft } from "@/services/contracts";
import { contractSchema } from "@/validation/schemas";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return api(async () =>
    ownedContract((await requireAdmin()).id, (await context.params).id),
  );
}
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const body = z
      .object({
        content: contractSchema,
        revision: z.number().int().positive(),
      })
      .strict()
      .parse(await jsonBody(request));
    return updateDraft(
      admin.id,
      (await context.params).id,
      body.content,
      body.revision,
    );
  });
}
