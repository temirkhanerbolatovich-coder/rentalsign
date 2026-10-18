import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { prepareOwnerWorkspace } from "../src/services/admin-workspace";
import { getDefaultContractTemplate } from "../src/domain/contract-template";
import { contractTemplateSchema } from "../src/validation/contract-template";

async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    !process.env.DATABASE_URL?.startsWith("file:")
  )
    throw new Error(
      "Подготовка этой командой разрешена только для локальной SQLite-базы",
    );
  if (!process.env.ADMIN_EMAIL)
    throw new Error("Задайте ADMIN_EMAIL локального владельца");
  const owner = await db.admin.findUniqueOrThrow({
    where: { email: process.env.ADMIN_EMAIL },
  });
  const defaultsIndex = process.argv.indexOf("--defaults-file");
  const defaultsFile =
    defaultsIndex < 0 ? undefined : process.argv[defaultsIndex + 1];
  if (defaultsIndex >= 0 && (!defaultsFile || defaultsFile.startsWith("--")))
    throw new Error("Укажите путь после --defaults-file");
  // Never put the owner's requisites in source code or print their values.
  const defaults = defaultsFile
    ? contractTemplateSchema.parse({
        ...getDefaultContractTemplate(),
        ...JSON.parse(readFileSync(defaultsFile, "utf8")),
      })
    : undefined;
  if (!process.argv.includes("--apply")) {
    const properties = await db.property.count({
      where: { ownerId: owner.id },
    });
    console.log(
      JSON.stringify({
        mode: "preview",
        properties,
        catalogTotal: 7,
        updatePrivateTemplate: Boolean(defaults),
      }),
    );
    return;
  }
  const result = await prepareOwnerWorkspace(owner.id);
  if (defaults)
    await db.admin.update({
      where: { id: owner.id },
      data: { contractDefaults: JSON.stringify(defaults) },
    });
  console.log(
    JSON.stringify({ ...result, templatePrepared: Boolean(defaults) }),
  );
}
main()
  .catch(() => {
    console.error(
      "Подготовка не выполнена: проверьте локальную конфигурацию и файл шаблона; персональные реквизиты не выводятся",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
