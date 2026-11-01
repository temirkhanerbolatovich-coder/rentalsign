import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { defaultTerms } from "../src/domain/contracts";
import { catalogRent } from "../src/domain/rental-pricing";
import { apartments } from "../src/catalog/apartments";

const filename = `contract-booking-${randomBytes(8).toString("hex")}.db`;
const testPostgres = process.env.CONTRACT_TEST_DATABASE_URL;
if (testPostgres) {
  const url = new URL(testPostgres);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.pathname !== "/rentalsign_contract_test"
  )
    throw new Error(
      "Contract tests require the disposable local rentalsign_contract_test database",
    );
  process.env.DIRECT_DATABASE_URL = testPostgres;
}
process.env.DATABASE_URL = testPostgres || `file:../tmp/${filename}`;
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.APP_URL = "http://localhost:3000";
process.env.CATALOG_OWNER_EMAIL = "booking-owner@example.test";
let db: PrismaClient;
let contracts: typeof import("../src/services/contracts");
let calendar: typeof import("../src/services/contract-availability");
let signer: (typeof import("../src/signing/demo-provider"))["demoSigningProvider"];
let ownerId: string;
let otherId: string;
let propertyId: string;
const apartment = apartments[0];

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
  contracts = await import("../src/services/contracts");
  calendar = await import("../src/services/contract-availability");
  signer = (await import("../src/signing/demo-provider")).demoSigningProvider;
  ownerId = (
    await db.admin.create({
      data: { email: "booking-owner@example.test", passwordHash: "unused" },
    })
  ).id;
  otherId = (
    await db.admin.create({
      data: { email: "booking-other@example.test", passwordHash: "unused" },
    })
  ).id;
  propertyId = (
    await db.property.create({
      data: {
        ownerId,
        name: "Тестовая квартира",
        address: "Тестовая улица",
        type: "APARTMENT",
        unit: "1",
        description: "",
        rent: 0,
        deposit: 0,
        catalogSlug: apartment.slug,
      },
    })
  ).id;
});
after(async () => {
  await db?.$disconnect();
});

test("daily rate uses the lower bound and rounds each partial 24-hour period up", () => {
  assert.ok(apartments.every((item) => item.pricingPeriod === "day"));
  const from = "2026-12-01T14:00:00+05:00";
  assert.deepEqual(
    catalogRent(apartment.slug, from, "2026-12-02T14:00:00+05:00"),
    { days: 1, dailyRate: 30000, maxDailyRate: 35000, total: 30000 },
  );
  assert.equal(
    catalogRent(apartment.slug, from, "2026-12-02T14:01:00+05:00")?.total,
    60000,
  );
  assert.equal(
    catalogRent(apartment.slug, from, "2026-12-01T14:01:00+05:00")?.total,
    30000,
  );
  assert.equal(catalogRent("unknown", from, "2026-12-02T14:00:00+05:00"), null);
  assert.equal(catalogRent(apartment.slug, from, from), null);
  assert.equal(catalogRent(apartment.slug, from, "invalid"), null);
  assert.equal(
    catalogRent(apartment.slug, from, "2037-01-01T00:00:00+05:00"),
    null,
  );
});

test("contract dates use Kazakhstan time and include the day of checkout", () => {
  assert.deepEqual(
    calendar.contractCalendarDates(
      "2026-12-02T00:30:00+05:00",
      "2026-12-05T12:00:00+05:00",
    ),
    { startDate: "2026-12-02", endDate: "2026-12-05" },
  );
  assert.deepEqual(
    calendar.contractCalendarDates(
      "2026-12-02T14:00:00+05:00",
      "2026-12-02T18:00:00+05:00",
    ),
    { startDate: "2026-12-02", endDate: "2026-12-02" },
  );
  assert.throws(
    () => calendar.contractCalendarDates("invalid", "also invalid"),
    { status: 503 },
  );
});

test("only active issued or signed versions reserve days; revoked and expired unsigned links disappear", async () => {
  const input = {
    propertyId,
    landlordName: "Тест",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "Тестовый гость",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: "2026-12-02T00:30:00+05:00",
    checkOut: "2026-12-05T12:00:00+05:00",
    rent: 90000,
    deposit: 0,
    additionalTerms: "",
    ...defaultTerms,
  };
  const draft = await contracts.createContract(ownerId, input);
  assert.deepEqual(
    await calendar.contractReservations({ catalogSlug: apartment.slug }),
    [],
  );
  const firstLink = await contracts.issueLink(
    ownerId,
    draft.id,
    24,
    draft.revision,
  );
  const reservation = (
    await calendar.contractReservations({ catalogSlug: apartment.slug })
  )[0];
  assert.equal(reservation.id, draft.id);
  assert.equal(reservation.status, "reserved");
  assert.equal(reservation.startDate, "2026-12-02");
  assert.equal(reservation.endDate, "2026-12-05");
  assert.deepEqual(
    await calendar.contractReservations({ ownerId: otherId }),
    [],
  );
  assert.equal((await calendar.contractReservations({ ownerId })).length, 1);
  await contracts.revokeLink(ownerId, draft.id);
  assert.deepEqual(
    await calendar.contractReservations({ catalogSlug: apartment.slug }),
    [],
  );
  let current = await db.contract.findUniqueOrThrow({
    where: { id: draft.id },
  });
  await contracts.issueLink(ownerId, draft.id, 24, current.revision);
  await db.signingLink.updateMany({
    where: { version: { contractId: draft.id }, revokedAt: null },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.deepEqual(
    await calendar.contractReservations({ catalogSlug: apartment.slug }),
    [],
  );
  current = await db.contract.findUniqueOrThrow({ where: { id: draft.id } });
  const renewed = await contracts.issueLink(
    ownerId,
    draft.id,
    24,
    current.revision,
  );
  await signer.sign(renewed.url.split("/").at(-1)!, true);
  await db.signingLink.updateMany({
    where: { version: { contractId: draft.id }, revokedAt: null },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(
    (await calendar.contractReservations({ catalogSlug: apartment.slug }))
      .length,
    1,
  );
  // Calendar dates come from the issued snapshot, even if mutable record content differs.
  await db.contract.update({
    where: { id: draft.id },
    data: {
      content: JSON.stringify({
        ...input,
        checkIn: "2099-01-01T00:00:00Z",
        checkOut: "2099-01-02T00:00:00Z",
      }),
    },
  });
  const issuedReservation = (
    await calendar.contractReservations({ catalogSlug: apartment.slug })
  )[0];
  assert.equal(issuedReservation.startDate, "2026-12-02");
  assert.equal(issuedReservation.endDate, "2026-12-05");
  assert.ok(firstLink.url);
});

test("a contract for a private property appears only in its owner's schedule", async () => {
  const property = await db.property.create({
    data: {
      ownerId,
      name: "Частный объект",
      address: "Вымышленный адрес",
      type: "APARTMENT",
      unit: "",
      description: "",
      rent: 0,
      deposit: 0,
    },
  });
  const input = {
    propertyId: property.id,
    landlordName: "Тест",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "Гость",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: "2026-12-08T14:00:00+05:00",
    checkOut: "2026-12-09T12:00:00+05:00",
    rent: 10000,
    deposit: 0,
    additionalTerms: "",
    ...defaultTerms,
  };
  const draft = await contracts.createContract(ownerId, input);
  await contracts.issueLink(ownerId, draft.id, 24, draft.revision);
  assert.ok(
    (await calendar.contractReservations({ ownerId })).some(
      (item) => item.id === draft.id && item.catalogSlug === null,
    ),
  );
  assert.ok(
    !(
      await calendar.contractReservations({ catalogSlug: apartment.slug })
    ).some((item) => item.id === draft.id),
  );
  assert.ok(
    !(await calendar.contractReservations({ ownerId: otherId })).some(
      (item) => item.id === draft.id,
    ),
  );
});

test("another owner's contract for the same catalog slug is private to their schedule", async () => {
  const property = await db.property.create({
    data: {
      ownerId: otherId,
      name: "Другой владелец",
      address: "Вымышленный адрес",
      type: "APARTMENT",
      unit: "",
      description: "",
      rent: 0,
      deposit: 0,
      catalogSlug: apartment.slug,
    },
  });
  const input = {
    propertyId: property.id,
    landlordName: "Тест",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "Гость",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: "2026-12-10T14:00:00+05:00",
    checkOut: "2026-12-11T12:00:00+05:00",
    rent: 10000,
    deposit: 0,
    additionalTerms: "",
    ...defaultTerms,
  };
  const draft = await contracts.createContract(otherId, input);
  await contracts.issueLink(otherId, draft.id, 24, draft.revision);
  assert.ok(
    (await calendar.contractReservations({ ownerId: otherId })).some(
      (item) => item.id === draft.id,
    ),
  );
  assert.ok(
    !(
      await calendar.contractReservations({ catalogSlug: apartment.slug })
    ).some((item) => item.id === draft.id),
  );
});
