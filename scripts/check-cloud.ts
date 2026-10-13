import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { defaultTerms } from "../src/domain/contracts";
import {
  createContract,
  issueLink,
  revokeLink,
} from "../src/services/contracts";
import { ownedContract } from "../src/repositories/contracts";
import { demoSigningProvider } from "../src/signing/demo-provider";

async function main() {
  if (
    process.env.DATABASE_PROVIDER !== "postgresql" ||
    process.env.CLOUD_SMOKE_ALLOW_WRITES !== "1"
  ) {
    throw new Error("Explicit PostgreSQL smoke-test write flag required");
  }
  const owner = await db.admin.findUniqueOrThrow({
    where: { email: process.env.ADMIN_EMAIL },
  });
  const property = await db.property.create({
    data: {
      ownerId: owner.id,
      name: "ДЕМО • Проверка облачной базы",
      address: "Вымышленный город, улица Тестовая, 1",
      type: "APARTMENT",
      unit: "1",
      description:
        "Вымышленные данные проверки конкурентных операций PostgreSQL.",
      rent: 25000,
      deposit: 10000,
    },
  });
  const input = {
    propertyId: property.id,
    landlordName: "ДЕМО • Арендодатель",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "ДЕМО • Приёмка PostgreSQL",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: new Date(Date.now() + 86400000).toISOString(),
    checkOut: new Date(Date.now() + 3 * 86400000).toISOString(),
    rent: property.rent,
    deposit: property.deposit,
    additionalTerms: "Вымышленные данные. Настоящая ЭЦП не используется.",
    ...defaultTerms,
  };
  async function pending() {
    const contract = await createContract(owner.id, input);
    const issued = await issueLink(owner.id, contract.id, 72, 1);
    return { contract, token: issued.url.split("/").at(-1)! };
  }
  const duplicate = await pending();
  const twoSigns = await Promise.allSettled([
    demoSigningProvider.sign(duplicate.token, true),
    demoSigningProvider.sign(duplicate.token, true),
  ]);
  assert.equal(
    twoSigns.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { contractId: duplicate.contract.id, action: "DEMO_SIGNED" },
    }),
    1,
  );
  console.log(
    "PostgreSQL: two concurrent sign requests -> one completion and one audit event",
  );
  const revoked = await pending();
  const revokeRace = await Promise.allSettled([
    demoSigningProvider.sign(revoked.token, true),
    revokeLink(owner.id, revoked.contract.id),
  ]);
  assert.equal(
    revokeRace.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const afterRevoke = await ownedContract(owner.id, revoked.contract.id);
  assert.ok(["DEMO_SIGNED", "REVOKED"].includes(afterRevoke.status));
  assert.equal(
    Boolean(afterRevoke.versions[0].signedAt),
    afterRevoke.status === "DEMO_SIGNED",
  );
  assert.equal(
    Boolean(afterRevoke.versions[0].link?.revokedAt),
    afterRevoke.status === "REVOKED",
  );
  console.log(
    "PostgreSQL: revoke/sign race -> consistent final link and contract state",
  );
  const rotated = await pending();
  const rotateRace = await Promise.allSettled([
    demoSigningProvider.sign(rotated.token, true),
    issueLink(owner.id, rotated.contract.id, 72, 2),
  ]);
  assert.equal(
    rotateRace.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const afterRotate = await ownedContract(owner.id, rotated.contract.id);
  assert.equal(
    Boolean(afterRotate.versions[0].signedAt),
    afterRotate.status === "DEMO_SIGNED",
  );
  assert.equal(
    await db.auditEvent.count({
      where: { contractId: rotated.contract.id, action: "DEMO_SIGNED" },
    }),
    afterRotate.status === "DEMO_SIGNED" ? 1 : 0,
  );
  console.log(
    "PostgreSQL: link rotation/sign race -> latest snapshot matches final contract state",
  );
}
main()
  .catch((error) => {
    console.error("Cloud smoke test failed", {
      type: error instanceof Error ? error.name : "Unknown",
      code: error?.code,
      status: error?.status,
    });
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
