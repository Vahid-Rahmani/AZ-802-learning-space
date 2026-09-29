import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { sessionSecret } from "@/lib/auth-config";
import { sessionConfigurationError } from "@/lib/auth-server";
import { getDb } from "@/db";
import { userProfiles, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const secret = sessionSecret();
  if (!secret) return sessionConfigurationError();
  const userId = await verifySession(request.cookies.get("wincraft_session")?.value, secret);
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });
  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY NOT NULL, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
    const user = (await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    const profile = (await db.select({ firstName: userProfiles.firstName, lastName: userProfiles.lastName }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
    return NextResponse.json({ user: { ...user, firstName: profile?.firstName ?? "", lastName: profile?.lastName ?? "" } }, { headers: { "cache-control": "no-store" } });
  } catch {
    console.error("Session database operation failed");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The account database is unavailable or not initialized." }, { status: 503 });
  }
}
