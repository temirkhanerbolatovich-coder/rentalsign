import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
async function main() {
  const testDatabase = `e2e-${randomBytes(8).toString("hex")}.db`;
  process.env.DATABASE_URL = `file:../tmp/${testDatabase}`;
  process.env.APP_URL = "http://localhost:3100";
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const password = process.env.E2E_PASSWORD;
  if (!password) throw new Error("E2E_PASSWORD required");
  mkdirSync("tmp", { recursive: true });
  writeFileSync(`tmp/${testDatabase}`, "", { flag: "a" });
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: process.env, stdio: "inherit" },
  );
  const { db } = await import("../src/lib/db");
  const { hashPassword } = await import("../src/auth/password");
  await db.admin.upsert({
    where: { email: "fictional@e2e.test" },
    create: {
      email: "fictional@e2e.test",
      passwordHash: await hashPassword(password),
    },
    update: { passwordHash: await hashPassword(password) },
  });
  await db.rateBucket.deleteMany();
  await db.$disconnect();
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--port",
      "3100",
      "--hostname",
      "127.0.0.1",
    ],
    { env: process.env, stdio: "inherit" },
  );
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.on(signal, () => {
      server.kill(signal);
    });
  server.on("exit", (code) => {
    process.exitCode = code || 0;
  });
}
main().catch(() => {
  console.error("E2E server setup failed");
  process.exitCode = 1;
});
