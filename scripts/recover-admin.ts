import "dotenv/config";
import { z } from "zod";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/auth/password";

const credentials = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(12).max(128),
  })
  .strict();

async function readCredentials() {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > 4096) throw new Error("Input too large");
    chunks.push(bytes);
  }
  return credentials.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}

async function main() {
  if (
    process.argv.length !== 4 ||
    process.argv[2] !== "--apply" ||
    process.argv[3] !== "--maintenance-confirmed" ||
    process.stdin.isTTY
  )
    throw new Error(
      "Explicit maintenance confirmation and non-terminal input required",
    );
  const input = await readCredentials();
  const passwordHash = await hashPassword(input.password);
  await db.$transaction(async (tx) => {
    const admin = await tx.admin.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (!admin) throw new Error("Account not found");
    await tx.admin.update({ where: { id: admin.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { adminId: admin.id } });
  });
  console.log("Пароль обновлён; существующие сессии этого аккаунта завершены.");
}

main()
  .catch(() => {
    // Neither input, identifiers, errors from the database nor credentials belong in logs.
    console.error(
      "Восстановление не выполнено. Проверьте инструкцию и настройки доступа к базе.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
