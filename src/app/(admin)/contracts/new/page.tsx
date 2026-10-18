import { requirePageAdmin } from "@/auth/session";
import { db } from "@/lib/db";
import { ContractForm } from "@/components/contract-form";
import type { PropertyInput } from "@/validation/schemas";
import { notFound } from "next/navigation";
import { findApartment } from "@/catalog/apartments";
import { CatalogImport } from "@/components/catalog-import";
import { getContractTemplate } from "@/services/contract-template";
export default async function NewContract({
  searchParams,
}: {
  searchParams: Promise<{ apartment?: string; propertyId?: string }>;
}) {
  const admin = await requirePageAdmin();
  const query = await searchParams;
  const apartment =
    typeof query.apartment === "string"
      ? findApartment(query.apartment)
      : undefined;
  if (query.apartment && !apartment) notFound();
  if (apartment) {
    const linked = await db.property.findUnique({
      where: {
        ownerId_catalogSlug: { ownerId: admin.id, catalogSlug: apartment.slug },
      },
    });
    if (!linked || linked.archived)
      return (
        <CatalogImport
          slug={apartment.slug}
          title={`${apartment.address}, кв. ${apartment.unit}`}
        />
      );
  }
  const properties = await db.property.findMany({
    where: { ownerId: admin.id, archived: false },
  });
  const selectedProperty = properties.find((p) =>
    apartment ? p.catalogSlug === apartment.slug : p.id === query.propertyId,
  );
  return (
    <ContractForm
      templateDefaults={await getContractTemplate(admin.id)}
      selectedPropertyId={selectedProperty?.id}
      key={selectedProperty?.id || "new"}
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
