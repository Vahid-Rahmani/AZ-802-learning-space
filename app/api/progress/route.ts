import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { progress } from "@/db/schema";
import { getDb } from "@/db";
import { currentUser, signInRequired } from "@/lib/auth-server";

export async function GET() {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const sessionUserId = auth.userId;
  if (!sessionUserId) return signInRequired();
  const rows = await getDb().select().from(progress).where(eq(progress.userId, sessionUserId));
  return NextResponse.json({ progress: rows });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.lessonId !== "string") return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const sessionUserId = auth.userId;
  if (!sessionUserId) return signInRequired();
  const now = new Date();
  await getDb().insert(progress).values({ userId: sessionUserId, lessonId: body.lessonId, completionPercent: Math.max(0, Math.min(100, Number(body.completionPercent) || 0)), createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: [progress.userId, progress.lessonId], set: { completionPercent: Math.max(0, Math.min(100, Number(body.completionPercent) || 0)), updatedAt: now } });
  return NextResponse.json({ ok: true });
}
