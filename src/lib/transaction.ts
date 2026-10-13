import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { AppError } from "./errors";
/** Serializable prevents a revoked/rotated link from winning a concurrent signing request in PostgreSQL. */
export async function transaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: "Serializable",
        maxWait: 10000,
        timeout: 10000,
      });
    } catch (error) {
      const retryable =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034";
      if (!retryable) throw error;
      if (attempt === 2)
        throw new AppError(
          409,
          "Договор изменён одновременно. Обновите страницу и повторите действие",
        );
    }
  }
  throw new AppError(409, "Конфликт обновления договора");
}
