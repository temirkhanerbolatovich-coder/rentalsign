import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { appOrigin } from "@/lib/config";
import { AppError } from "@/lib/errors";
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin())
    throw new AppError(403, "Недопустимый источник запроса");
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError(415, "Требуется JSON");
  if (!request.body) throw new AppError(400, "Пустой запрос");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 96 * 1024) {
      await reader.cancel();
      throw new AppError(413, "Запрос слишком большой");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AppError(400, "Некорректный JSON");
  }
}
export async function api<T>(operation: () => Promise<T | Response>) {
  try {
    const result = await operation();
    return result instanceof Response
      ? result
      : NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Проверьте данные" },
        { status: 400 },
      );
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: error.status === 429 ? { "Retry-After": "60" } : {},
        },
      );
    // Never log request bodies, tokens, exception messages or Prisma query arguments.
    console.error("RentalSign operation failed", {
      type: error instanceof Error ? error.name : "Unknown",
    });
    return NextResponse.json(
      { error: "Не удалось выполнить операцию. Попробуйте ещё раз" },
      { status: 500 },
    );
  }
}
