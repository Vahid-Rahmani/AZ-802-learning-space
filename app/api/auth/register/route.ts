import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signSession } from "@/lib/session";
import { sessionSecret } from "@/lib/auth-config";
import { sessionConfigurationError } from "@/lib/auth-server";

const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
function isDuplicateEmail(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    if (/unique constraint failed:\s*users\.email/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!validEmail(email) || password.length < 8 || password.length > 1024) return NextResponse.json({ code: "INVALID_INPUT", error: "Use a valid email and a password of 8–1024 characters." }, { status: 400 });
  const secret = sessionSecret();
  if (!secret) return sessionConfigurationError();
  const now = new Date();
  const id = crypto.randomUUID();
  try {
    const db = getDb();
    await db.insert(users).values({ id, email, passwordHash: await hashPassword(password), preferredLanguage: "fa", createdAt: now, updatedAt: now });
  } catch (error) {
    if (isDuplicateEmail(error)) return NextResponse.json({ code: "EMAIL_EXISTS", error: "An account with this email already exists." }, { status: 409 });
    console.error("Registration database operation failed");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The account database is unavailable or not initialized." }, { status: 503 });
  }
  const response = NextResponse.json({ user: { id, email } }, { status: 201 });
  response.cookies.set("wincraft_session", await signSession(id, secret), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
