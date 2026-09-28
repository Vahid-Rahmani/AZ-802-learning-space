import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const user = (await getDb().select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user || user.passwordHash !== await hashPassword(password)) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  const response = NextResponse.json({ user: { id: user.id, email: user.email, preferredLanguage: user.preferredLanguage } });
  response.cookies.set("wincraft_session", await signSession(user.id, process.env.SESSION_SECRET ?? "local-development-session-secret"), { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
