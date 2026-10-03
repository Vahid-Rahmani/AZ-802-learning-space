import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { labSubmissions } from "@/db/schema";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { learningLabs } from "@/lib/content/lab-registry";
import { emptyServerLabState, gradeServerLab, parseServerLabState } from "@/lib/server-lab-state";
import { legacyCcnaIds, restoreCcnaDomain } from "@/lib/ccna-progress";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const { id } = await context.params;
  const lab = learningLabs.find((item) => item.id === id);
  if (!lab) return NextResponse.json({ error: "Unknown learning lab" }, { status: 404 });
  try {
    const [row] = await getDb().select().from(labSubmissions).where(and(eq(labSubmissions.id, `${auth.userId}:server-lab:${id}`), eq(labSubmissions.userId, auth.userId)));
    const legacyIds = legacyCcnaIds(id);
    const previous = !row && legacyIds.length ? await getDb().select().from(labSubmissions).where(and(eq(labSubmissions.userId, auth.userId), inArray(labSubmissions.id, legacyIds.map((legacyId) => `${auth.userId}:server-lab:${legacyId}`)))) : [];
    const state = row ? parseServerLabState(JSON.parse(row.evidenceText), lab) : legacyIds.length ? restoreCcnaDomain(id, previous) : emptyServerLabState();
    if (!state) throw new Error("Invalid saved lab state");
    return NextResponse.json({ labId: id, state, grade: gradeServerLab(lab, state), evidenceUrl: row?.evidenceUrl ?? null });
  } catch {
    console.error("Learning lab progress could not be loaded");
    return NextResponse.json({ error: "Could not load saved lab progress. Try again; your previous work has not been reset." }, { status: 503 });
  }
}

export async function PUT(request: Request, context: Context) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const { id } = await context.params;
  const lab = learningLabs.find((item) => item.id === id);
  if (!lab) return NextResponse.json({ error: "Unknown learning lab" }, { status: 404 });
  if (Number(request.headers.get("content-length")) > 40000) return NextResponse.json({ error: "Lab evidence is too large" }, { status: 413 });
  const payload = await request.json().catch(() => null) as { state?: unknown; evidenceUrl?: unknown; userId?: unknown } | null;
  // Auth selects the owner; the optional draft owner prevents queued writes crossing accounts after logout.
  if (payload?.userId !== undefined && payload.userId !== auth.userId) return NextResponse.json({ error: "The account changed. Reopen this practice in your current account." }, { status: 409 });
  const state = parseServerLabState(payload?.state, lab);
  if (!state) return NextResponse.json({ error: "Invalid lab checklist, test result or quiz answer" }, { status: 400 });
  if (payload?.evidenceUrl !== undefined && payload.evidenceUrl !== null && (typeof payload.evidenceUrl !== "string" || !payload.evidenceUrl.startsWith(`${auth.userId}/${lab.id}/`))) return NextResponse.json({ error: "Evidence must belong to this account and lab" }, { status: 400 });
  const grade = gradeServerLab(lab, state);
  const now = new Date();
  try {
    // A stable, user-scoped row makes retries, refresh and repeated quiz checks idempotent.
    await getDb().insert(labSubmissions).values({ id: `${auth.userId}:server-lab:${id}`, userId: auth.userId, labId: id, evidenceText: JSON.stringify(state), evidenceUrl: typeof payload?.evidenceUrl === "string" ? payload.evidenceUrl : null, score: grade.quizPercent, completedAt: grade.complete ? now : null, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: labSubmissions.id, set: { evidenceText: JSON.stringify(state), ...(payload?.evidenceUrl !== undefined ? { evidenceUrl: payload.evidenceUrl as string | null } : {}), score: grade.quizPercent, completedAt: grade.complete ? now : null, updatedAt: now } });
    return NextResponse.json({ ok: true, state, grade });
  } catch {
    console.error("Learning lab progress could not be saved");
    return NextResponse.json({ error: "Could not save lab progress. Keep this page open and retry." }, { status: 503 });
  }
}
