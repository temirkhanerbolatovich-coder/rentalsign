import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { transaction } from "@/lib/transaction";
import {
  decryptToken,
  encryptToken,
  hashToken,
  randomToken,
  validToken,
} from "@/lib/crypto";
import { appOrigin } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { makeSnapshot, ownedContract } from "@/repositories/contracts";
import { effectiveStatus } from "@/domain/contracts";
import { audit } from "@/audit/events";
import type { ContractInput, ContractSnapshot } from "@/validation/schemas";
export async function createContract(ownerId: string, input: ContractInput) {
  const createdAt = new Date();
  const number = `RS-${createdAt.getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const content = JSON.stringify(
    await makeSnapshot(ownerId, input, number, createdAt),
  );
  return transaction(async (tx) => {
    const contract = await tx.contract.create({
      data: {
        ownerId,
        propertyId: input.propertyId,
        number,
        content,
        createdAt,
      },
    });
    await audit(tx, contract.id, "CREATED", "ADMIN");
    return contract;
  });
}
export async function updateDraft(
  ownerId: string,
  id: string,
  input: ContractInput,
  revision: number,
) {
  const contract = await ownedContract(ownerId, id);
  const content = JSON.stringify(
    await makeSnapshot(ownerId, input, contract.number, contract.createdAt),
  );
  return transaction(async (tx) => {
    const result = await tx.contract.updateMany({
      where: { id, ownerId, status: "DRAFT", revision },
      data: {
        content,
        propertyId: input.propertyId,
        revision: { increment: 1 },
      },
    });
    if (!result.count)
      throw new AppError(
        409,
        "Договор уже отправлен или изменён. Обновите страницу",
      );
    await audit(tx, id, "EDITED", "ADMIN");
    return { id };
  });
}
export async function issueLink(
  ownerId: string,
  id: string,
  ttlHours: number,
  revision: number,
) {
  if (!Number.isInteger(ttlHours) || ttlHours < 1 || ttlHours > 720)
    throw new AppError(400, "Срок ссылки: от 1 до 720 часов");
  const token = randomToken();
  const encryptedToken = encryptToken(token);
  const expiresAt = new Date(Date.now() + ttlHours * 3600000);
  const link = await transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { id, ownerId },
      include: { versions: true },
    });
    if (!contract) throw new AppError(404, "Договор не найден");
    const updated = await tx.contract.updateMany({
      where: { id, ownerId, status: { not: "DEMO_SIGNED" }, revision },
      data: { status: "PENDING", revision: { increment: 1 } },
    });
    if (!updated.count)
      throw new AppError(
        409,
        "Договор подписан или изменён. Обновите страницу",
      );
    await tx.signingLink.updateMany({
      where: { version: { contractId: id }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const version = await tx.contractVersion.create({
      data: {
        contractId: id,
        version: contract.versions.length + 1,
        snapshot: contract.content,
        contentHash: hashToken(contract.content),
      },
    });
    const issued = await tx.signingLink.create({
      data: {
        versionId: version.id,
        tokenHash: hashToken(token),
        encryptedToken,
        expiresAt,
      },
    });
    await audit(tx, id, "LINK_ISSUED", "ADMIN");
    return issued;
  });
  return { url: `${appOrigin()}/sign/${token}`, expiresAt: link.expiresAt };
}
export async function getOwnedLink(ownerId: string, id: string) {
  const contract = await ownedContract(ownerId, id);
  const link = contract.versions[0]?.link;
  if (!link || effectiveStatus(contract, link) !== "PENDING")
    throw new AppError(409, "У договора нет активной ссылки");
  return {
    url: `${appOrigin()}/sign/${decryptToken(link.encryptedToken)}`,
    expiresAt: link.expiresAt,
  };
}
export async function revokeLink(ownerId: string, id: string) {
  return transaction(async (tx) => {
    const result = await tx.contract.updateMany({
      where: { id, ownerId, status: { in: ["PENDING", "EXPIRED"] } },
      data: { status: "REVOKED", revision: { increment: 1 } },
    });
    if (!result.count)
      throw new AppError(
        409,
        "Отзыв недоступен: договор подписан, уже отозван или не найден",
      );
    await tx.signingLink.updateMany({
      where: { version: { contractId: id }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(tx, id, "LINK_REVOKED", "ADMIN");
    return { id };
  });
}
export async function publicContract(token: string) {
  if (!validToken(token)) throw new AppError(404, "Ссылка не найдена");
  const link = await db.signingLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { version: { include: { contract: true } } },
  });
  if (!link) throw new AppError(404, "Ссылка не найдена");
  if (link.revokedAt)
    throw new AppError(410, "Ссылка отозвана. Обратитесь к арендодателю");
  if (link.expiresAt <= new Date())
    throw new AppError(
      410,
      "Срок действия ссылки истёк. Обратитесь к арендодателю",
    );
  return {
    snapshot: JSON.parse(link.version.snapshot) as ContractSnapshot,
    status: effectiveStatus(link.version.contract, link),
    signedAt: link.version.signedAt,
    expiresAt: link.expiresAt,
  };
}
export async function duplicateContract(ownerId: string, id: string) {
  const original = await ownedContract(ownerId, id);
  const data = JSON.parse(original.content) as ContractSnapshot;
  const {
    number: _number,
    createdAt: _createdAt,
    property: _property,
    ...input
  } = data;
  void _number;
  void _createdAt;
  void _property;
  return createContract(ownerId, input);
}
