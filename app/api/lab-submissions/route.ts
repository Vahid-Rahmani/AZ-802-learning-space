import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { labSubmissions } from "@/db/schema";
import { getDb } from "@/db";
import { verifySession } from "@/lib/session";

export async function POST(request: Request) {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.labId !== "string" || typeof body.evidenceText !== "string" || body.evidenceText.trim().length < 8) return NextResponse.json({ error: "Evidence is required" }, { status: 400 });
  const now = new Date();
  await getDb().insert(labSubmissions).values({ id: crypto.randomUUID(), labId: body.labId, userId, evidenceText: body.evidenceText.trim(), evidenceUrl: typeof body.evidenceUrl === "string" ? body.evidenceUrl : null, completedAt: body.completed ? now : null, createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true }, { status: 201 });
}
