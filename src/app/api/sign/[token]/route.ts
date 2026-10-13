import { api, checkOrigin, jsonBody } from "@/lib/http";
import { publicRateLimit } from "@/lib/rate-limit";
import { publicContract } from "@/services/contracts";
import { demoSigningProvider } from "@/signing/demo-provider";
import { signingSchema } from "@/validation/schemas";
type Context = { params: Promise<{ token: string }> };
export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const { token } = await context.params;
    await publicRateLimit(token);
    return publicContract(token);
  });
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const { token } = await context.params;
    await publicRateLimit(token);
    const input = signingSchema.parse(await jsonBody(request));
    return demoSigningProvider.sign(token, input.acknowledged);
  });
}
