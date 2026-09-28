import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || password.length < 10) return NextResponse.json({ error: "Use a valid email and a password of at least 10 characters." }, { status: 400 });
  const now = new Date();
  const id = crypto.randomUUID();
  try {
    const db = getDb();
    await db.insert(users).values({ id, email, passwordHash: await hashPassword(password), preferredLanguage: "fa", createdAt: now, updatedAt: now });
  } catch (error) {
    console.error("registration failed", error);
    const message = String(error).toLowerCase();
    if (message.includes("unique") || message.includes("constraint")) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    if (message.includes("d1 binding") || message.includes("database") || message.includes("cloudflare:workers")) return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "Account database is not configured on this deployment." }, { status: 503 });
    return NextResponse.json({ error: "Unable to create the account right now." }, { status: 503 });
  }
  const response = NextResponse.json({ user: { id, email } }, { status: 201 });
  response.cookies.set("wincraft_session", await signSession(id, process.env.SESSION_SECRET ?? "local-development-session-secret"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
