import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { progress } from "@/db/schema";
import { getDb } from "@/db";
import { verifySession } from "@/lib/session";

export async function GET() {
  const sessionUserId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!sessionUserId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const row = (await getDb().select().from(progress).where(eq(progress.userId, sessionUserId)).limit(1))[0] ?? null;
  return NextResponse.json({ progress: row });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.lessonId !== "string") return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  const sessionUserId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!sessionUserId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const now = new Date();
  await getDb().insert(progress).values({ userId: sessionUserId, lessonId: body.lessonId, completionPercent: Math.max(0, Math.min(100, Number(body.completionPercent) || 0)), createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: progress.userId, set: { lessonId: body.lessonId, completionPercent: Math.max(0, Math.min(100, Number(body.completionPercent) || 0)), updatedAt: now } });
  return NextResponse.json({ ok: true });
}
