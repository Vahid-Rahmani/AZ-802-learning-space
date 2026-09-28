import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { attempts } from "@/db/schema";
import { getDb } from "@/db";
import { verifySession } from "@/lib/session";
import { questions } from "@/lib/course-data";

export async function GET() {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await getDb().select().from(attempts).where(eq(attempts.userId, userId));
  return NextResponse.json({ attempts: rows });
}

export async function POST(request: Request) {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const selectedAnswer = typeof body.selectedAnswer === "number" ? body.selectedAnswer : -1;
  const isCorrect = typeof body.isCorrect === "boolean" ? body.isCorrect : false;
  const question = questions.find((item) => item.id === questionId);
  if (!question || selectedAnswer < 0 || selectedAnswer >= question.options.length || isCorrect !== (selectedAnswer === question.correct)) return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
  const now = new Date();
  await getDb().insert(attempts).values({ id: crypto.randomUUID(), userId, questionId, selectedAnswer, isCorrect, answeredAt: now });
  return NextResponse.json({ ok: true }, { status: 201 });
}
