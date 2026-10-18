import { db } from "@/lib/db";
import { apartments } from "@/catalog/apartments";
import { ensureCatalogProperty } from "@/services/catalog";

const demoAddress = /демонстрацион|вымышлен/i;
function isDemoSnapshot(content: string) {
  try {
    const snapshot = JSON.parse(content);
    return (
      typeof snapshot.landlordName === "string" &&
      snapshot.landlordName.startsWith("ДЕМО •") &&
      typeof snapshot.tenantName === "string" &&
      snapshot.tenantName.startsWith("ДЕМО •") &&
      typeof snapshot.property?.address === "string" &&
      demoAddress.test(snapshot.property.address)
    );
  } catch {
    return false;
  }
}

/** Removes identifiable fixtures only; mixed or unrecognised contract history is retained. */
export async function removeDemoProperties(ownerId: string) {
  return db.$transaction(
    async (tx) => {
      const properties = await tx.property.findMany({
        where: { ownerId, catalogSlug: null, name: { startsWith: "ДЕМО •" } },
        include: {
          contracts: {
            select: {
              id: true,
              ownerId: true,
              content: true,
              versions: { select: { snapshot: true } },
            },
          },
        },
      });
      let deletedProperties = 0;
      let deletedContracts = 0;
      let archivedProperties = 0;
      for (const property of properties) {
        if (
          !demoAddress.test(property.address) ||
          !/вымышлен|демонстрац/i.test(property.description)
        )
          continue;
        const hasOnlyDemoHistory = property.contracts.every(
          (contract) =>
            contract.ownerId === ownerId &&
            isDemoSnapshot(contract.content) &&
            contract.versions.every((version) =>
              isDemoSnapshot(version.snapshot),
            ),
        );
        if (!hasOnlyDemoHistory) {
          if (!property.archived) {
            await tx.property.update({
              where: { id: property.id },
              data: { archived: true },
            });
            archivedProperties++;
          }
          continue;
        }
        const ids = property.contracts.map((contract) => contract.id);
        await tx.signingLink.deleteMany({
          where: { version: { contractId: { in: ids } } },
        });
        await tx.auditEvent.deleteMany({ where: { contractId: { in: ids } } });
        await tx.contractVersion.deleteMany({
          where: { contractId: { in: ids } },
        });
        await tx.contract.deleteMany({ where: { id: { in: ids }, ownerId } });
        await tx.property.delete({ where: { id: property.id } });
        deletedProperties++;
        deletedContracts += ids.length;
      }
      return { deletedProperties, deletedContracts, archivedProperties };
    },
    { timeout: 10000 },
  );
}

/** Imports missing public apartments without overwriting or restoring existing private objects. */
export async function importCatalogProperties(ownerId: string) {
  const existing = await db.property.findMany({
    where: { ownerId, catalogSlug: { not: null } },
    select: { catalogSlug: true },
  });
  const slugs = new Set(existing.map((p) => p.catalogSlug));
  let imported = 0;
  for (const apartment of apartments) {
    if (slugs.has(apartment.slug)) continue;
    await ensureCatalogProperty(ownerId, apartment.slug);
    imported++;
  }
  return { imported, total: apartments.length };
}

export async function prepareOwnerWorkspace(ownerId: string) {
  const cleanup = await removeDemoProperties(ownerId);
  const imported = await importCatalogProperties(ownerId);
  return { ...cleanup, ...imported };
}
