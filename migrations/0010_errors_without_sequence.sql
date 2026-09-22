CREATE TABLE errors_new (
  id INTEGER PRIMARY KEY,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  route TEXT,
  agent TEXT
);
INSERT INTO errors_new (id, at, kind, message, stack, route, agent)
  SELECT id, at, kind, message, stack, route, agent FROM errors;
DROP TABLE errors;
ALTER TABLE errors_new RENAME TO errors;
CREATE INDEX errors_at ON errors (at);
