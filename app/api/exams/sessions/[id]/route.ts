import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { attempts, examSessions, flashcards } from "@/db/schema";
import { getDb } from "@/db";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { questions } from "@/lib/course-data";
import { type ExamQuestionOrder } from "@/lib/content/exam-blueprints";

type Params = { params: Promise<{ id: string }> };
const intervals = [1, 3, 7, 14, 30];

function parseJson<T>(value: string, fallback: T): T { try { return JSON.parse(value) as T; } catch { return fallback; } }
function sameAnswers(left: number[], right: number[]) { return [...left].sort((a, b) => a - b).join(",") === [...right].sort((a, b) => a - b).join(","); }

async function loadSession(id: string, userId: string) {
  return (await getDb().select().from(examSessions).where(and(eq(examSessions.id, id), eq(examSessions.userId, userId)))).at(0) ?? null;
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const { id } = await params;
  const session = await loadSession(id, auth.userId);
  if (!session) return NextResponse.json({ error: "Exam session not found" }, { status: 404 });
  return NextResponse.json({ session: { ...session, questionOrder: parseJson<ExamQuestionOrder[]>(session.questionOrder, []), answers: parseJson<Record<string, number[]>>(session.answers, {}) } });
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const { id } = await params;
  const session = await loadSession(id, auth.userId);
  if (!session) return NextResponse.json({ error: "Exam session not found" }, { status: 404 });
  if (session.completedAt) return NextResponse.json({ error: "Exam session is already complete" }, { status: 409 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  // The browser submits the index in the displayed (shuffled) option list.
  // Store the canonical source index so a refresh/resume and completion use
  // the same answer even when option order changes in the UI.
  const displayedAnswers = Array.isArray(body.selectedAnswers) ? body.selectedAnswers.filter((value): value is number => Number.isInteger(value)) : typeof body.selectedAnswer === "number" ? [body.selectedAnswer] : [];
  const order = parseJson<ExamQuestionOrder[]>(session.questionOrder, []);
  const requestedIndex = typeof body.currentIndex === "number" ? Math.max(0, Math.min(Math.max(0, order.length - 1), Math.floor(body.currentIndex))) : null;
  if (!questionId && requestedIndex !== null) {
    if (Date.now() > session.expiresAt.getTime()) return NextResponse.json({ error: "Exam session has expired", code: "EXPIRED" }, { status: 409 });
    await getDb().update(examSessions).set({ currentIndex: requestedIndex }).where(eq(examSessions.id, session.id));
    return NextResponse.json({ ok: true, currentIndex: requestedIndex });
  }
  const ordered = order.find((item) => item.questionId === questionId);
  const question = questions.find((item) => item.id === questionId);
  if (!ordered || !question || !displayedAnswers.length || displayedAnswers.some((value) => value < 0 || value >= ordered.optionOrder.length)) return NextResponse.json({ error: "Invalid exam answer" }, { status: 400 });
  if (Date.now() > session.expiresAt.getTime()) return NextResponse.json({ error: "Exam session has expired", code: "EXPIRED" }, { status: 409 });
  const answers = parseJson<Record<string, number[]>>(session.answers, {});
  const selectedAnswers = Array.from(new Set(displayedAnswers.map((value) => ordered.optionOrder[value]))).sort((a, b) => a - b);
  const previousAnswer = answers[questionId];
  if (previousAnswer) {
    if (sameAnswers(previousAnswer, selectedAnswers)) {
      const currentIndex = requestedIndex ?? session.currentIndex;
      if (currentIndex !== session.currentIndex) await getDb().update(examSessions).set({ currentIndex }).where(eq(examSessions.id, session.id));
      return NextResponse.json({ ok: true, duplicate: true, answers, currentIndex });
    }
    return NextResponse.json({ error: "This question already has a different answer", code: "ANSWER_ALREADY_RECORDED" }, { status: 409 });
  }
  answers[questionId] = selectedAnswers;
  const currentIndex = typeof body.currentIndex === "number" ? Math.max(0, Math.min(order.length - 1, Math.floor(body.currentIndex))) : session.currentIndex;
  await getDb().update(examSessions).set({ answers: JSON.stringify(answers), currentIndex }).where(eq(examSessions.id, session.id));
  return NextResponse.json({ ok: true, answers, currentIndex });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const { id } = await params;
  const session = await loadSession(id, auth.userId);
  if (!session) return NextResponse.json({ error: "Exam session not found" }, { status: 404 });
  if (session.completedAt) return NextResponse.json({ ok: true, completed: true, score: session.score ?? 0 });
  const order = parseJson<ExamQuestionOrder[]>(session.questionOrder, []);
  const answers = parseJson<Record<string, number[]>>(session.answers, {});
  const answeredAt = new Date();
  const timedOut = answeredAt.getTime() > new Date(session.expiresAt).getTime();
  let correct = 0;
  const db = getDb();
  for (const item of order) {
    const question = questions.find((candidate) => candidate.id === item.questionId);
    if (!question) continue;
    const selected = answers[item.questionId] ?? [];
    if (!selected.length) continue;
    const expected = [question.correct];
    const isCorrect = sameAnswers(selected, expected);
    if (isCorrect) correct += 1;
    const existingAttempt = (await db.select({ id: attempts.id }).from(attempts).where(and(eq(attempts.userId, auth.userId), eq(attempts.questionId, item.questionId), eq(attempts.sessionId, session.id)))).at(0);
    if (!existingAttempt) await db.insert(attempts).values({ id: crypto.randomUUID(), userId: auth.userId, questionId: item.questionId, selectedAnswer: selected[0] ?? -1, selectedAnswers: JSON.stringify(selected), isCorrect, answeredAt, sessionId: session.id });
    if (!isCorrect) {
      const card = (await db.select({ id: flashcards.id }).from(flashcards).where(and(eq(flashcards.userId, auth.userId), eq(flashcards.questionId, item.questionId)))).at(0);
      if (!card) await db.insert(flashcards).values({ id: crypto.randomUUID(), userId: auth.userId, questionId: item.questionId, box: 1, dueAt: new Date(Date.now() + intervals[0] * 86400000), createdAt: answeredAt, updatedAt: answeredAt });
    }
  }
  const score = order.length ? Math.round((correct / order.length) * 100) : 0;
  await db.update(examSessions).set({ completedAt: answeredAt, score }).where(eq(examSessions.id, session.id));
  return NextResponse.json({ ok: true, completed: true, score, correct, total: order.length, timedOut });
}

