import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { PrismaClient } from "@prisma/client";
import { apartments } from "../src/catalog/apartments";
import { defaultTerms } from "../src/domain/contracts";
import { generatePdf } from "../src/pdf/generate";
import type {
  ContractInput,
  ContractSnapshot,
} from "../src/validation/schemas";

const testDatabase = `admin-workspace-${randomBytes(8).toString("hex")}.db`;
process.env.DATABASE_URL = `file:../tmp/${testDatabase}`;
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.APP_URL = "http://localhost:3000";
let db: PrismaClient;
let workspace: typeof import("../src/services/admin-workspace");
let contracts: typeof import("../src/services/contracts");
let templates: typeof import("../src/services/contract-template");

before(async () => {
  mkdirSync("tmp", { recursive: true });
  writeFileSync(path.join("tmp", testDatabase), "", { flag: "a" });
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  db = (await import("../src/lib/db")).db;
  workspace = await import("../src/services/admin-workspace");
  contracts = await import("../src/services/contracts");
  templates = await import("../src/services/contract-template");
});

after(async () => {
  await db?.$disconnect();
});

async function owner() {
  return db.admin.create({
    data: {
      email: `${randomBytes(8).toString("hex")}@workspace.test`,
      passwordHash: "not-used",
    },
  });
}

function contractInput(propertyId: string): ContractInput {
  return {
    propertyId,
    landlordName: "ДЕМО • Вымышленный арендодатель",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "ДЕМО • Вымышленный арендатор",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: "2026-10-20T14:00:00+05:00",
    checkOut: "2026-10-22T12:00:00+05:00",
    rent: 40000,
    deposit: 10000,
    additionalTerms: "",
    ...defaultTerms,
  };
}

async function demoProperty(ownerId: string, suffix: string) {
  return db.property.create({
    data: {
      ownerId,
      name: `ДЕМО • ${suffix}`,
      address: "Вымышленная улица, 1",
      type: "APARTMENT",
      unit: "1",
      description: "Демонстрационные вымышленные данные",
      rent: 40000,
      deposit: 10000,
    },
  });
}

test("cleanup removes proven demo fixtures and their links, preserves other owners and real records", async () => {
  const admin = await owner();
  const other = await owner();
  const removable = await demoProperty(admin.id, "Удаляемый пример");
  const empty = await demoProperty(admin.id, "Пустой пример");
  const otherProperty = await demoProperty(other.id, "Чужой пример");
  const genuine = await db.property.create({
    data: {
      ownerId: admin.id,
      name: "Квартира владельца",
      address: "Усть-Каменогорск, Базовая 2/6",
      type: "APARTMENT",
      unit: "12",
      description: "Реальный объект владельца",
      rent: 0,
      deposit: 0,
    },
  });
  const demo = await contracts.createContract(
    admin.id,
    contractInput(removable.id),
  );
  const issued = await contracts.issueLink(admin.id, demo.id, 24, 1);
  const token = issued.url.split("/").at(-1)!;
  const result = await workspace.removeDemoProperties(admin.id);
  assert.equal(result.deletedProperties, 2);
  assert.equal(result.deletedContracts, 1);
  assert.equal(await db.property.findUnique({ where: { id: empty.id } }), null);
  assert.equal(
    await db.property.findUnique({ where: { id: removable.id } }),
    null,
  );
  assert.equal(await db.contract.findUnique({ where: { id: demo.id } }), null);
  assert.equal(
    await db.contractVersion.count({ where: { contractId: demo.id } }),
    0,
  );
  assert.equal(
    await db.auditEvent.count({ where: { contractId: demo.id } }),
    0,
  );
  await assert.rejects(contracts.publicContract(token), { status: 404 });
  assert.equal(
    (await db.property.findUniqueOrThrow({ where: { id: otherProperty.id } }))
      .archived,
    false,
  );
  assert.equal(
    (await db.property.findUniqueOrThrow({ where: { id: genuine.id } }))
      .archived,
    false,
  );
  const repeated = await workspace.removeDemoProperties(admin.id);
  assert.equal(repeated.deletedProperties, 0);
  assert.equal(repeated.deletedContracts, 0);
});

test("cleanup archives demo properties when a dependent contract is real or malformed", async () => {
  const admin = await owner();
  const mixed = await demoProperty(admin.id, "С договором арендатора");
  const malformed = await demoProperty(admin.id, "С неизвестным содержимым");
  const historical = await demoProperty(admin.id, "С реальным старым снимком");
  const realContract = await contracts.createContract(admin.id, {
    ...contractInput(mixed.id),
    tenantName: "Арендатор с настоящими данными",
  });
  const link = await contracts.issueLink(admin.id, realContract.id, 24, 1);
  const historicalContract = await contracts.createContract(admin.id, {
    ...contractInput(historical.id),
    tenantName: "Арендатор в сохранённой версии",
  });
  const historicalLink = await contracts.issueLink(
    admin.id,
    historicalContract.id,
    24,
    1,
  );
  // A recognisable draft must never justify deleting an earlier non-demo version.
  const historicalSnapshot = JSON.parse(historicalContract.content);
  await db.contract.update({
    where: { id: historicalContract.id },
    data: {
      content: JSON.stringify({
        ...historicalSnapshot,
        tenantName: "ДЕМО • Вымышленный арендатор",
      }),
    },
  });
  const unknownContract = await db.contract.create({
    data: {
      ownerId: admin.id,
      propertyId: malformed.id,
      number: `UNKNOWN-${randomBytes(8).toString("hex")}`,
      content: "{malformed",
    },
  });
  const before = await db.contractVersion.findFirstOrThrow({
    where: { contractId: realContract.id },
  });
  const result = await workspace.removeDemoProperties(admin.id);
  assert.equal(result.deletedProperties, 0);
  assert.equal(result.deletedContracts, 0);
  for (const id of [mixed.id, malformed.id, historical.id]) {
    assert.equal(
      (await db.property.findUniqueOrThrow({ where: { id } })).archived,
      true,
    );
  }
  assert.equal(
    (await db.contract.findUniqueOrThrow({ where: { id: unknownContract.id } }))
      .content,
    "{malformed",
  );
  assert.equal(
    (await db.contractVersion.findUniqueOrThrow({ where: { id: before.id } }))
      .snapshot,
    before.snapshot,
  );
  assert.equal(
    (await contracts.publicContract(link.url.split("/").at(-1)!)).snapshot
      .tenantName,
    "Арендатор с настоящими данными",
  );
  assert.equal(
    (await contracts.publicContract(historicalLink.url.split("/").at(-1)!))
      .snapshot.tenantName,
    "Арендатор в сохранённой версии",
  );
  await workspace.removeDemoProperties(admin.id);
  assert.equal(await db.contract.count({ where: { ownerId: admin.id } }), 3);
});

test("workspace imports all seven apartments once per owner and preserves edits and archives", async () => {
  const admin = await owner();
  const other = await owner();
  const first = await workspace.prepareOwnerWorkspace(admin.id);
  assert.equal(first.imported, apartments.length);
  assert.equal(await db.property.count({ where: { ownerId: admin.id } }), 7);
  assert.equal(await db.property.count({ where: { ownerId: other.id } }), 0);
  const property = await db.property.findFirstOrThrow({
    where: { ownerId: admin.id, catalogSlug: apartments[0].slug },
  });
  await db.property.update({
    where: { id: property.id },
    data: {
      name: "Уточнённое владельцем название",
      rent: 75000,
      archived: true,
    },
  });
  const repeated = await workspace.prepareOwnerWorkspace(admin.id);
  assert.equal(repeated.imported, 0);
  assert.equal(await db.property.count({ where: { ownerId: admin.id } }), 7);
  const retained = await db.property.findUniqueOrThrow({
    where: { id: property.id },
  });
  assert.equal(retained.name, "Уточнённое владельцем название");
  assert.equal(retained.rent, 75000);
  assert.equal(retained.archived, true);
  await workspace.prepareOwnerWorkspace(other.id);
  assert.equal(await db.property.count({ where: { ownerId: other.id } }), 7);
});

test("private contract defaults validate strictly and are isolated between owners", async () => {
  const admin = await owner();
  const other = await owner();
  const defaults = await templates.getContractTemplate(admin.id);
  const personal = {
    ...defaults,
    landlordName: "Проверочный владелец шаблона",
    landlordPhone: "+7 000 000 00 00",
    landlordId: "000000000000",
    landlordDocument: "Проверочное удостоверение 000001",
    landlordDocumentIssued: "Проверочный орган выдачи",
    additionalTerms: "Только личный шаблон этого владельца",
  };
  await templates.saveContractTemplate(admin.id, personal);
  assert.deepEqual(await templates.getContractTemplate(admin.id), personal);
  assert.deepEqual(await templates.getContractTemplate(other.id), defaults);
  for (const invalid of [
    { ...personal, ownerId: other.id },
    { ...personal, landlordId: "123" },
    { ...personal, landlordPhone: "--------" },
    { ...personal, obligations: "   " },
    { ...personal, additionalTerms: "x".repeat(10001) },
  ]) {
    await assert.rejects(templates.saveContractTemplate(admin.id, invalid));
  }
  assert.deepEqual(await templates.getContractTemplate(admin.id), personal);
});

test("new template conditions and identities reach immutable contract PDF while legacy snapshots remain intact", async () => {
  const admin = await owner();
  await workspace.prepareOwnerWorkspace(admin.id);
  const property = await db.property.findFirstOrThrow({
    where: { ownerId: admin.id },
  });
  const legacy = await contracts.createContract(
    admin.id,
    contractInput(property.id),
  );
  const legacyBefore = legacy.content;
  const legacySnapshot = JSON.parse(legacyBefore) as ContractSnapshot;
  assert.equal("landlordDocument" in legacySnapshot, false);
  assert.equal("tenantAddress" in legacySnapshot, false);
  const defaults = await templates.getContractTemplate(admin.id);
  const prepared = {
    ...defaults,
    landlordName: "Проверочный владелец PDF",
    landlordPhone: "+7 000 000 00 00",
    landlordDocument: "Удостоверение 000001",
    landlordDocumentIssued: "Проверочный орган",
    additionalTerms: "Особое условие проживания из личного шаблона",
  };
  await templates.saveContractTemplate(admin.id, prepared);
  const input = {
    ...contractInput(property.id),
    ...prepared,
    tenantDocument: "Проверочное удостоверение арендатора",
    tenantAddress: "Проверочный адрес арендатора",
  };
  const contract = await contracts.createContract(admin.id, input);
  const link = await contracts.issueLink(admin.id, contract.id, 24, 1);
  await templates.saveContractTemplate(admin.id, {
    ...prepared,
    landlordName: "Другое имя после отправки",
    additionalTerms: "Другие условия после отправки",
  });
  const published = await contracts.publicContract(link.url.split("/").at(-1)!);
  assert.equal(published.snapshot.landlordName, prepared.landlordName);
  assert.equal(published.snapshot.additionalTerms, prepared.additionalTerms);
  assert.equal(published.snapshot.tenantAddress, input.tenantAddress);
  assert.equal("contractDefaults" in published, false);
  assert.equal("contractDefaults" in published.snapshot, false);
  assert.equal("ownerId" in published.snapshot, false);
  assert.equal(
    (await db.contract.findUniqueOrThrow({ where: { id: legacy.id } })).content,
    legacyBefore,
  );

  // Capture text at PDFKit's public writing boundary while still generating a real PDF.
  const rendered: string[] = [];
  const originalText = PDFDocument.prototype.text;
  PDFDocument.prototype.text = function (value: string, ...options: unknown[]) {
    rendered.push(value);
    return Reflect.apply(originalText, this, [value, ...options]);
  };
  try {
    const pdf = await generatePdf(published.snapshot);
    assert.equal(pdf.toString("ascii", 0, 4), "%PDF");
    const body = rendered.join("\n");
    for (const expected of [
      prepared.landlordDocument,
      prepared.landlordDocumentIssued,
      input.tenantDocument,
      input.tenantAddress,
      prepared.additionalTerms,
      prepared.obligations,
      prepared.payment,
      prepared.depositTerms,
      prepared.damage,
      prepared.handover,
    ]) {
      assert.ok(body.includes(expected), `PDF is missing: ${expected}`);
    }
    assert.equal(body.includes("undefined"), false);
    const legacyPdf = await generatePdf(legacySnapshot);
    assert.equal(legacyPdf.toString("ascii", 0, 4), "%PDF");
  } finally {
    PDFDocument.prototype.text = originalText;
  }
});
