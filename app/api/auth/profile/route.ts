import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { googleAccounts, userProfiles, users } from "@/db/schema";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { hashPassword, verifyPassword } from "@/lib/session";

const maxNameLength = 80;
const validName = (value: string) => value.length <= maxNameLength && !/[\u0000-\u001F\u007F]/.test(value);

async function accountData(userId: string) {
  const db = getDb();
  // Keep deployments that predate account profiles self-healing. The formal
  // migration is still checked in, while this idempotent guard prevents an
  // existing deployment from returning a database error before it is applied.
  await db.run(sql`CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY NOT NULL, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  const user = (await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) return null;
  const profile = (await db.select({ firstName: userProfiles.firstName, lastName: userProfiles.lastName }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
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
  } catch {
    console.error("Profile database operation failed");
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
    const existing = (await db.select({ firstName: userProfiles.firstName, lastName: userProfiles.lastName }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
    const nextFirstName = firstName ?? existing?.firstName ?? "";
    const nextLastName = lastName ?? existing?.lastName ?? "";
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

    await db.insert(userProfiles).values({ userId, firstName: nextFirstName, lastName: nextLastName, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: userProfiles.userId, set: { firstName: nextFirstName, lastName: nextLastName, updatedAt: now } });
    return NextResponse.json({ user: { ...account.user, firstName: nextFirstName, lastName: nextLastName } }, { headers: { "cache-control": "no-store" } });
  } catch {
    console.error("Profile update database operation failed");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The account database is unavailable or not initialized." }, { status: 503 });
  }
}
