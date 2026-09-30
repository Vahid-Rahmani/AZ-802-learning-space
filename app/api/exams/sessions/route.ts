import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { attempts, examSessions } from "@/db/schema";
import { getDb } from "@/db";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { buildQuestionOrder, examBlueprints, examQuestionPool, selectExamQuestions, type ExamMode } from "@/lib/content/exam-blueprints";

const validModes = new Set<ExamMode>(["quick", "stage", "mixed", "full"]);

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export async function GET(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const rows = await getDb().select().from(examSessions).where(eq(examSessions.userId, auth.userId)).orderBy(desc(examSessions.startedAt));
  const activeOnly = new URL(request.url).searchParams.get("active") === "1";
  const sessions = rows.filter((row) => !activeOnly || (!row.completedAt && row.expiresAt.getTime() > Date.now()));
  return NextResponse.json({ sessions: sessions.slice(0, activeOnly ? 1 : sessions.length).map((row) => ({ ...row, questionOrder: parseJson(row.questionOrder, []), answers: parseJson(row.answers, {}) })) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const mode = typeof body.mode === "string" && validModes.has(body.mode as ExamMode) ? body.mode as ExamMode : "quick";
  const stageId = typeof body.stageId === "string" ? body.stageId : undefined;
  const blueprint = examBlueprints.find((item) => item.mode === mode) ?? examBlueprints[0];
  const db = getDb();
  const previous = await db.select({ questionId: attempts.questionId }).from(attempts).where(eq(attempts.userId, auth.userId)).orderBy(desc(attempts.answeredAt));
  const recentIds = previous.slice(0, 120).map((row) => row.questionId);
  const seed = crypto.randomUUID();
  const selected = selectExamQuestions({ mode, pool: examQuestionPool(), stageId, seed, recentIds });
  if (!selected.length) return NextResponse.json({ error: "No questions are available for this scope." }, { status: 422 });
  const questionOrder = buildQuestionOrder(selected, seed);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + blueprint.durationMinutes * 60_000);
  const id = crypto.randomUUID();
  await db.insert(examSessions).values({ id, userId: auth.userId, mode, blueprintVersion: `${blueprint.id}@${blueprint.version}`, questionOrder: JSON.stringify(questionOrder), answers: "{}", currentIndex: 0, startedAt, expiresAt });
  return NextResponse.json({ session: { id, userId: auth.userId, mode, blueprintVersion: `${blueprint.id}@${blueprint.version}`, questionOrder, answers: {}, currentIndex: 0, startedAt, expiresAt, questionCount: questionOrder.length, durationMinutes: blueprint.durationMinutes }, questions: selected }, { status: 201 });
}

