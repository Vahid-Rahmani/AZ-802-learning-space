import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashOpaqueToken, hashPassword, signSession } from "@/lib/session";
import { deliverResetEmail } from "@/lib/reset-delivery";

// The request path deliberately stays generic. In production, the returned
// reset token must be delivered by the deployment's mail provider; local
// development returns it as debugToken so the complete flow can be verified.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const db = getDb();
  if (typeof body.token === "string") {
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < 10) return NextResponse.json({ error: "Use a password of at least 10 characters." }, { status: 400 });
    const tokenHash = await hashOpaqueToken(body.token);
    const token = (await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt))).limit(1))[0];
    if (!token || token.expiresAt.getTime() <= Date.now()) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
    const now = new Date();
    await db.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: now }).where(eq(users.id, token.userId));
    await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, token.id));
    const response = NextResponse.json({ ok: true, user: { id: token.userId } });
    response.cookies.set("wincraft_session", await signSession(token.userId, process.env.SESSION_SECRET ?? "local-development-session-secret"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  const user = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
  let debugToken: string | undefined;
  if (user) {
    const rawToken = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const now = new Date();
    await db.insert(passwordResetTokens).values({ id: crypto.randomUUID(), userId: user.id, tokenHash: await hashOpaqueToken(rawToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000), createdAt: now });
    const delivered = await deliverResetEmail(email, rawToken);
    if (process.env.NODE_ENV !== "production") debugToken = rawToken;
    if (process.env.NODE_ENV === "production" && !delivered) console.error("Password reset delivery is not configured");
  }
  return NextResponse.json({ ok: true, message: "If the account exists, recovery instructions will be sent.", ...(debugToken ? { debugToken } : {}) }, { status: 202 });
}
