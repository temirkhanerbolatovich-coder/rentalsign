import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import sharp from "sharp";
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

test("public catalog contains seven distinct apartments and all 90 local photos", () => {
  assert.equal(apartments.length, 7);
  assert.equal(new Set(apartments.map((apartment) => apartment.slug)).size, 7);
  const photos = apartments.flatMap((apartment) => apartment.photos);
  assert.equal(photos.length, 90);
  assert.equal(new Set(photos.map((photo) => photo.src)).size, 90);
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
  assert.equal(
    incomplete.mapUrl,
    "https://2gis.kz/ustkam/geo/12807747095497019/82.611883,49.965678",
  );
  assert.equal(findApartment("__proto__"), undefined);
  assert.equal(findApartment("not-a-real-apartment"), undefined);
});

test("corrected galleries stay attached to the owner's confirmed apartment addresses", () => {
  const expected = [
    {
      slug: "mihaelisa-8-69",
      address: "ул. Михаэлиса, 8",
      unit: "69",
      entrance: 4,
      floor: 5,
      photos: 8,
      mapUrl:
        "https://2gis.kz/ustkam/geo/12807747095497019/82.611883,49.965678",
      // The owner identified this dark sofa/window photo in the first screenshot.
      coverSha256:
        "4dbc9b0c0b5c00935078885aecbf2a184eb12163d44cb8b2987e99c8ec23e641",
    },
    {
      slug: "mihaelisa-8-2-35",
      address: "ул. Михаэлиса, 8/2",
      unit: "35",
      entrance: 2,
      floor: 4,
      photos: 21,
      mapUrl:
        "https://2gis.kz/ustkam/geo/12807747095497085/82.612469,49.966384",
      coverSha256:
        "48470cfee7806b3c8946b84eab8c2e520f83a9947c4dd56e584b56bf1c4ff394",
    },
    {
      slug: "esenberlina-46-10",
      address: "ул. Есенберлина, 46",
      unit: "10",
      entrance: 1,
      floor: 4,
      photos: 7,
      mapUrl:
        "https://2gis.kz/ustkam/geo/70030076308891814/82.614717,49.916413",
      coverSha256:
        "f4161e2d1354d188b21694258acb019e5c5ee85266c6304076e1bef425611ad7",
    },
    {
      slug: "mihaelisa-7-240",
      address: "ул. Михаэлиса, 7",
      unit: "240",
      entrance: 7,
      floor: 6,
      photos: 21,
      mapUrl:
        "https://2gis.kz/ustkam/geo/12807747095505295/82.608168,49.965321",
      coverSha256:
        "a4db43f818341c55fcd3292b9a45b1bd33fc1dca2d4cba964429c473ef3c7fd1",
    },
  ];
  for (const fixture of expected) {
    const apartment = findApartment(fixture.slug);
    assert.ok(apartment);
    for (const field of [
      "address",
      "unit",
      "entrance",
      "floor",
      "mapUrl",
    ] as const) {
      assert.equal(
        apartment[field],
        fixture[field],
        `${fixture.slug}: ${field}`,
      );
    }
    assert.equal(apartment.photos.length, fixture.photos, fixture.slug);
    if (fixture.coverSha256) {
      const cover = readFileSync(
        path.join(process.cwd(), "public", apartment.photos[0].src),
      );
      assert.equal(
        createHash("sha256").update(cover).digest("hex"),
        fixture.coverSha256,
        `${fixture.slug}: wrong cover photo`,
      );
    }
  }
  for (const slug of ["esenberlina-46-10", "novy-bereg-70"]) {
    assert.match(findApartment(slug)!.arrivalInstructions!, /ключ от домофона/i);
  }
  assert.match(
    findApartment("esenberlina-46-10")!.arrivalInstructions!,
    /10.*видеодомофон|видеодомофон.*10/i,
  );
});

test("Wi-Fi information is attached only to the six supplied apartments", () => {
  const expectedNetworks: Record<string, string> = {
    "bazovaya-2-6-17": "Tele2_5G_9921_5G",
    "bazovaya-2-6-26": "Dom-26",
    "novy-bereg-70": "KZTK-21383_5G",
    "mihaelisa-7-240": "Huawei-2,4/5heXh",
    "mihaelisa-8-69": "HUAWEI-017",
    "mihaelisa-8-2-35": "KZTK-37106_5G",
  };
  for (const apartment of apartments) {
    assert.equal(apartment.wifi?.network, expectedNetworks[apartment.slug]);
    if (apartment.wifi) assert.ok(apartment.wifi.password);
  }
});

test(
  "address prices and map links agree with supplied originals when available",
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
      const notes = files.filter((filename) => /\.txt$/i.test(filename));
      if (notes.length === 0) {
        // The owner's later message supplies the missing map for Михаэлиса, 8.
        assert.equal(apartment.unit, "69");
        assert.equal(
          apartment.mapUrl,
          "https://2gis.kz/ustkam/geo/12807747095497019/82.611883,49.965678",
        );
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

test(
  "every corrected gallery contains the owner's confirmed source photos",
  { skip: !existsSync(path.join(process.cwd(), "квартиры")) },
  async () => {
    // The old folder labels were wrong; the owner identified these sets by
    // their visible cover photos, independently of the original folder names.
    const sourceFolders = {
      "esenberlina-46-10": "Михаэлиса 7, 7 подъезд, 6 этаж, 240 квартира",
      "mihaelisa-8-69": "Михаэлиса 82, 2 подъезд, 4 этаж, 35 квартира",
      "mihaelisa-8-2-35": "Михаэлиса 8, 4 подъезд, 5 этаж, 69 квартира",
      "mihaelisa-7-240":
        "Михаэлиса 7, 7 подъезд, 6 этаж, 240 квартира/Обновление 2026-10-18",
    };
    const sha256 = (bytes: Buffer) =>
      createHash("sha256").update(bytes).digest("hex");
    for (const [slug, sourceFolder] of Object.entries(sourceFolders)) {
      const sourcePath = path.join(process.cwd(), "квартиры", sourceFolder);
      const originals = readdirSync(sourcePath).filter((name) =>
        /\.(jpe?g|png|webp)$/i.test(name),
      );
      const expectedHashes = [];
      for (const filename of originals) {
        const converted = await sharp(path.join(sourcePath, filename))
          .rotate()
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        expectedHashes.push(sha256(converted));
      }
      const publishedHashes = findApartment(slug)!.photos.map((photo) =>
        sha256(readFileSync(path.join(process.cwd(), "public", photo.src))),
      );
      assert.deepEqual(
        publishedHashes.sort(),
        expectedHashes.sort(),
        `${slug}: gallery has missing or unrelated photos`,
      );
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
