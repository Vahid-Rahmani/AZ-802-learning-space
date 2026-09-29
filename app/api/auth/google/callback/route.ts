import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { googleAccounts, users } from "@/db/schema";
import { googleOAuthConfig, sessionSecret } from "@/lib/auth-config";
import { hashPassword, signSession, verifySession } from "@/lib/session";

function finish(request: Request, reason?: string, session?: string, clearOAuth = true) {
  const url = new URL("/", request.url);
  if (reason) url.searchParams.set("google_error", reason);
  const response = NextResponse.redirect(url);
  if (clearOAuth) {
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_verifier");
    response.cookies.delete("google_oauth_intent");
  }
  if (session) {
    const cookieParts = [`wincraft_session=${session}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${60 * 60 * 24 * 30}`];
    if (process.env.NODE_ENV === "production") cookieParts.push("Secure");
    response.headers.append("Set-Cookie", cookieParts.join("; "));
  }
  return response;
}

export async function GET(request: NextRequest) {
  const config = googleOAuthConfig(request.url);
  const secret = sessionSecret();
  if (!config || !secret) return finish(request, "not_configured");
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const verifier = request.cookies.get("google_oauth_verifier")?.value;
  if (!state || !verifier || state !== request.cookies.get("google_oauth_state")?.value) return finish(request, "invalid_state");
  if (url.searchParams.get("error")) return finish(request, "access_denied");
  const code = url.searchParams.get("code");
  if (!code) return finish(request, "missing_code");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
      cache: "no-store",
    });
    const token = await tokenResponse.json().catch(() => ({})) as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) return finish(request, "token_exchange");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
    const profile = await profileResponse.json().catch(() => ({})) as { sub?: string; email?: string; email_verified?: boolean };
    if (!profileResponse.ok || !profile.sub || profile.sub.length > 255 || !profile.email || profile.email_verified !== true) return finish(request, "unverified_email");

    const email = profile.email.trim().toLowerCase();
    const db = getDb();
    const existingLink = (await db.select().from(googleAccounts).where(eq(googleAccounts.googleSub, profile.sub)).limit(1))[0];
    const linking = request.cookies.get("google_oauth_intent")?.value === "link";
    let userId: string;

    if (linking) {
      const signedInId = await verifySession(request.cookies.get("wincraft_session")?.value, secret);
      if (!signedInId) return finish(request, "sign_in_required");
      const current = (await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, signedInId)).limit(1))[0];
      if (!current || current.email !== email) return finish(request, "email_mismatch");
      if (existingLink && existingLink.userId !== signedInId) return finish(request, "account_exists");
      const otherLink = (await db.select().from(googleAccounts).where(eq(googleAccounts.userId, signedInId)).limit(1))[0];
      if (otherLink && otherLink.googleSub !== profile.sub) return finish(request, "already_linked");
      if (!existingLink && !otherLink) await db.insert(googleAccounts).values({ googleSub: profile.sub, userId: signedInId, email, createdAt: new Date() });
      userId = signedInId;
    } else if (existingLink) {
      // Older rows can contain a stale/missing user id after a migration. Use
      // the verified Google email as a safe recovery key and repair the link.
      const userByEmail = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
      const existingUser = existingLink.userId
        ? (await db.select({ id: users.id }).from(users).where(eq(users.id, existingLink.userId)).limit(1))[0]
        : undefined;
      const recoveredUser = userByEmail ?? existingUser;
      if (!recoveredUser) return finish(request, "linked_user_missing");
      if (recoveredUser.id !== existingLink.userId) {
        await db.update(googleAccounts).set({ userId: recoveredUser.id, email }).where(eq(googleAccounts.googleSub, profile.sub));
      }
      userId = recoveredUser.id;
    } else {
      const existingEmail = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
      if (existingEmail) {
        // Google has already verified ownership of this email. Link it to the
        // existing account so “Continue with Google” also works for users who
        // originally registered with a password.
        const otherLink = (await db.select({ googleSub: googleAccounts.googleSub }).from(googleAccounts).where(eq(googleAccounts.userId, existingEmail.id)).limit(1))[0];
        if (otherLink) return finish(request, "already_linked");
        await db.insert(googleAccounts).values({ googleSub: profile.sub, userId: existingEmail.id, email, createdAt: new Date() });
        userId = existingEmail.id;
      } else {
        const now = new Date();
        userId = crypto.randomUUID();
        await db.insert(users).values({ id: userId, email, passwordHash: await hashPassword(`${crypto.randomUUID()}-${crypto.randomUUID()}`), preferredLanguage: "fa", createdAt: now, updatedAt: now });
        try {
          await db.insert(googleAccounts).values({ googleSub: profile.sub, userId, email, createdAt: now });
        } catch (error) {
          await db.delete(users).where(eq(users.id, userId)).catch(() => console.error("Google account cleanup failed"));
          throw error;
        }
      }
    }

    return finish(request, undefined, await signSession(userId, secret), false);
  } catch (error) {
    console.error("Google sign-in failed", error instanceof Error ? error.message : String(error));
    return finish(request, "callback_exception");
  }
}
