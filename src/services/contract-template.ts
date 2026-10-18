import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getDefaultContractTemplate } from "@/domain/contract-template";
import { contractTemplateSchema } from "@/validation/contract-template";

export async function getContractTemplate(ownerId: string) {
  const owner = await db.admin.findUnique({
    where: { id: ownerId },
    select: { contractDefaults: true },
  });
  if (!owner) throw new AppError(404, "Аккаунт не найден");
  if (!owner.contractDefaults) return getDefaultContractTemplate();
  try {
    return contractTemplateSchema.parse(JSON.parse(owner.contractDefaults));
  } catch {
    throw new AppError(500, "Не удалось прочитать сохранённый шаблон договора");
  }
}

export async function saveContractTemplate(ownerId: string, input: unknown) {
  const template = contractTemplateSchema.parse(input);
  await db.admin.update({
    where: { id: ownerId },
    data: { contractDefaults: JSON.stringify(template) },
    select: { id: true },
  });
  return template;
}
