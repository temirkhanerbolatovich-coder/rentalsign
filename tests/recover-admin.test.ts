import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";

const filename = `recovery-${randomBytes(8).toString("hex")}.db`;
const testPostgres = process.env.RECOVERY_TEST_DATABASE_URL;
if (testPostgres) {
  const url = new URL(testPostgres);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !["/rentalsign_recovery_test", "/rentalsign_contract_test"].includes(
      url.pathname,
    )
  )
    throw new Error("Recovery tests require a disposable local test database");
  process.env.DIRECT_DATABASE_URL = testPostgres;
}
process.env.DATABASE_URL = testPostgres || `file:../tmp/${filename}`;
const suffix = randomBytes(8).toString("hex");
let db: PrismaClient;
let passwords: typeof import("../src/auth/password");

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
  passwords = await import("../src/auth/password");
});
after(async () => {
  await db?.$disconnect();
});

function runRecovery(input: string, apply = true) {
  return spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/recover-admin.ts",
      ...(apply ? ["--apply", "--maintenance-confirmed"] : []),
    ],
    {
      input,
      encoding: "utf8",
      env: process.env,
    },
  );
}

test("offline recovery changes only the selected password and invalidates its sessions", async () => {
  const oldPassword = "fictional-old-password";
  const newPassword = "fictional-new-password";
  const email = `recovery-owner-${suffix}@example.test`;
  const otherEmail = `recovery-other-${suffix}@example.test`;
  const oldHash = await passwords.hashPassword(oldPassword);
  const owner = await db.admin.create({
    data: { email, passwordHash: oldHash },
  });
  const other = await db.admin.create({
    data: { email: otherEmail, passwordHash: oldHash },
  });
  const expiresAt = new Date(Date.now() + 3600000);
  await db.session.createMany({
    data: [
      {
        adminId: owner.id,
        tokenHash: `fictional-owner-session-${suffix}`,
        expiresAt,
      },
      {
        adminId: other.id,
        tokenHash: `fictional-other-session-${suffix}`,
        expiresAt,
      },
    ],
  });
  const input = JSON.stringify({
    email: email.toUpperCase(),
    password: newPassword,
  });
  for (const attempt of [
    runRecovery(input, false),
    runRecovery(JSON.stringify({ email, password: "short" })),
    runRecovery(
      JSON.stringify({ email: "unknown@example.test", password: newPassword }),
    ),
    runRecovery(JSON.stringify({ email, password: newPassword, extra: true })),
  ]) {
    assert.notEqual(attempt.status, 0);
    assert.equal(
      (attempt.stdout + attempt.stderr).includes(newPassword),
      false,
    );
    assert.equal(
      (await db.admin.findUniqueOrThrow({ where: { id: owner.id } }))
        .passwordHash,
      oldHash,
    );
    assert.equal(await db.session.count({ where: { adminId: owner.id } }), 1);
  }
  const result = runRecovery(input);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout + result.stderr).includes(newPassword), false);
  const updated = await db.admin.findUniqueOrThrow({ where: { id: owner.id } });
  assert.equal(
    await passwords.verifyPassword(newPassword, updated.passwordHash),
    true,
  );
  assert.equal(
    await passwords.verifyPassword(oldPassword, updated.passwordHash),
    false,
  );
  assert.equal(await db.session.count({ where: { adminId: owner.id } }), 0);
  assert.equal(await db.session.count({ where: { adminId: other.id } }), 1);
  assert.equal(
    (await db.admin.findUniqueOrThrow({ where: { id: other.id } }))
      .passwordHash,
    oldHash,
  );
});

test(
  "password update rolls back if session invalidation fails",
  { skip: Boolean(testPostgres) },
  async () => {
    const oldHash = await passwords.hashPassword("fictional-old-password");
    const owner = await db.admin.create({
      data: { email: `rollback-${suffix}@example.test`, passwordHash: oldHash },
    });
    await db.session.create({
      data: {
        adminId: owner.id,
        tokenHash: `rollback-${suffix}`,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    await db.$executeRawUnsafe(
      "CREATE TRIGGER recovery_test_fail BEFORE DELETE ON Session BEGIN SELECT RAISE(ABORT, 'test failure'); END",
    );
    try {
      const result = runRecovery(
        JSON.stringify({
          email: owner.email,
          password: "fictional-new-password",
        }),
      );
      assert.notEqual(result.status, 0);
      assert.equal(
        (await db.admin.findUniqueOrThrow({ where: { id: owner.id } }))
          .passwordHash,
        oldHash,
      );
      assert.equal(await db.session.count({ where: { adminId: owner.id } }), 1);
    } finally {
      await db.$executeRawUnsafe("DROP TRIGGER recovery_test_fail");
    }
  },
);
