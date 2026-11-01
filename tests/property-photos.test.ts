import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";
import { apartments } from "../src/catalog/apartments";

const filename = `photos-${randomBytes(8).toString("hex")}.db`;
const testPostgres = process.env.PHOTOS_TEST_DATABASE_URL;
if (testPostgres) {
  const url = new URL(testPostgres);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.pathname !== "/rentalsign_photo_test"
  )
    throw new Error(
      "PostgreSQL photo tests require the disposable local rentalsign_photo_test database",
    );
  process.env.DIRECT_DATABASE_URL = testPostgres;
}
process.env.DATABASE_URL = testPostgres || `file:../tmp/${filename}`;
process.env.CATALOG_OWNER_EMAIL = "photos-owner@example.test";
let db: PrismaClient;
let photos: typeof import("../src/services/property-photos");
let ownerId: string;
let otherId: string;
let propertyId: string;
let otherPropertyId: string;
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
  photos = await import("../src/services/property-photos");
  ownerId = (
    await db.admin.create({
      data: { email: "photos-owner@example.test", passwordHash: "unused" },
    })
  ).id;
  otherId = (
    await db.admin.create({
      data: { email: "photos-other@example.test", passwordHash: "unused" },
    })
  ).id;
  const base = {
    name: "test",
    address: "test",
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

test("photos validate image bytes, strip metadata, resize and reject oversized input", async () => {
  const input = await sharp({
    create: { width: 2100, height: 1200, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const image = await photos.readImage(
    new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: input,
    }),
  );
  const info = await sharp(image.data).metadata();
  assert.equal(info.format, "webp");
  assert.equal(info.width, 1600);
  assert.equal(info.exif, undefined);
  await assert.rejects(
    photos.readImage(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: "invalid",
      }),
    ),
    { status: 400 },
  );
  await assert.rejects(
    photos.readImage(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "image/svg+xml" },
        body: "<svg/>",
      }),
    ),
    { status: 415 },
  );
  await assert.rejects(
    photos.readImage(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: Buffer.alloc(photos.MAX_UPLOAD_BYTES + 1),
      }),
    ),
    { status: 413 },
  );
});

test("gallery changes are owner-scoped, versioned, public only for designated owner and persist", async () => {
  const base = await photos.getPropertyGallery({
    id: propertyId,
    ownerId,
    catalogSlug: apartment.slug,
  });
  assert.equal(base.photos.length, apartment.photos.length);
  const image = await photos.readImage(
    new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: await sharp({
        create: { width: 10, height: 10, channels: 3, background: "blue" },
      })
        .png()
        .toBuffer(),
    }),
  );
  await assert.rejects(
    photos.changePropertyGallery(otherId, propertyId, 0, {
      action: "add",
      image,
    }),
    { status: 404 },
  );
  let gallery = await photos.changePropertyGallery(ownerId, propertyId, 0, {
    action: "add",
    image,
  });
  assert.equal(gallery.photos.length, base.photos.length + 1);
  await assert.rejects(
    photos.changePropertyGallery(ownerId, propertyId, 0, {
      action: "add",
      image,
    }),
    { status: 409 },
  );
  const newPhoto = gallery.photos.at(-1)!;
  assert.equal(newPhoto.alt, "Фотография объекта");
  gallery = await photos.changePropertyGallery(
    ownerId,
    propertyId,
    gallery.revision,
    { action: "cover", key: newPhoto.key },
  );
  assert.equal(gallery.photos[0].key, newPhoto.key);
  assert.equal(
    (await photos.getCatalogApartments()).find(
      (item) => item.slug === apartment.slug,
    )!.photos[0].src,
    newPhoto.src,
  );
  await photos.changePropertyGallery(otherId, otherPropertyId, 0, {
    action: "delete",
    key: base.photos[0].key,
  });
  assert.equal(
    (await photos.getCatalogApartments()).find(
      (item) => item.slug === apartment.slug,
    )!.photos[0].src,
    newPhoto.src,
  );
  gallery = await photos.changePropertyGallery(
    ownerId,
    propertyId,
    gallery.revision,
    { action: "delete", key: newPhoto.key },
  );
  assert.equal(
    await db.propertyPhoto.findUnique({ where: { id: newPhoto.key } }),
    null,
  );
  assert.equal(
    (
      await photos.getPropertyGallery({
        id: propertyId,
        ownerId,
        catalogSlug: apartment.slug,
      })
    ).photos.length,
    base.photos.length,
  );
});

test("an intentionally empty public gallery stays empty instead of restoring originals", async () => {
  let gallery = await photos.getPropertyGallery({
    id: propertyId,
    ownerId,
    catalogSlug: apartment.slug,
  });
  while (gallery.photos.length) {
    gallery = await photos.changePropertyGallery(
      ownerId,
      propertyId,
      gallery.revision,
      { action: "delete", key: gallery.photos[0].key },
    );
  }
  assert.deepEqual(
    (await photos.getCatalogApartments()).find(
      (item) => item.slug === apartment.slug,
    )!.photos,
    [],
  );
  assert.deepEqual(
    (
      await photos.getPropertyGallery({
        id: propertyId,
        ownerId,
        catalogSlug: apartment.slug,
      })
    ).photos,
    [],
  );
});
