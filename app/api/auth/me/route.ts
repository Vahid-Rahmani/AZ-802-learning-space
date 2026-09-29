import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { sessionSecret } from "@/lib/auth-config";
import { sessionConfigurationError } from "@/lib/auth-server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
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
    const profileRows = await db.all(sql`SELECT first_name AS firstName, last_name AS lastName FROM user_profiles WHERE user_id = ${userId} LIMIT 1`) as Array<{ firstName?: unknown; lastName?: unknown }>;
    const profile = profileRows[0];
    return NextResponse.json({ user: { ...user, firstName: typeof profile?.firstName === "string" ? profile.firstName : "", lastName: typeof profile?.lastName === "string" ? profile.lastName : "" } }, { headers: { "cache-control": "no-store" } });
  } catch {
    console.error("Session database operation failed");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The account database is unavailable or not initialized." }, { status: 503 });
  }
}
