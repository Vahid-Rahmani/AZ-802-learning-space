import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { sessionSecret } from "@/lib/auth-config";
import { sessionConfigurationError } from "@/lib/auth-server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const secret = sessionSecret();
  if (!secret) return sessionConfigurationError();
  const userId = await verifySession(request.cookies.get("wincraft_session")?.value, secret);
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });
  try {
    const user = (await getDb().select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user }, { headers: { "cache-control": "no-store" } });
  } catch {
    console.error("Session database operation failed");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The account database is unavailable or not initialized." }, { status: 503 });
  }
}
