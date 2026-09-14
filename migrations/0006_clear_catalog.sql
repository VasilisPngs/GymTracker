UPDATE sync_rev SET value = value + 1;

UPDATE sets
SET deleted_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000, rev = (SELECT value FROM sync_rev)
WHERE deleted_at IS NULL;

UPDATE workout_exercises
SET deleted_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000, rev = (SELECT value FROM sync_rev)
WHERE deleted_at IS NULL;

UPDATE program_exercises
SET deleted_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000, rev = (SELECT value FROM sync_rev)
WHERE deleted_at IS NULL;

UPDATE workouts
SET deleted_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000, rev = (SELECT value FROM sync_rev)
WHERE deleted_at IS NULL;

UPDATE exercises
SET deleted_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000, rev = (SELECT value FROM sync_rev)
WHERE deleted_at IS NULL;
