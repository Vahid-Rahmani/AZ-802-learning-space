import { NextResponse } from "next/server";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { getDb } from "@/db";
import { attempts, examSessions } from "@/db/schema";
import { buildQuestionOrder, examBlueprints, examQuestionPool, selectExamQuestions, type ExamMode } from "@/lib/content/exam-blueprints";
import { desc, eq } from "drizzle-orm";

const modes: ExamMode[] = ["quick", "stage", "mixed", "full"];
const scopedQuestions = examQuestionPool();

export async function POST(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const mode = modes.includes(body.mode as ExamMode) ? body.mode as ExamMode : "quick";
  const blueprint = examBlueprints.find((item) => item.mode === mode) ?? examBlueprints[0];
  const stageId = typeof body.stageId === "string" && body.stageId ? body.stageId : undefined;
  const seed = typeof body.seed === "string" && body.seed.length >= 1 && body.seed.length <= 128 ? body.seed : crypto.randomUUID();
  const storedRecent = await getDb().select({ questionId: attempts.questionId }).from(attempts).where(eq(attempts.userId, auth.userId)).orderBy(desc(attempts.answeredAt)).limit(120);
  const recentIds = Array.from(new Set([
    ...(Array.isArray(body.recentIds) ? body.recentIds.filter((value): value is string => typeof value === "string").slice(0, 500) : []),
    ...storedRecent.map((row) => row.questionId),
  ])).slice(0, 500);
  const selected = selectExamQuestions({ mode, pool: scopedQuestions, stageId, seed, recentIds });
  if (!selected.length) return NextResponse.json({ code: "NO_QUESTIONS", error: "No questions match this exam scope." }, { status: 400 });
  const questionOrder = buildQuestionOrder(selected, seed);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + blueprint.durationMinutes * 60_000);
  const sessionId = crypto.randomUUID();
  try {
    await getDb().insert(examSessions).values({ id: sessionId, userId: auth.userId, mode, blueprintVersion: `${blueprint.id}@${blueprint.version}`, questionOrder: JSON.stringify(questionOrder), answers: "{}", currentIndex: 0, startedAt, expiresAt });
  } catch {
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "The exam session could not be saved." }, { status: 503 });
  }
  return NextResponse.json({
    session: {
      id: sessionId,
      userId: auth.userId,
      blueprintId: blueprint.id,
      blueprintVersion: `${blueprint.id}@${blueprint.version}`,
      mode,
      seed,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      questionCount: questionOrder.length,
      questions: questionOrder,
    },
    questions: selected,
  }, { headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ code: "INVALID_INPUT", error: "A session id is required." }, { status: 400 });
  const session = (await getDb().select().from(examSessions).where(eq(examSessions.id, id)).limit(1))[0];
  if (!session || session.userId !== auth.userId) return NextResponse.json({ code: "NOT_FOUND", error: "Exam session not found." }, { status: 404 });
  return NextResponse.json({ session: { ...session, questionOrder: JSON.parse(session.questionOrder), answers: JSON.parse(session.answers) } }, { headers: { "cache-control": "no-store" } });
}
