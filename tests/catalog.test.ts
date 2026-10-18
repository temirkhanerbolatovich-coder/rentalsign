import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { apartments, findApartment } from "../src/catalog/apartments";
import { defaultTerms } from "../src/domain/contracts";
import type {
  ContractInput,
  ContractSnapshot,
} from "../src/validation/schemas";

const testDatabase = `catalog-${randomBytes(8).toString("hex")}.db`;
process.env.DATABASE_URL = `file:../tmp/${testDatabase}`;
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.APP_URL = "http://localhost:3000";
let db: PrismaClient;
let catalog: typeof import("../src/services/catalog");
let contracts: typeof import("../src/services/contracts");
let ownerId: string;
let otherId: string;

before(async () => {
  mkdirSync("tmp", { recursive: true });
  writeFileSync(path.join("tmp", testDatabase), "", { flag: "a" });
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  db = (await import("../src/lib/db")).db;
  catalog = await import("../src/services/catalog");
  contracts = await import("../src/services/contracts");
  ownerId = (
    await db.admin.create({
      data: { email: "fictional@catalog.test", passwordHash: "not-used" },
    })
  ).id;
  otherId = (
    await db.admin.create({
      data: { email: "other@catalog.test", passwordHash: "not-used" },
    })
  ).id;
});

after(async () => {
  await db?.$disconnect();
});

function contractInput(propertyId: string, rent: number): ContractInput {
  return {
    propertyId,
    landlordName: "ДЕМО • Арендодатель каталога",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "ДЕМО • Арендатор каталога",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: "2026-10-20T14:00:00+05:00",
    checkOut: "2026-10-22T12:00:00+05:00",
    rent,
    deposit: 0,
    additionalTerms: "Вымышленный проверочный договор",
    ...defaultTerms,
  };
}

test("public catalog contains seven distinct apartments and all 79 local photos", () => {
  assert.equal(apartments.length, 7);
  assert.equal(new Set(apartments.map((apartment) => apartment.slug)).size, 7);
  const photos = apartments.flatMap((apartment) => apartment.photos);
  assert.equal(photos.length, 79);
  assert.equal(new Set(photos.map((photo) => photo.src)).size, 79);
  for (const apartment of apartments) {
    assert.equal(findApartment(apartment.slug), apartment);
    assert.ok(apartment.photos.length > 0);
    if (apartment.priceMin !== null) {
      assert.ok(apartment.priceMin > 0);
      assert.ok(
        apartment.priceMax !== null && apartment.priceMax >= apartment.priceMin,
      );
    }
    if (apartment.mapUrl) {
      const map = new URL(apartment.mapUrl);
      assert.equal(map.protocol, "https:");
      assert.equal(map.hostname, "2gis.kz");
    }
    for (const photo of apartment.photos) {
      assert.ok(photo.src.startsWith(`/apartments/${apartment.slug}/`));
      const filename = path.join(process.cwd(), "public", photo.src);
      assert.equal(existsSync(filename), true, `missing photo: ${photo.src}`);
      const bytes = readFileSync(filename);
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      assert.ok(photo.width > 0 && photo.height > 0);
      assert.ok(photo.alt.length > 0);
    }
  }
  const incomplete = apartments.find((apartment) => apartment.unit === "69")!;
  assert.equal(incomplete.priceMin, null);
  assert.equal(incomplete.priceMax, null);
  assert.equal(incomplete.mapUrl, null);
  assert.equal(findApartment("__proto__"), undefined);
  assert.equal(findApartment("not-a-real-apartment"), undefined);
});

test(
  "published photo counts, prices and map links agree with supplied originals when available",
  {
    skip: !existsSync(path.join(process.cwd(), "квартиры")),
  },
  () => {
    const sourceRoot = path.join(process.cwd(), "квартиры");
    const folders = readdirSync(sourceRoot, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory(),
    );
    assert.equal(folders.length, apartments.length);
    for (const folder of folders) {
      const unit = folder.name.match(/(\d+)\s+квартира$/)?.[1];
      assert.ok(unit, `unit is missing from source folder: ${folder.name}`);
      const apartment = apartments.find((entry) => entry.unit === unit);
      assert.ok(
        apartment,
        `source folder is absent from catalog: ${folder.name}`,
      );
      const folderPath = path.join(sourceRoot, folder.name);
      const files = readdirSync(folderPath);
      const photos = files.filter((filename) =>
        /\.(jpe?g|png|webp)$/i.test(filename),
      );
      assert.equal(apartment.photos.length, photos.length);
      const notes = files.filter((filename) => /\.txt$/i.test(filename));
      if (notes.length === 0) {
        assert.equal(apartment.mapUrl, null);
        assert.equal(apartment.priceMin, null);
        assert.equal(apartment.priceMax, null);
        continue;
      }
      assert.equal(notes.length, 1);
      const note = readFileSync(path.join(folderPath, notes[0]), "utf8");
      const map = note.match(/https:\/\/2gis\.kz\/[^\s]+/)?.[0];
      assert.equal(apartment.mapUrl, map);
      const priceText = note
        .split(/\r?\n/)
        .filter((line) => !line.includes("http"))
        .join(" ");
      const prices = [...priceText.matchAll(/\d{1,3}[. ]\d{3}/g)].map((match) =>
        Number(match[0].replace(/[. ]/g, "")),
      );
      assert.equal(apartment.priceMin, prices[0]);
      assert.equal(apartment.priceMax, prices.at(-1));
    }
  },
);

test("unknown catalog slug creates no private property", async () => {
  const before = await db.property.count();
  await assert.rejects(
    catalog.ensureCatalogProperty(ownerId, "unknown-apartment"),
    { status: 404 },
  );
  assert.equal(await db.property.count(), before);
});

test("catalog import is idempotent, owner-scoped and preserves administrator edits", async () => {
  const apartment = apartments[0];
  const initialImports = await Promise.all([
    catalog.ensureCatalogProperty(ownerId, apartment.slug),
    catalog.ensureCatalogProperty(ownerId, apartment.slug),
  ]);
  const first = initialImports[0];
  assert.equal(initialImports[1].id, first.id);
  assert.equal(first.catalogSlug, apartment.slug);
  assert.equal(first.ownerId, ownerId);
  assert.equal(
    first.rent,
    0,
    "a listing rate must not become a contract total",
  );
  assert.equal(first.deposit, 0);
  assert.equal(first.address, apartment.address);
  assert.equal(first.unit, apartment.unit);
  const concurrent = await Promise.all([
    catalog.ensureCatalogProperty(ownerId, apartment.slug),
    catalog.ensureCatalogProperty(ownerId, apartment.slug),
  ]);
  assert.ok(concurrent.every((property) => property.id === first.id));
  assert.equal(
    await db.property.count({
      where: { ownerId, catalogSlug: apartment.slug },
    }),
    1,
  );
  await db.property.update({
    where: { id: first.id },
    data: { name: "ДЕМО • Уточнённый объект", rent: 45000, deposit: 12000 },
  });
  const repeated = await catalog.ensureCatalogProperty(ownerId, apartment.slug);
  assert.equal(repeated.id, first.id);
  assert.equal(repeated.name, "ДЕМО • Уточнённый объект");
  assert.equal(repeated.rent, 45000);
  assert.equal(repeated.deposit, 12000);
  const other = await catalog.ensureCatalogProperty(otherId, apartment.slug);
  assert.notEqual(other.id, first.id);
  assert.equal(other.ownerId, otherId);
  assert.equal(other.rent, 0);
  await assert.rejects(
    contracts.createContract(otherId, contractInput(first.id, 25000)),
    { status: 400 },
  );
});

test("archived catalog import is rejected without creating or restoring a property", async () => {
  const apartment = apartments[1];
  const property = await catalog.ensureCatalogProperty(ownerId, apartment.slug);
  await db.property.update({
    where: { id: property.id },
    data: { archived: true },
  });
  await assert.rejects(catalog.ensureCatalogProperty(ownerId, apartment.slug), {
    status: 409,
  });
  assert.equal(
    await db.property.count({
      where: { ownerId, catalogSlug: apartment.slug },
    }),
    1,
  );
  assert.equal(
    (await db.property.findUniqueOrThrow({ where: { id: property.id } }))
      .archived,
    true,
  );
});

test("catalog contract requires an agreed total and keeps its own immutable property snapshot", async () => {
  const apartment = apartments[2];
  const property = await catalog.ensureCatalogProperty(ownerId, apartment.slug);
  await assert.rejects(
    contracts.createContract(ownerId, contractInput(property.id, 0)),
    { status: 400 },
  );
  const contract = await contracts.createContract(
    ownerId,
    contractInput(property.id, 36000),
  );
  const snapshot = JSON.parse(contract.content) as ContractSnapshot;
  assert.equal(snapshot.rent, 36000);
  assert.equal(snapshot.property.address, apartment.address);
  assert.equal(snapshot.property.unit, apartment.unit);
  assert.equal("catalogSlug" in snapshot.property, false);
  assert.equal("photos" in snapshot.property, false);
  await contracts.issueLink(ownerId, contract.id, 24, contract.revision);
  await db.property.update({
    where: { id: property.id },
    data: { address: "ДЕМО • Изменённый адрес", rent: 99999 },
  });
  const sent = await db.contractVersion.findFirstOrThrow({
    where: { contractId: contract.id },
  });
  assert.equal((JSON.parse(sent.snapshot) as ContractSnapshot).rent, 36000);
  assert.equal(
    (JSON.parse(sent.snapshot) as ContractSnapshot).property.address,
    apartment.address,
  );
});
