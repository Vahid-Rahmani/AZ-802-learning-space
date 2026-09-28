import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { attempts } from "@/db/schema";
import { getDb } from "@/db";
import { verifySession } from "@/lib/session";

export async function POST(request: Request) {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.questionId !== "string" || typeof body.selectedAnswer !== "number" || typeof body.isCorrect !== "boolean") return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
  const now = new Date();
  await getDb().insert(attempts).values({ id: crypto.randomUUID(), userId, questionId: body.questionId, selectedAnswer: body.selectedAnswer, isCorrect: body.isCorrect, answeredAt: now });
  return NextResponse.json({ ok: true }, { status: 201 });
}
