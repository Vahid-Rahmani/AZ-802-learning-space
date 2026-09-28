import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { labSubmissions } from "@/db/schema";
import { getDb } from "@/db";
import { verifySession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { practicalScenarios } from "@/lib/course-data";

export async function GET() {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await getDb().select().from(labSubmissions).where(eq(labSubmissions.userId, userId));
  return NextResponse.json({ submissions: rows });
}

export async function POST(request: Request) {
  const userId = await verifySession((await cookies()).get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const labId = typeof body.labId === "string" ? body.labId : "";
  const evidenceText = typeof body.evidenceText === "string" ? body.evidenceText : "";
  const knownLab = labId === "harden-two-server-domain" || practicalScenarios.some((scenario) => scenario.id === labId);
  if (!knownLab || evidenceText.trim().length < 8) return NextResponse.json({ error: "Evidence is required for a known lab" }, { status: 400 });
  const now = new Date();
  await getDb().insert(labSubmissions).values({ id: crypto.randomUUID(), labId, userId, evidenceText: evidenceText.trim(), evidenceUrl: typeof body.evidenceUrl === "string" ? body.evidenceUrl : null, completedAt: body.completed ? now : null, createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true }, { status: 201 });
}
