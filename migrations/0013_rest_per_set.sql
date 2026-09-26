ALTER TABLE sets ADD COLUMN rest_seconds INTEGER;

UPDATE sync_rev SET value = value + 1;

UPDATE sets
SET rest_seconds = (SELECT rest_seconds FROM workout_exercises WHERE workout_exercises.id = sets.workout_exercise_id),
    rev = (SELECT value FROM sync_rev)
WHERE is_warmup = 0
  AND (SELECT rest_seconds FROM workout_exercises WHERE workout_exercises.id = sets.workout_exercise_id) IS NOT NULL;

ALTER TABLE workout_exercises DROP COLUMN rest_seconds;
