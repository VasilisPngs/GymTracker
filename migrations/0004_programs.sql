UPDATE sync_rev SET value = value + 1;

CREATE TABLE programs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  weekday INTEGER,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  rev INTEGER NOT NULL
);

CREATE TABLE program_exercises (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  target_sets INTEGER,
  target_reps INTEGER,
  target_weight_kg REAL,
  rest_seconds INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  rev INTEGER NOT NULL
);

ALTER TABLE workout_exercises ADD COLUMN rest_seconds INTEGER;

DROP TABLE plan;

CREATE INDEX programs_rev_id ON programs (rev, id);
CREATE INDEX program_exercises_rev_id ON program_exercises (rev, id);
CREATE INDEX program_exercises_program ON program_exercises (program_id);
