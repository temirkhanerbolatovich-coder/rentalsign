import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePageAdmin } from "@/auth/session";
import { ownedContract } from "@/repositories/contracts";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ContractForm } from "@/components/contract-form";
import type { ContractSnapshot, PropertyInput } from "@/validation/schemas";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePageAdmin();
  const { id } = await params;
  let contract;
  try {
    contract = await ownedContract(admin.id, id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  if (contract.status !== "DRAFT")
    return (
      <div className="card p-8">
        <h1 className="text-xl font-semibold">
          Отправленный договор заблокирован
        </h1>
        <p className="my-4 text-sm text-slate-500">
          Создайте новый договор на его основе, чтобы изменить условия.
        </p>
        <Link className="text-teal-700 underline" href={`/contracts/${id}`}>
          Открыть договор
        </Link>
      </div>
    );
  const properties = await db.property.findMany({
    where: { ownerId: admin.id, archived: false },
  });
  return (
    <ContractForm
      existing={{
        id,
        revision: contract.revision,
        snapshot: JSON.parse(contract.content) as ContractSnapshot,
      }}
      properties={properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        type: p.type as PropertyInput["type"],
        unit: p.unit,
        description: p.description,
        rent: p.rent,
        deposit: p.deposit,
        catalogSlug: p.catalogSlug,
      }))}
    />
  );
}
