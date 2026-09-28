import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { flashcards } from "@/db/schema";
import { getDb } from "@/db";
import { verifySession } from "@/lib/session";
import { desc, eq } from "drizzle-orm";
import { questions } from "@/lib/course-data";

const intervals = [1, 3, 7, 14, 30];
export async function GET() {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await getDb().select().from(flashcards).where(eq(flashcards.userId, userId));
  return NextResponse.json({ flashcards: rows });
}

export async function POST(request: Request) {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.questionId !== "string" || !questions.some((question) => question.id === body.questionId)) return NextResponse.json({ error: "A valid questionId is required" }, { status: 400 });
  const box = Math.max(1, Math.min(intervals.length, Number(body.box) || 1));
  const dueAt = new Date(Date.now() + intervals[box - 1] * 86400000);
  const now = new Date();
  await getDb().insert(flashcards).values({ id: crypto.randomUUID(), userId, questionId: body.questionId, box, dueAt, createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true, box, dueAt }, { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const questionId = typeof body.questionId === "string" && questions.some((question) => question.id === body.questionId) ? body.questionId : "";
  const quality = body.quality === "got-it" ? "got-it" : body.quality === "again" ? "again" : "";
  if (!questionId || !quality) return NextResponse.json({ error: "questionId and quality are required" }, { status: 400 });
  const db = getDb();
  const existing = (await db.select().from(flashcards).where(eq(flashcards.userId, userId)).orderBy(desc(flashcards.updatedAt))).find((card) => card.questionId === questionId);
  const currentBox = existing?.box ?? 1;
  const box = quality === "again" ? 1 : Math.min(intervals.length, currentBox + 1);
  const dueAt = new Date(Date.now() + intervals[box - 1] * 86400000);
  const now = new Date();
  if (existing) {
    await db.update(flashcards).set({ box, dueAt, updatedAt: now }).where(eq(flashcards.id, existing.id));
  } else {
    await db.insert(flashcards).values({ id: crypto.randomUUID(), userId, questionId, box, dueAt, createdAt: now, updatedAt: now });
  }
  return NextResponse.json({ ok: true, box, dueAt });
}
