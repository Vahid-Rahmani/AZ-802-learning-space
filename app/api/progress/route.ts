import { NextResponse } from "next/server";
import { progress } from "@/db/schema";
import { getDb } from "@/db";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.userId !== "string" || typeof body.lessonId !== "string") return NextResponse.json({ error: "userId and lessonId are required" }, { status: 400 });
  const now = new Date();
  await getDb().insert(progress).values({ userId: body.userId, lessonId: body.lessonId, completionPercent: Math.max(0, Math.min(100, Number(body.completionPercent) || 0)), createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: progress.userId, set: { lessonId: body.lessonId, completionPercent: Math.max(0, Math.min(100, Number(body.completionPercent) || 0)), updatedAt: now } });
  return NextResponse.json({ ok: true });
}
