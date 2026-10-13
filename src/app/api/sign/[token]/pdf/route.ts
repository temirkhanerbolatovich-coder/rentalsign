import { api } from "@/lib/http";
import { publicRateLimit } from "@/lib/rate-limit";
import { publicContract } from "@/services/contracts";
import { generatePdf, pdfResponse } from "@/pdf/generate";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return api(async () => {
    const { token } = await context.params;
    await publicRateLimit(token);
    const contract = await publicContract(token);
    return pdfResponse(
      await generatePdf(contract.snapshot, contract.signedAt),
      contract.snapshot.number,
    );
  });
}
