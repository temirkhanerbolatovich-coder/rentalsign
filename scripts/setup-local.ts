import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { config } from "dotenv";
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("setup:local is disabled in production");
  if (existsSync(".env"))
    throw new Error(
      ".env уже существует. Используйте db:migrate и admin:create; существующая конфигурация сохранена",
    );
  const password = randomBytes(18).toString("base64url");
  writeFileSync(
    ".env",
    `DATABASE_URL="file:./dev.db"\nAPP_URL="http://localhost:3000"\nLINK_TTL_HOURS="72"\nSESSION_HOURS="12"\nTOKEN_ENCRYPTION_KEY="${randomBytes(32).toString("hex")}"\nADMIN_EMAIL="admin@rentalsign.test"\nADMIN_PASSWORD="${password}"\n`,
    { flag: "wx" },
  );
  config({ quiet: true, override: true });
  const prismaCli = path.join(
    process.cwd(),
    "node_modules/prisma/build/index.js",
  );
  execFileSync(process.execPath, [prismaCli, "generate"], { stdio: "inherit" });
  // Precreate the SQLite file: some Windows schema-engine builds fail on absent files.
  writeFileSync("prisma/dev.db", "", { flag: "a" });
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    stdio: "inherit",
  });
  const { createAdmin } = await import("./create-admin");
  const { db } = await import("../src/lib/db");
  await createAdmin(process.env.ADMIN_EMAIL!, password);
  writeFileSync(
    "local-admin.txt",
    `ТОЛЬКО ЛОКАЛЬНАЯ ДЕМОНСТРАЦИЯ\nEmail: admin@rentalsign.test\nПароль: ${password}\nНе публикуйте этот файл или .env.\n`,
    { flag: "wx" },
  );
  await db.$disconnect();
  console.log(
    "Локальная конфигурация создана. Данные входа: local-admin.txt (игнорируется Git). Далее: npm run seed и npm run dev",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
