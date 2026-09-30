ALTER TABLE attempts ADD COLUMN session_id TEXT;
ALTER TABLE attempts ADD COLUMN selected_answers TEXT;
CREATE INDEX IF NOT EXISTS attempts_session_question_idx ON attempts(session_id, question_id);
CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  blueprint_version TEXT NOT NULL,
  question_order TEXT NOT NULL,
  answers TEXT NOT NULL DEFAULT '{}',
  current_index INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER,
  score INTEGER
);
CREATE INDEX IF NOT EXISTS exam_sessions_user_idx ON exam_sessions(user_id, started_at);
