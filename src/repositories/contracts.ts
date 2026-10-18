import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { effectiveStatus } from "@/domain/contracts";
import type { ContractInput, ContractSnapshot } from "@/validation/schemas";
const include = {
  versions: { orderBy: { version: "desc" as const }, include: { link: true } },
  events: { orderBy: { createdAt: "desc" as const } },
};
export async function ownedContract(ownerId: string, id: string) {
  const contract = await db.contract.findFirst({
    where: { id, ownerId },
    include,
  });
  if (!contract) throw new AppError(404, "Договор не найден");
  return contract;
}
export async function listContracts(ownerId: string) {
  const contracts = await db.contract.findMany({
    where: { ownerId },
    include,
    orderBy: { createdAt: "desc" },
  });
  return contracts.map((contract) => ({
    ...contract,
    effectiveStatus: effectiveStatus(contract, contract.versions[0]?.link),
    data: JSON.parse(contract.content) as ContractSnapshot,
  }));
}
export async function makeSnapshot(
  ownerId: string,
  input: ContractInput,
  number: string,
  createdAt: Date,
): Promise<ContractSnapshot> {
  const property = await db.property.findFirst({
    where: { id: input.propertyId, ownerId, archived: false },
  });
  if (!property)
    throw new AppError(400, "Выберите действующий объект недвижимости");
  if (property.catalogSlug && input.rent <= 0)
    throw new AppError(400, "Укажите согласованную стоимость аренды за весь срок");
  return {
    ...input,
    number,
    createdAt: createdAt.toISOString(),
    property: {
      name: property.name,
      address: property.address,
      type: property.type as "APARTMENT" | "APARTMENTS" | "HOTEL",
      unit: property.unit,
      description: property.description,
      rent: property.rent,
      deposit: property.deposit,
    },
  };
}
