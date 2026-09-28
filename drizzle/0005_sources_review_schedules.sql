CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL, version TEXT NOT NULL, reviewed_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS review_schedules (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, flashcard_id TEXT NOT NULL, interval_days INTEGER NOT NULL, due_at INTEGER NOT NULL, last_reviewed_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS review_schedules_user_due_idx ON review_schedules(user_id, due_at);
