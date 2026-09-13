CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  rev INTEGER NOT NULL
);

CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  performed_on TEXT NOT NULL,
  title TEXT,
  notes TEXT,
  started_at INTEGER,
  finished_at INTEGER,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  rev INTEGER NOT NULL
);

CREATE TABLE workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  rev INTEGER NOT NULL
);

CREATE TABLE sets (
  id TEXT PRIMARY KEY,
  workout_exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  reps INTEGER,
  weight_kg REAL,
  rir INTEGER,
  is_warmup INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  rev INTEGER NOT NULL
);

CREATE TABLE sync_rev (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL
);

INSERT INTO sync_rev (id, value) VALUES (1, 0);

CREATE INDEX exercises_rev_id ON exercises (rev, id);
CREATE INDEX workouts_rev_id ON workouts (rev, id);
CREATE INDEX workouts_performed_on ON workouts (performed_on);
CREATE INDEX workout_exercises_rev_id ON workout_exercises (rev, id);
CREATE INDEX workout_exercises_workout ON workout_exercises (workout_id);
CREATE INDEX sets_rev_id ON sets (rev, id);
CREATE INDEX sets_workout_exercise ON sets (workout_exercise_id);
