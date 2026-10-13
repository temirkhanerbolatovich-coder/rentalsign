import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken, randomToken, validToken } from "@/lib/crypto";
import { sessionHours } from "@/lib/config";
import { AppError } from "@/lib/errors";
export const sessionCookie = "rentalsign_session";
export async function createSession(adminId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + sessionHours() * 3600000);
  await db.session.create({
    data: { adminId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}
export async function sessionAdmin(token?: string) {
  if (!token || !validToken(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });
  return session && session.expiresAt > new Date() ? session.admin : null;
}
export async function getAdmin() {
  return sessionAdmin((await cookies()).get(sessionCookie)?.value);
}
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new AppError(401, "Требуется вход в аккаунт");
  return admin;
}
export async function requirePageAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  return admin;
}
