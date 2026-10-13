import { requireAdmin } from "@/auth/session";
import { api } from "@/lib/http";
import { ownedContract } from "@/repositories/contracts";
import { generatePdf, pdfResponse } from "@/pdf/generate";
import type { ContractSnapshot } from "@/validation/schemas";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const contract = await ownedContract(
      (await requireAdmin()).id,
      (await context.params).id,
    );
    const version = contract.versions[0];
    const snapshot = JSON.parse(
      version?.snapshot || contract.content,
    ) as ContractSnapshot;
    return pdfResponse(
      await generatePdf(snapshot, version?.signedAt),
      snapshot.number,
    );
  });
}
