import { NextResponse } from "next/server";
import { labSubmissions } from "@/db/schema";
import { getDb } from "@/db";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { eq } from "drizzle-orm";
import { practicalScenarios } from "@/lib/course-data";

export async function GET() {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  const rows = await getDb().select().from(labSubmissions).where(eq(labSubmissions.userId, userId));
  return NextResponse.json({ submissions: rows });
}

export async function POST(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const labId = typeof body.labId === "string" ? body.labId : "";
  const evidenceText = typeof body.evidenceText === "string" ? body.evidenceText : "";
  const knownLab = labId === "harden-two-server-domain" || practicalScenarios.some((scenario) => scenario.id === labId);
  if (!knownLab || evidenceText.trim().length < 8) return NextResponse.json({ error: "Evidence is required for a known lab" }, { status: 400 });
  const now = new Date();
  const practical = practicalScenarios.find((scenario) => scenario.id === labId);
  const normalizedEvidence = evidenceText.toLowerCase();
  const independentlyGradedScore = practical ? (practical.id === "practical-hardening"
    ? (/firewall|netfirewallprofile|inbound|domain/.test(normalizedEvidence) && /timestamp|output|verify|ثبت|nachweis/.test(normalizedEvidence) ? 100 : 50)
    : (/restore|recovery|backup|recovery point/.test(normalizedEvidence) && /timestamp|output|verify|زمان|nachweis/.test(normalizedEvidence) ? 100 : 50)) : null;
  const score = independentlyGradedScore ?? null;
  const completed = practical ? score !== null && score >= 70 : body.completed === true;
  await getDb().insert(labSubmissions).values({ id: crypto.randomUUID(), labId, userId, evidenceText: evidenceText.trim(), evidenceUrl: typeof body.evidenceUrl === "string" ? body.evidenceUrl : null, score, completedAt: completed ? now : null, createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true, score }, { status: 201 });
}
