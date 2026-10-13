import { requirePageAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { ContractForm } from "@/components/contract-form";
import type { PropertyInput } from "@/validation/schemas";
export default async function NewContract() {
  const properties = await db.property.findMany({
    where: { ownerId: (await requirePageAdmin()).id, archived: false },
  });
  return (
    <ContractForm
      properties={properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        type: p.type as PropertyInput["type"],
        unit: p.unit,
        description: p.description,
        rent: p.rent,
        deposit: p.deposit,
      }))}
    />
  );
}
