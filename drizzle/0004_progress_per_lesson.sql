CREATE TABLE progress_new (user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completion_percent INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, lesson_id));
INSERT INTO progress_new (user_id, lesson_id, completion_percent, created_at, updated_at) SELECT user_id, lesson_id, completion_percent, created_at, updated_at FROM progress;
DROP TABLE progress;
ALTER TABLE progress_new RENAME TO progress;
