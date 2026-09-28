import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signSession, verifyPassword } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  let user: typeof users.$inferSelect | undefined;
  try {
    user = (await getDb().select().from(users).where(eq(users.email, email)).limit(1))[0];
  } catch (error) {
    console.error("login failed", error);
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "Account database is not configured on this deployment." }, { status: 503 });
  }
  if (!user || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  const response = NextResponse.json({ user: { id: user.id, email: user.email, preferredLanguage: user.preferredLanguage } });
  response.cookies.set("wincraft_session", await signSession(user.id, process.env.SESSION_SECRET ?? "local-development-session-secret"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
