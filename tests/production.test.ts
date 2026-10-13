import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { postgresSchema } from "../scripts/prepare-postgres";
import { appOrigin } from "../src/lib/config";

mkdirSync("tmp", { recursive: true });
process.env.DATABASE_URL =
  "file:" +
  path
    .resolve(`tmp/production-${randomBytes(8).toString("hex")}.db`)
    .replaceAll("\\", "/");
process.env.APP_URL = "https://rentalsign.example.test";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.ADMIN_EMAIL = "fictional@production-test.test";
process.env.ADMIN_PASSWORD = randomBytes(24).toString("base64url");
let db: (typeof import("../src/lib/db"))["db"];
let initialize: (typeof import("../scripts/production-init"))["initializeProduction"];
before(async () => {
  db = (await import("../src/lib/db")).db;
  initialize = (await import("../scripts/production-init"))
    .initializeProduction;
});
after(async () => {
  await db?.$disconnect();
});
test("health is unavailable before migration and ready after safe production initialization", async () => {
  const health = (await import("../src/app/api/health/route")).GET;
  assert.equal((await health()).status, 503);
  await initialize();
  assert.equal((await health()).status, 200);
  assert.equal(await db.admin.count(), 1);
  const admin = await db.admin.findFirstOrThrow();
  assert.ok(admin.passwordHash.startsWith("scrypt:"));
  assert.equal(await db.contract.count(), 0);
  process.env.ADMIN_PASSWORD = "short";
  await initialize();
  assert.equal(await db.admin.count(), 1);
  assert.ok(
    (await db.admin.findFirstOrThrow()).passwordHash === admin.passwordHash,
  );
});
test("startup refuses HTTP, localhost, invalid keys and relative database paths", async () => {
  const origin = process.env.APP_URL;
  for (const invalid of [
    "http://example.test",
    "https://localhost",
    "https://example.test/path",
    "https://example.test/?token=private",
  ]) {
    process.env.APP_URL = invalid;
    await assert.rejects(initialize());
  }
  process.env.APP_URL = origin;
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = "invalid";
  await assert.rejects(initialize());
  process.env.TOKEN_ENCRYPTION_KEY = key;
  const database = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "file:./dev.db";
  await assert.rejects(initialize());
  process.env.DATABASE_URL = database;
});
test("cloud schema preserves the canonical models and public links use the Render HTTPS origin", () => {
  const canonical = readFileSync("prisma/schema.prisma", "utf8");
  const cloud = postgresSchema(canonical);
  assert.equal(
    cloud.slice(cloud.indexOf("model Admin")),
    canonical.slice(canonical.indexOf("model Admin")),
  );
  assert.ok(cloud.includes('provider = "postgresql"'));
  assert.ok(cloud.includes('directUrl = env("DIRECT_DATABASE_URL")'));
  const configured = process.env.APP_URL;
  delete process.env.APP_URL;
  process.env.RENDER_EXTERNAL_URL = "https://fictional-rentalsign.onrender.com";
  assert.equal(appOrigin(), process.env.RENDER_EXTERNAL_URL);
  process.env.APP_URL = "https://custom.example.test";
  assert.equal(appOrigin(), process.env.APP_URL);
  process.env.APP_URL = configured;
  delete process.env.RENDER_EXTERNAL_URL;
});
