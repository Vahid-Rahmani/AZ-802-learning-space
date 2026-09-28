import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { flashcards } from "@/db/schema";
import { getDb } from "@/db";
import { verifySession } from "@/lib/session";

const intervals = [1, 3, 7, 14, 30];
export async function POST(request: Request) {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.questionId !== "string") return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  const box = Math.max(1, Math.min(intervals.length, Number(body.box) || 1));
  const dueAt = new Date(Date.now() + intervals[box - 1] * 86400000);
  const now = new Date();
  await getDb().insert(flashcards).values({ id: crypto.randomUUID(), userId, questionId: body.questionId, box, dueAt, createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true, box, dueAt }, { status: 201 });
}
