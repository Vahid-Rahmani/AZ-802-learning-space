import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { attempts } from "@/db/schema";
import { getDb } from "@/db";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { allQuestions } from "@/lib/course-data";

const sameAnswers = (left: number[], right: number[]) => [...left].sort((a, b) => a - b).join(",") === [...right].sort((a, b) => a - b).join(",");

export async function GET() {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  const rows = await getDb().select().from(attempts).where(eq(attempts.userId, userId));
  return NextResponse.json({ attempts: rows });
}

export async function POST(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const selectedAnswers = Array.isArray(body.selectedAnswers) ? Array.from(new Set(body.selectedAnswers.filter((value): value is number => Number.isInteger(value)))).sort((a, b) => a - b) : typeof body.selectedAnswer === "number" ? [body.selectedAnswer] : [];
  const selectedAnswer = selectedAnswers[0] ?? -1;
  const isCorrect = typeof body.isCorrect === "boolean" ? body.isCorrect : false;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  const question = allQuestions.find((item) => item.id === questionId);
  if (!question || !selectedAnswers.length || selectedAnswers.some((value) => value < 0 || value >= question.options.length) || isCorrect !== sameAnswers(selectedAnswers, [question.correct])) return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
  const now = new Date();
  if (sessionId) {
    const existing = (await getDb().select({ id: attempts.id }).from(attempts).where(and(eq(attempts.userId, userId), eq(attempts.questionId, questionId), eq(attempts.sessionId, sessionId)))).at(0);
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
  }
  await getDb().insert(attempts).values({ id: crypto.randomUUID(), userId, questionId, selectedAnswer, selectedAnswers: JSON.stringify(selectedAnswers), isCorrect, answeredAt: now, sessionId });
  return NextResponse.json({ ok: true }, { status: 201 });
}
