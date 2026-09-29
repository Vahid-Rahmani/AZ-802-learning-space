import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { googleAccounts, users } from "@/db/schema";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { hashPassword, verifyPassword } from "@/lib/session";

const maxNameLength = 80;
const validName = (value: string) => value.length <= maxNameLength && !/[\u0000-\u001F\u007F]/.test(value);

async function accountData(userId: string) {
  let stage = "get-db";
  const db = getDb();
  // Keep deployments that predate account profiles self-healing. The formal
  // migration is still checked in, while this idempotent guard prevents an
  // existing deployment from returning a database error before it is applied.
  stage = "ensure-profile-table";
  console.error("Profile query stage", stage);
  await db.run(sql`CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY NOT NULL, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  stage = "select-user";
  console.error("Profile query stage", stage);
  const user = (await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) return null;
  // Read the small profile row as a raw result. This keeps the endpoint
  // compatible with both the native D1 driver and the REST-backed D1 adapter.
  stage = "select-profile";
  console.error("Profile query stage", stage);
  const profileRows = await db.all(sql`SELECT first_name AS firstName, last_name AS lastName FROM user_profiles WHERE user_id = ${userId} LIMIT 1`) as Array<{ firstName?: unknown; lastName?: unknown }>;
  const profile = profileRows[0];
  return { user: { ...user, firstName: profile?.firstName ?? "", lastName: profile?.lastName ?? "" }, db };
}

export async function GET() {
  const { userId, error } = await currentUser();
  if (error) return error;
  if (!userId) return signInRequired();
  try {
    const account = await accountData(userId);
    if (!account) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json(account, { headers: { "cache-control": "no-store" } });
  } catch (caught) {
    console.error("Profile database operation failed", caught instanceof Error ? caught.message : String(caught));
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The account database is unavailable or not initialized." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const { userId, error } = await currentUser();
  if (error) return error;
  if (!userId) return signInRequired();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : undefined;
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : undefined;
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if ((firstName !== undefined && !validName(firstName)) || (lastName !== undefined && !validName(lastName))) {
    return NextResponse.json({ code: "INVALID_INPUT", error: "Names must be 80 characters or fewer." }, { status: 400 });
  }
  if (newPassword && (newPassword.length < 8 || newPassword.length > 1024)) {
    return NextResponse.json({ code: "INVALID_INPUT", error: "Use a password of 8–1024 characters." }, { status: 400 });
  }
  if (firstName === undefined && lastName === undefined && !newPassword) return NextResponse.json({ code: "INVALID_INPUT", error: "Enter a name or a new password before saving." }, { status: 400 });

  try {
    const account = await accountData(userId);
    if (!account) return NextResponse.json({ user: null }, { status: 401 });
    const db = account.db;
    const existingRows = await db.all(sql`SELECT first_name AS firstName, last_name AS lastName FROM user_profiles WHERE user_id = ${userId} LIMIT 1`) as Array<{ firstName?: unknown; lastName?: unknown }>;
    const existing = existingRows[0];
    const nextFirstName = firstName ?? (typeof existing?.firstName === "string" ? existing.firstName : "");
    const nextLastName = lastName ?? (typeof existing?.lastName === "string" ? existing.lastName : "");
    const now = new Date();

    if (newPassword) {
      const user = (await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1))[0];
      if (!user) return NextResponse.json({ user: null }, { status: 401 });
      const linkedGoogle = (await db.select({ googleSub: googleAccounts.googleSub }).from(googleAccounts).where(eq(googleAccounts.userId, userId)).limit(1))[0];
      // Password accounts must prove their current password. Google-linked
      // accounts may set their first password without knowing the generated
      // placeholder, while still validating any value they do provide.
      if (currentPassword ? !(await verifyPassword(currentPassword, user.passwordHash)) : !linkedGoogle) {
        return NextResponse.json({ code: "CURRENT_PASSWORD_INVALID", error: "Current password is incorrect." }, { status: 400 });
      }
      await db.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: now }).where(eq(users.id, userId));
    }

    await db.run(sql`INSERT INTO user_profiles (user_id, first_name, last_name, created_at, updated_at) VALUES (${userId}, ${nextFirstName}, ${nextLastName}, ${now.getTime()}, ${now.getTime()}) ON CONFLICT(user_id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name, updated_at = excluded.updated_at`);
    return NextResponse.json({ user: { ...account.user, firstName: nextFirstName, lastName: nextLastName } }, { headers: { "cache-control": "no-store" } });
  } catch (caught) {
    console.error("Profile update database operation failed", caught instanceof Error ? caught.message : String(caught));
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The account database is unavailable or not initialized." }, { status: 503 });
  }
}
