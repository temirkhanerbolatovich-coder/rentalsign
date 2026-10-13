import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { api, checkOrigin } from "@/lib/http";
import { sessionCookie } from "@/auth/session";
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const cookie = (await cookies()).get(sessionCookie)?.value;
    if (cookie)
      await db.session.deleteMany({ where: { tokenHash: hashToken(cookie) } });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  });
}
