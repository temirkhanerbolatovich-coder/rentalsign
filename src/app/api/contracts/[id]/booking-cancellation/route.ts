import { requireAdmin } from "@/auth/session";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { cancelBooking } from "@/services/contracts";
import { z } from "zod";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const admin = await requireAdmin();
    checkOrigin(request);
    const { reason } = z
      .object({
        reason: z
          .string()
          .trim()
          .min(1, "Укажите причину отмены")
          .max(500, "Причина не должна превышать 500 символов"),
      })
      .strict()
      .parse(await jsonBody(request));
    return cancelBooking(admin.id, (await context.params).id, reason);
  });
}
