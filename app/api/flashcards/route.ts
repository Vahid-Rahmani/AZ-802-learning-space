import { NextResponse } from "next/server";
import { flashcards } from "@/db/schema";
import { getDb } from "@/db";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { desc, eq } from "drizzle-orm";
import { allQuestions } from "@/lib/course-data";

const intervals = [1, 3, 7, 14, 30];
const normalizeQuestionId = (questionId: string) => questionId === "ipsec-connection-rule" ? "az802-q-216" : questionId;
export async function GET() {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  const rows = await getDb().select().from(flashcards).where(eq(flashcards.userId, userId));
  return NextResponse.json({ flashcards: rows.map((row) => ({ ...row, questionId: normalizeQuestionId(row.questionId) })) });
}

export async function POST(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const questionId = typeof body.questionId === "string" ? normalizeQuestionId(body.questionId) : "";
  if (!allQuestions.some((question) => question.id === questionId)) return NextResponse.json({ error: "A valid questionId is required" }, { status: 400 });
  const box = Math.max(1, Math.min(intervals.length, Number(body.box) || 1));
  const dueAt = new Date(Date.now() + intervals[box - 1] * 86400000);
  const now = new Date();
  const existing = (await getDb().select().from(flashcards).where(eq(flashcards.userId, userId))).find((card) => card.questionId === questionId || (questionId === "az802-q-216" && card.questionId === "ipsec-connection-rule"));
  if (existing) {
    await getDb().update(flashcards).set({ box: Math.min(existing.box, box), dueAt, updatedAt: now }).where(eq(flashcards.id, existing.id));
    return NextResponse.json({ ok: true, duplicate: true, box: Math.min(existing.box, box), dueAt });
  }
  await getDb().insert(flashcards).values({ id: crypto.randomUUID(), userId, questionId, box, dueAt, createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true, box, dueAt }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const questionId = typeof body.questionId === "string" ? normalizeQuestionId(body.questionId) : "";
  const quality = body.quality === "got-it" ? "got-it" : body.quality === "again" ? "again" : "";
  if (!allQuestions.some((question) => question.id === questionId) || !quality) return NextResponse.json({ error: "questionId and quality are required" }, { status: 400 });
  const db = getDb();
  const existing = (await db.select().from(flashcards).where(eq(flashcards.userId, userId)).orderBy(desc(flashcards.updatedAt))).find((card) => card.questionId === questionId || (questionId === "az802-q-216" && card.questionId === "ipsec-connection-rule"));
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
