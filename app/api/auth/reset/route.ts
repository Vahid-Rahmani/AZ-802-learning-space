import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashOpaqueToken, hashPassword, signSession } from "@/lib/session";
import { sessionSecret } from "@/lib/auth-config";
import { deliverResetEmail, resetDeliveryConfigured } from "@/lib/reset-delivery";

// The request path deliberately stays generic. In production, the returned
// reset token must be delivered by the deployment's mail provider; local
// development returns it as debugToken so the complete flow can be verified.
export async function POST(request: Request) {
  const secret = sessionSecret();
  if (!secret) return NextResponse.json({ code: "AUTH_NOT_CONFIGURED", error: "Authentication is not configured on this deployment." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
  const db = getDb();
  if (typeof body.token === "string") {
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < 10 || newPassword.length > 1024) return NextResponse.json({ error: "Use a password of 10–1024 characters." }, { status: 400 });
    const tokenHash = await hashOpaqueToken(body.token);
    const now = new Date();
    const passwordHash = await hashPassword(newPassword);
    const consumed = await db.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now))).returning({ userId: passwordResetTokens.userId });
    const userId = consumed[0]?.userId;
    if (!userId) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
    await db.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, userId));
    const response = NextResponse.json({ ok: true, user: { id: userId } });
    response.cookies.set("wincraft_session", await signSession(userId, secret), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (process.env.NODE_ENV === "production" && !resetDeliveryConfigured()) return NextResponse.json({ code: "RESET_DELIVERY_NOT_CONFIGURED", error: "Password recovery is not configured on this deployment." }, { status: 503 });
  const user = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
  let debugToken: string | undefined;
  if (user) {
    const rawToken = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const now = new Date();
    await db.insert(passwordResetTokens).values({ id: crypto.randomUUID(), userId: user.id, tokenHash: await hashOpaqueToken(rawToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000), createdAt: now });
    if (process.env.NODE_ENV !== "production") debugToken = rawToken;
    else if (!(await deliverResetEmail(email, rawToken))) return NextResponse.json({ code: "RESET_DELIVERY_FAILED", error: "Recovery email could not be sent. Please try again later." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, message: "If the account exists, recovery instructions will be sent.", ...(debugToken ? { debugToken } : {}) }, { status: 202 });
  } catch {
    console.error("Password recovery database operation failed");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The account database is unavailable." }, { status: 503 });
  }
}
