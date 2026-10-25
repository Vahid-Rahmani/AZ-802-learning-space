import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { currentUser, signInRequired } from "@/lib/auth-server";
import { zuInfinitivQuestions } from "@/lib/content/german-a1b2/index";
import { emptyCourseState, parseCourseState, type GrammarCourseState } from "@/lib/content/german-a1b2/types";

const COURSE_ID = "a1-b2";
const MODULE_ID = "infinitiv-zu";
const MAX_STATE_BYTES = 250_000;
const QUESTION_IDS = zuInfinitivQuestions.map((question) => question.id);

async function ensureTable() {
  await getDb().run(sql`CREATE TABLE IF NOT EXISTS german_course_state (
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    state_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, course_id)
  )`);
}

export async function GET() {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  try {
    await ensureTable();
    const rows = await getDb().all(sql`SELECT state_json AS stateJson, updated_at AS updatedAt
      FROM german_course_state WHERE user_id = ${auth.userId} AND course_id = ${COURSE_ID} LIMIT 1`) as Array<{ stateJson?: unknown; updatedAt?: unknown }>;
    if (!rows.length || typeof rows[0].stateJson !== "string") {
      return NextResponse.json({ state: emptyCourseState(MODULE_ID), stored: false }, { headers: { "cache-control": "no-store" } });
    }
    let parsed: unknown;
    try { parsed = JSON.parse(rows[0].stateJson); } catch { parsed = null; }
    const state = parseCourseState(parsed, MODULE_ID, QUESTION_IDS);
    if (!state) {
      // Do not surface a corrupt row as progress; the client can start fresh
      // and the next successful save replaces the unusable value.
      return NextResponse.json({ state: emptyCourseState(MODULE_ID), stored: false, recovered: true }, { headers: { "cache-control": "no-store" } });
    }
    return NextResponse.json({ state, stored: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    console.error("German course progress could not be loaded");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "Saved grammar progress is unavailable. Your browser copy is still usable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_STATE_BYTES) return NextResponse.json({ error: "State is too large." }, { status: 413 });
  const body = await request.json().catch(() => null) as { state?: unknown } | null;
  const state = parseCourseState(body?.state, MODULE_ID, QUESTION_IDS);
  if (!state) return NextResponse.json({ error: "Invalid grammar progress state." }, { status: 400 });
  const wire: GrammarCourseState = { ...state, updatedAt: Date.now() };
  try {
    await ensureTable();
    await getDb().run(sql`INSERT INTO german_course_state (user_id, course_id, state_json, updated_at)
      VALUES (${auth.userId}, ${COURSE_ID}, ${JSON.stringify(wire)}, ${wire.updatedAt})
      ON CONFLICT(user_id, course_id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at`);
    return NextResponse.json({ ok: true, state: wire }, { headers: { "cache-control": "no-store" } });
  } catch {
    console.error("German course progress could not be saved");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "Could not save grammar progress. Keep this page open and retry." }, { status: 503 });
  }
}

export async function DELETE() {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  if (!auth.userId) return signInRequired();
  try {
    await ensureTable();
    await getDb().run(sql`DELETE FROM german_course_state WHERE user_id = ${auth.userId} AND course_id = ${COURSE_ID}`);
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    console.error("German course progress could not be reset");
    return NextResponse.json({ code: "DATABASE_UNAVAILABLE", error: "Could not reset grammar progress. Retry when the database is available." }, { status: 503 });
  }
}
