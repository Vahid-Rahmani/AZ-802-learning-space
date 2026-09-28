import { NextRequest, NextResponse } from "next/server";
import { googleOAuthConfig, sessionSecret } from "@/lib/auth-config";
import { verifySession } from "@/lib/session";

function redirectError(request: Request, reason: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("google_error", reason);
  return NextResponse.redirect(url);
}

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET(request: NextRequest) {
  const config = googleOAuthConfig(request.url);
  const secret = sessionSecret();
  if (!config || !secret) return redirectError(request, "not_configured");

  const linking = new URL(request.url).searchParams.get("intent") === "link";
  if (linking && !(await verifySession(request.cookies.get("wincraft_session")?.value, secret))) return redirectError(request, "sign_in_required");

  const state = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: "openid email profile", state, prompt: "select_account", code_challenge: challenge, code_challenge_method: "S256" });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 10 * 60, path: "/" };
  response.cookies.set("google_oauth_state", state, cookieOptions);
  response.cookies.set("google_oauth_verifier", verifier, cookieOptions);
  response.cookies.set("google_oauth_intent", linking ? "link" : "login", cookieOptions);
  return response;
}
