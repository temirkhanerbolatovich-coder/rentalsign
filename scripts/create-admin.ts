import "dotenv/config";
import { z } from "zod";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/auth/password";
export async function createAdmin(email: string, password: string) {
  const validEmail = z.email().max(254).parse(email).toLowerCase();
  if (await db.admin.findUnique({ where: { email: validEmail } }))
    throw new Error("Администратор уже существует. Пароль не изменён");
  return db.admin.create({
    data: { email: validEmail, passwordHash: await hashPassword(password) },
  });
}
async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
    throw new Error("Задайте ADMIN_EMAIL и ADMIN_PASSWORD (12-128 символов)");
  await createAdmin(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  console.log("Администратор создан. Пароль не выводится в журнал");
}
if (process.argv[1]?.endsWith("create-admin.ts"))
  main()
    .catch(() => {
      console.error(
        "Создание администратора не выполнено: проверьте переменные окружения и отсутствие такого аккаунта",
      );
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
