UPDATE sync_rev SET value = value + 1 WHERE id = 1;

UPDATE workout_exercises
SET exercise_id = (
      SELECT MIN(keeper.id) FROM exercises keeper
      WHERE keeper.deleted_at IS NULL
        AND keeper.name = (SELECT source.name FROM exercises source WHERE source.id = workout_exercises.exercise_id)
    ),
    rev = (SELECT value FROM sync_rev WHERE id = 1)
WHERE exercise_id IN (
      SELECT id FROM exercises
      WHERE deleted_at IS NULL
        AND id NOT IN (SELECT MIN(id) FROM exercises WHERE deleted_at IS NULL GROUP BY name)
    );

UPDATE exercises
SET deleted_at = unixepoch() * 1000,
    rev = (SELECT value FROM sync_rev WHERE id = 1)
WHERE deleted_at IS NULL
  AND id NOT IN (SELECT MIN(id) FROM exercises WHERE deleted_at IS NULL GROUP BY name);
