import { sql } from "drizzle-orm";
import { getDb } from "@/db";

let schemaPromise: Promise<void> | null = null;

/**
 * The Sites D1 runtime can be attached to an older database that predates
 * durable exam sessions. Keep the upgrade safe to run more than once so a
 * first exam request can repair that installation without creating duplicate
 * tables or indexes.
 */
export function ensureExamSchema() {
  schemaPromise ??= (async () => {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, question_id TEXT NOT NULL, selected_answer INTEGER NOT NULL, is_correct INTEGER NOT NULL, answered_at INTEGER NOT NULL)`);
    await db.run(sql`ALTER TABLE attempts ADD COLUMN session_id TEXT`).catch(() => undefined);
    await db.run(sql`ALTER TABLE attempts ADD COLUMN selected_answers TEXT`).catch(() => undefined);
    await db.run(sql`CREATE INDEX IF NOT EXISTS attempts_session_question_idx ON attempts(session_id, question_id)`);
    await db.run(sql`CREATE TABLE IF NOT EXISTS exam_sessions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, mode TEXT NOT NULL, blueprint_version TEXT NOT NULL, question_order TEXT NOT NULL, answers TEXT NOT NULL DEFAULT '{}', current_index INTEGER NOT NULL DEFAULT 0, started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, completed_at INTEGER, score INTEGER)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS exam_sessions_user_idx ON exam_sessions(user_id, started_at)`);
  })();
  return schemaPromise.catch((error) => {
    schemaPromise = null;
    throw error;
  });
}
