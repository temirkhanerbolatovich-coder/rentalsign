import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { AppError } from "@/lib/errors";
export async function rateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
  now = new Date(),
) {
  const window = Math.floor(now.getTime() / (windowSeconds * 1000));
  const key = `${scope}:${hashToken(identity)}:${window}`;
  const bucket = await db.rateBucket.upsert({
    where: { key },
    create: { key, expiresAt: new Date((window + 1) * windowSeconds * 1000) },
    update: { count: { increment: 1 } },
  });
  if (bucket.count > limit)
    throw new AppError(429, "Слишком много запросов. Попробуйте позже");
  // Opportunistic cleanup keeps the local limiter bounded without a background worker.
  if (bucket.count === 1)
    await db.rateBucket.deleteMany({ where: { expiresAt: { lt: now } } });
}
export async function publicRateLimit(token: string) {
  await rateLimit("public-global", "all", 600, 60);
  await rateLimit("public-token", token, 60, 60);
}
