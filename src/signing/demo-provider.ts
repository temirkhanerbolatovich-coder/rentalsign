import { transaction } from "@/lib/transaction";
import { hashToken, validToken } from "@/lib/crypto";
import { AppError } from "@/lib/errors";
import { audit } from "@/audit/events";
import type { SigningProvider, SigningResult } from "./provider";
export class DemoSigningProvider implements SigningProvider {
  async sign(token: string, acknowledged: boolean): Promise<SigningResult> {
    if (!acknowledged)
      throw new AppError(400, "Подтвердите ознакомление с условиями");
    if (!validToken(token)) throw new AppError(404, "Ссылка не найдена");
    return transaction(async (tx) => {
      const link = await tx.signingLink.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { version: true },
      });
      if (!link) throw new AppError(404, "Ссылка не найдена");
      const signedAt = new Date();
      if (link.revokedAt || link.expiresAt <= signedAt)
        throw new AppError(410, "Ссылка истекла или отозвана");
      // Compare-and-set and event write share one transaction: only one request can win.
      const updated = await tx.contract.updateMany({
        where: { id: link.version.contractId, status: "PENDING" },
        data: { status: "DEMO_SIGNED", signedAt, revision: { increment: 1 } },
      });
      if (!updated.count)
        throw new AppError(
          409,
          "Демонстрационное действие уже выполнено или ссылка недействительна",
        );
      await tx.contractVersion.update({
        where: { id: link.versionId },
        data: { signedAt },
      });
      await audit(tx, link.version.contractId, "DEMO_SIGNED", "CLIENT");
      return { status: "DEMO_SIGNED", signedAt };
    });
  }
}
export const demoSigningProvider = new DemoSigningProvider();
