import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { apartments } from "../src/catalog/apartments";
import { catalogListingSchema } from "../src/validation/catalog-listing";

const filename = `listing-${randomBytes(8).toString("hex")}.db`;
const testPostgres = process.env.LISTING_TEST_DATABASE_URL;
if (testPostgres) {
  const url = new URL(testPostgres);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !["/rentalsign_listing_test", "/rentalsign_contract_test"].includes(
      url.pathname,
    )
  )
    throw new Error("Listing tests require a disposable local test database");
  process.env.DIRECT_DATABASE_URL = testPostgres;
}
process.env.DATABASE_URL = testPostgres || `file:../tmp/${filename}`;
const ownerEmail = `listing-${randomBytes(8).toString("hex")}@example.test`;
process.env.CATALOG_OWNER_EMAIL = ownerEmail;
let db: PrismaClient;
let save: typeof import("../src/services/catalog-listing").saveCatalogListing;
let catalog: typeof import("../src/services/property-photos").getCatalogApartments;
let ownerId: string;
let otherId: string;
let propertyId: string;
let otherPropertyId: string;
const apartment = apartments[0];
const input = {
  revision: 0,
  title: "Тестовая квартира",
  address: "Тестовая улица, 123",
  description: "Уютная квартира",
  arrivalInstructions: "Инструкции для теста",
  mapUrl: "https://2gis.kz/test",
  priceMin: 17000,
  priceMax: 21000,
};

before(async () => {
  mkdirSync("tmp", { recursive: true });
  if (!testPostgres) writeFileSync(`tmp/${filename}`, "");
  execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
      ...(testPostgres ? ["--schema", "prisma/postgresql/schema.prisma"] : []),
    ],
    { env: process.env, stdio: "pipe" },
  );
  db = (await import("../src/lib/db")).db;
  save = (await import("../src/services/catalog-listing")).saveCatalogListing;
  catalog = (await import("../src/services/property-photos"))
    .getCatalogApartments;
  ownerId = (
    await db.admin.create({
      data: { email: ownerEmail, passwordHash: "unused" },
    })
  ).id;
  otherId = (
    await db.admin.create({
      data: { email: `other-${ownerEmail}`, passwordHash: "unused" },
    })
  ).id;
  const base = {
    name: "Объект",
    address: "Исходный адрес",
    type: "APARTMENT",
    unit: "1",
    description: "",
    rent: 0,
    deposit: 0,
    catalogSlug: apartment.slug,
  };
  propertyId = (await db.property.create({ data: { ...base, ownerId } })).id;
  otherPropertyId = (
    await db.property.create({ data: { ...base, ownerId: otherId } })
  ).id;
});
after(async () => {
  await db?.$disconnect();
});

test("listing validates prices, text and map links", () => {
  assert.equal(catalogListingSchema.safeParse(input).success, true);
  assert.equal(
    catalogListingSchema.safeParse({ ...input, priceMin: null, priceMax: 1 })
      .success,
    false,
  );
  assert.equal(
    catalogListingSchema.safeParse({
      ...input,
      priceMin: 20000,
      priceMax: 10000,
    }).success,
    false,
  );
  for (const mapUrl of [
    "http://2gis.kz/a",
    "https://2gis.kz.evil.test/a",
    "javascript:alert(1)",
    "https://user@2gis.kz/a",
  ])
    assert.equal(
      catalogListingSchema.safeParse({ ...input, mapUrl }).success,
      false,
    );
});

test("only the catalog owner publishes; stale saves and other accounts are rejected", async () => {
  await assert.rejects(save(otherId, otherPropertyId, input));
  await assert.rejects(save(otherId, propertyId, input));
  const original = JSON.stringify({ address: "Старый адрес", rent: 10000 });
  const contract = await db.contract.create({
    data: {
      number: `test-${ownerEmail}`,
      ownerId,
      propertyId,
      content: original,
    },
  });
  await db.contractVersion.create({
    data: {
      contractId: contract.id,
      version: 1,
      snapshot: original,
      contentHash: "unchanged",
    },
  });
  assert.deepEqual(await save(ownerId, propertyId, input), { revision: 1 });
  const published = (await catalog()).find(
    (entry) => entry.slug === apartment.slug,
  )!;
  assert.equal(published.title, input.title);
  assert.equal(published.address, input.address);
  assert.equal(published.description, input.description);
  assert.equal(published.priceMin, input.priceMin);
  assert.equal(published.photos.length, apartment.photos.length);
  assert.equal(
    (await db.property.findUniqueOrThrow({ where: { id: propertyId } }))
      .address,
    input.address,
  );
  assert.equal(
    (await db.contract.findUniqueOrThrow({ where: { id: contract.id } }))
      .content,
    original,
  );
  assert.equal(
    (
      await db.contractVersion.findFirstOrThrow({
        where: { contractId: contract.id },
      })
    ).snapshot,
    original,
  );
  await assert.rejects(
    save(ownerId, propertyId, { ...input, address: "Устаревшая запись" }),
    /изменилась/,
  );
  assert.deepEqual(
    await save(ownerId, propertyId, {
      ...input,
      revision: 1,
      priceMin: null,
      priceMax: null,
    }),
    { revision: 2 },
  );
  assert.equal(
    (await catalog()).find((entry) => entry.slug === apartment.slug)!.priceMin,
    null,
  );
});
