import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, checkOrigin, jsonBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/validation/schemas";
import { verifyPassword } from "@/auth/password";
import { createSession, sessionCookie } from "@/auth/session";
import { AppError } from "@/lib/errors";
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    await rateLimit("login-global", "all", 100, 600);
    const input = loginSchema.parse(await jsonBody(request));
    await rateLimit("login-account", input.email, 5, 600);
    const admin = await db.admin.findUnique({ where: { email: input.email } });
    const valid = await verifyPassword(
      input.password,
      admin?.passwordHash || `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`,
    );
    if (!admin || !valid) throw new AppError(401, "Неверный email или пароль");
    const { token, expiresAt } = await createSession(admin.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });
    return response;
  });
}
