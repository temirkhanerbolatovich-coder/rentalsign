import { requirePageAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { PropertiesManager } from "@/components/properties-manager";
import type { PropertyInput } from "@/validation/schemas";
export default async function Properties() {
  const properties = await db.property.findMany({
    where: { ownerId: (await requirePageAdmin()).id },
    orderBy: { createdAt: "desc" },
  });
  return (
    <PropertiesManager
      properties={properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        type: p.type as PropertyInput["type"],
        unit: p.unit,
        description: p.description,
        rent: p.rent,
        deposit: p.deposit,
        archived: p.archived,
        catalogSlug: p.catalogSlug,
      }))}
    />
  );
}
