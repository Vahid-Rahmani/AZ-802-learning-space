import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signSession } from "@/lib/session";

function errorRedirect(request: Request, reason: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("google_error", reason);
  return NextResponse.redirect(url);
}

function cookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || state !== request.cookies.get("google_oauth_state")?.value) return errorRedirect(request, "invalid_state");
  if (!code) return errorRedirect(request, "missing_code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${url.origin}/api/auth/google/callback`;
  if (!clientId || !clientSecret) return errorRedirect(request, "not_configured");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    const token = await tokenResponse.json().catch(() => ({})) as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) return errorRedirect(request, "token_exchange");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json().catch(() => ({})) as { sub?: string; email?: string; email_verified?: boolean };
    if (!profileResponse.ok || !profile.email || profile.email_verified !== true) return errorRedirect(request, "unverified_email");

    const email = profile.email.trim().toLowerCase();
    const db = getDb();
    let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!user) {
      const now = new Date();
      const id = crypto.randomUUID();
      user = { id, email, passwordHash: await hashPassword(`${crypto.randomUUID()}-${crypto.randomUUID()}`), preferredLanguage: "fa", createdAt: now, updatedAt: now };
      await db.insert(users).values(user);
    }
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("wincraft_session", await signSession(user.id, process.env.SESSION_SECRET ?? "local-development-session-secret"), cookieOptions());
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (error) {
    console.error("Google sign-in failed", error);
    return errorRedirect(request, "server_error");
  }
}
