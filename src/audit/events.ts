import type { Prisma } from "@prisma/client";
export function audit(
  tx: Prisma.TransactionClient,
  contractId: string,
  action: "CREATED" | "EDITED" | "LINK_ISSUED" | "LINK_REVOKED" | "DEMO_SIGNED",
  actor: "ADMIN" | "CLIENT",
) {
  return tx.auditEvent.create({ data: { contractId, action, actor } });
}
export const eventLabels: Record<string, string> = {
  CREATED: "Договор создан",
  EDITED: "Черновик обновлён",
  LINK_ISSUED: "Персональная ссылка создана",
  LINK_REVOKED: "Ссылка отозвана",
  DEMO_SIGNED: "Клиент выполнил демоподписание",
};
