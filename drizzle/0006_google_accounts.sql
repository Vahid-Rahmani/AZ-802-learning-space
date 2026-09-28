CREATE TABLE IF NOT EXISTS google_accounts (google_sub TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS google_accounts_user_id_idx ON google_accounts(user_id);
