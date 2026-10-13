import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { defaultTerms } from "../src/domain/contracts";
import { generatePdf } from "../src/pdf/generate";
import type {
  ContractInput,
  ContractSnapshot,
} from "../src/validation/schemas";
import type { PrismaClient } from "@prisma/client";
const testDatabase = `integration-${randomBytes(8).toString("hex")}.db`;
process.env.DATABASE_URL = `file:../tmp/${testDatabase}`;
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.APP_URL = "http://localhost:3000";
let db: PrismaClient;
let services: typeof import("../src/services/contracts");
let repository: typeof import("../src/repositories/contracts");
let signer: (typeof import("../src/signing/demo-provider"))["demoSigningProvider"];
let ownerId: string;
let otherId: string;
let input: ContractInput;
before(async () => {
  mkdirSync("tmp", { recursive: true });
  writeFileSync(path.join("tmp", testDatabase), "", { flag: "a" });
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  db = (await import("../src/lib/db")).db;
  services = await import("../src/services/contracts");
  repository = await import("../src/repositories/contracts");
  signer = (await import("../src/signing/demo-provider")).demoSigningProvider;
  ownerId = (
    await db.admin.create({
      data: { email: "fictional@integration.test", passwordHash: "not-used" },
    })
  ).id;
  otherId = (
    await db.admin.create({
      data: { email: "other@integration.test", passwordHash: "not-used" },
    })
  ).id;
  const property = await db.property.create({
    data: {
      ownerId,
      name: "ДЕМО • Объект",
      address: "Вымышленная улица, 1",
      type: "APARTMENT",
      unit: "1",
      description: "Данные исключительно вымышлены",
      rent: 20000,
      deposit: 10000,
    },
  });
  input = {
    propertyId: property.id,
    landlordName: "ДЕМО • Арендодатель",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "ДЕМО • Арендатор",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: "2026-10-15T14:00:00+05:00",
    checkOut: "2026-10-17T12:00:00+05:00",
    rent: 20000,
    deposit: 10000,
    additionalTerms: "Вымышленный договор",
    ...defaultTerms,
  };
});
after(async () => {
  await db?.$disconnect();
});
async function issued() {
  const contract = await services.createContract(ownerId, input);
  const link = await services.issueLink(ownerId, contract.id, 72, 1);
  return { contract, link, token: link.url.split("/").at(-1)! };
}
test("persist draft, immutable version, token encryption and complete demo flow", async () => {
  const { contract, link, token } = await issued();
  assert.equal(token.length, 43);
  const stored = await repository.ownedContract(ownerId, contract.id);
  assert.notEqual(stored.versions[0].link?.tokenHash, token);
  assert.ok(!stored.versions[0].link?.encryptedToken.includes(token));
  assert.equal(
    (await services.getOwnedLink(ownerId, contract.id)).url,
    link.url,
  );
  const firstRead = await services.publicContract(token);
  const secondRead = await services.publicContract(token);
  assert.deepEqual(firstRead.snapshot, secondRead.snapshot);
  await signer.sign(token, true);
  const signed = await services.publicContract(token);
  assert.equal(signed.status, "DEMO_SIGNED");
  assert.ok(signed.signedAt instanceof Date);
  const final = await repository.ownedContract(ownerId, contract.id);
  assert.equal(
    final.events.filter((e) => e.action === "DEMO_SIGNED").length,
    1,
  );
  assert.equal(final.versions[0].snapshot, stored.versions[0].snapshot);
  await assert.rejects(signer.sign(token, true), { status: 409 });
  await assert.rejects(
    services.updateDraft(ownerId, contract.id, input, final.revision),
    { status: 409 },
  );
  await assert.rejects(
    services.issueLink(ownerId, contract.id, 1, final.revision),
    { status: 409 },
  );
  await assert.rejects(services.revokeLink(ownerId, contract.id), {
    status: 409,
  });
});
test("expired link is rejected even when persisted status is PENDING", async () => {
  const { contract, token } = await issued();
  await db.signingLink.updateMany({
    where: { version: { contractId: contract.id } },
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  assert.equal(
    (await repository.ownedContract(ownerId, contract.id)).status,
    "PENDING",
  );
  assert.equal(
    (await repository.listContracts(ownerId)).find((c) => c.id === contract.id)
      ?.effectiveStatus,
    "EXPIRED",
  );
  await assert.rejects(services.publicContract(token), { status: 410 });
  await assert.rejects(signer.sign(token, true), { status: 410 });
});
test("revoked links expose no contract and cannot sign", async () => {
  const { contract, token } = await issued();
  await services.revokeLink(ownerId, contract.id);
  await assert.rejects(services.publicContract(token), { status: 410 });
  await assert.rejects(signer.sign(token, true), { status: 410 });
});
test("invalid, unknown and sequential tokens are rejected", async () => {
  for (const token of ["1", "../1", "x".repeat(43)]) {
    await assert.rejects(services.publicContract(token), { status: 404 });
    await assert.rejects(signer.sign(token, true), { status: 404 });
  }
});
test("acknowledgment is mandatory and leaves the contract pending", async () => {
  const { token } = await issued();
  await assert.rejects(signer.sign(token, false), { status: 400 });
  assert.equal((await services.publicContract(token)).status, "PENDING");
});
test("two concurrent signing requests produce exactly one success and one event", async () => {
  const { contract, token } = await issued();
  const results = await Promise.allSettled([
    signer.sign(token, true),
    signer.sign(token, true),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.equal(rejected.reason.status, 409);
  assert.equal(
    await db.auditEvent.count({
      where: { contractId: contract.id, action: "DEMO_SIGNED" },
    }),
    1,
  );
});
test("another administrator cannot read, edit, issue, revoke or clone an owned contract", async () => {
  const { contract } = await issued();
  await assert.rejects(repository.ownedContract(otherId, contract.id), {
    status: 404,
  });
  await assert.rejects(services.updateDraft(otherId, contract.id, input, 2), {
    status: 404,
  });
  await assert.rejects(services.issueLink(otherId, contract.id, 1, 2), {
    status: 404,
  });
  await assert.rejects(services.revokeLink(otherId, contract.id), {
    status: 409,
  });
  await assert.rejects(services.duplicateContract(otherId, contract.id), {
    status: 404,
  });
  await assert.rejects(services.createContract(otherId, input), {
    status: 400,
  });
});
test("new link invalidates previous one and property edits never change sent snapshots", async () => {
  const { contract, token } = await issued();
  const before = await services.publicContract(token);
  await db.property.update({
    where: { id: input.propertyId },
    data: { address: "Другой вымышленный адрес" },
  });
  const next = await services.issueLink(ownerId, contract.id, 24, 2);
  await assert.rejects(services.publicContract(token), { status: 410 });
  assert.deepEqual(
    (await services.publicContract(next.url.split("/").at(-1)!)).snapshot,
    before.snapshot,
  );
  assert.equal(
    (await repository.ownedContract(ownerId, contract.id)).versions.length,
    2,
  );
});
test("optimistic draft revision protects against lost updates and archived objects are rejected", async () => {
  const contract = await services.createContract(ownerId, input);
  await services.updateDraft(
    ownerId,
    contract.id,
    { ...input, rent: 30000 },
    1,
  );
  await assert.rejects(services.updateDraft(ownerId, contract.id, input, 1), {
    status: 409,
  });
  const copy = await services.duplicateContract(ownerId, contract.id);
  assert.equal(copy.status, "DRAFT");
  assert.notEqual(copy.number, contract.number);
  await db.property.update({
    where: { id: input.propertyId },
    data: { archived: true },
  });
  await assert.rejects(services.createContract(ownerId, input), {
    status: 400,
  });
  await db.property.update({
    where: { id: input.propertyId },
    data: { archived: false },
  });
});
test("server-side session expiration, hashing and database-backed rate limits", async () => {
  const { createSession, sessionAdmin } = await import("../src/auth/session");
  const { rateLimit } = await import("../src/lib/rate-limit");
  const session = await createSession(ownerId);
  assert.equal((await sessionAdmin(session.token))?.id, ownerId);
  assert.equal(await sessionAdmin("1"), null);
  await db.session.updateMany({
    where: { adminId: ownerId },
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  assert.equal(await sessionAdmin(session.token), null);
  await rateLimit("test", "fictional", 2, 600);
  await rateLimit("test", "fictional", 2, 600);
  await assert.rejects(rateLimit("test", "fictional", 2, 600), { status: 429 });
});
test("A4 PDF includes embedded Cyrillic font, page numbers and long flowing content", async () => {
  const { token } = await issued();
  const { snapshot } = await services.publicContract(token);
  const long: ContractSnapshot = {
    ...snapshot,
    additionalTerms:
      "ДЕМО. Длинный текст договора с кириллицей и понятными условиями аренды. ".repeat(
        140,
      ) + "КОНЕЦ ДЛИННОГО ТЕКСТА",
  };
  const bytes = await generatePdf(long, new Date());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok(bytes.length > 15000);
  assert.ok(bytes.toString("latin1").includes("/FontFile2"));
  assert.ok(
    (bytes.toString("latin1").match(/\/Type \/Page\b/g) || []).length > 2,
  );
  mkdirSync("output/pdf", { recursive: true });
  writeFileSync(path.join("output/pdf", "long-demo-contract.pdf"), bytes);
  writeFileSync(
    path.join("output/pdf", "preview-demo-contract.pdf"),
    await generatePdf(snapshot),
  );
});
