CREATE TABLE IF NOT EXISTS german_course_state (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course_id)
);
