import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionSecret } from "@/lib/auth-config";
import { verifySession } from "@/lib/session";

export const sessionConfigurationError = () => NextResponse.json(
  { code: "AUTH_NOT_CONFIGURED", error: "Authentication is not configured on this deployment." },
  { status: 503 },
);

export async function currentUser() {
  const secret = sessionSecret();
  if (!secret) return { userId: null, error: sessionConfigurationError() };
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, secret);
  return { userId, error: null };
}

export const signInRequired = () => NextResponse.json(
  { code: "SIGN_IN_REQUIRED", error: "Sign in required." },
  { status: 401 },
);
