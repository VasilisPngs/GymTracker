CREATE TABLE plan (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  rev INTEGER NOT NULL
);

CREATE INDEX plan_rev_id ON plan (rev, id);
