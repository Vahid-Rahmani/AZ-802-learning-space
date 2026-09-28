import { NextResponse } from "next/server";

function redirectUri(request: Request) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${new URL(request.url).origin}/api/auth/google/callback`;
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const url = new URL("/", request.url);
    url.searchParams.set("google_error", "not_configured");
    return NextResponse.redirect(url);
  }
  const state = crypto.randomUUID();
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri(request), response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.cookies.set("google_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 10 * 60, path: "/" });
  return response;
}
