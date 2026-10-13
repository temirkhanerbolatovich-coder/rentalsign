import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createAdmin } from "./create-admin";
import { db } from "../src/lib/db";
import { appOrigin, linkTtlHours, sessionHours } from "../src/lib/config";
import { encryptToken } from "../src/lib/crypto";

export async function initializeProduction() {
  const configuredUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (!configuredUrl)
    throw new Error("APP_URL or RENDER_EXTERNAL_URL required");
  const origin = new URL(appOrigin());
  if (
    origin.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "0.0.0.0"].includes(origin.hostname)
  ) {
    throw new Error("APP_URL must be a public HTTPS origin");
  }
  if (
    new URL(configuredUrl).pathname !== "/" ||
    new URL(configuredUrl).search ||
    new URL(configuredUrl).hash ||
    new URL(configuredUrl).username ||
    new URL(configuredUrl).password
  ) {
    throw new Error("APP_URL must contain only the HTTPS origin");
  }
  linkTtlHours();
  sessionHours();
  encryptToken("startup-validation");
  const databaseUrl = process.env.DATABASE_URL;
  const provider = process.env.DATABASE_PROVIDER || "sqlite";
  const migrationArguments = [
    path.resolve("node_modules/prisma/build/index.js"),
    "migrate",
    "deploy",
  ];
  if (provider === "postgresql") {
    for (const connection of [databaseUrl, process.env.DIRECT_DATABASE_URL]) {
      if (!connection) throw new Error("PostgreSQL connection URLs required");
      const url = new URL(connection);
      if (
        !["postgres:", "postgresql:"].includes(url.protocol) ||
        !["require", "verify-full"].includes(
          url.searchParams.get("sslmode") || "",
        )
      ) {
        throw new Error("PostgreSQL requires a TLS connection URL");
      }
    }
    migrationArguments.push("--schema", "prisma/postgresql/schema.prisma");
  } else if (provider === "sqlite") {
    if (
      !databaseUrl?.startsWith("file:") ||
      !path.isAbsolute(databaseUrl.slice(5))
    ) {
      throw new Error(
        "DATABASE_URL must point to an absolute persistent SQLite path",
      );
    }
    const databasePath = databaseUrl.slice(5);
    mkdirSync(path.dirname(databasePath), { recursive: true });
    writeFileSync(databasePath, "", { flag: "a" });
  } else {
    throw new Error("Unsupported DATABASE_PROVIDER");
  }
  execFileSync(process.execPath, migrationArguments, {
    env: process.env,
    stdio: "pipe",
  });
  if ((await db.admin.count()) === 0) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error("Initial administrator credentials required");
    }
    await createAdmin(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    console.log(
      "RentalSign: initial administrator created; credentials are not logged",
    );
  }
  console.log("RentalSign: persistent database and migrations ready");
}

if (process.argv[1]?.endsWith("production-init.ts")) {
  initializeProduction()
    .catch(() => {
      // Avoid subprocess output or connection paths in public deployment logs.
      console.error(
        "RentalSign startup failed: check HTTPS origin, database connection, secrets and migrations",
      );
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
