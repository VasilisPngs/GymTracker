import { TABLES, readAll, writeRows, getMeta, setMeta, snapshot } from "./db.js";
import { scheduleSync, syncEvents } from "./sync.js";

export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Calves", "Core"];

export const SESSION_PRESETS = ["Chest", "Back", "Shoulders", "Arms", "Legs"];

const SEED = [
  ["Barbell Bench Press", "Chest", "Barbell"],
  ["Incline Barbell Bench Press", "Chest", "Barbell"],
  ["Incline Dumbbell Press", "Chest", "Dumbbell"],
  ["Flat Dumbbell Press", "Chest", "Dumbbell"],
  ["Chest Press Machine", "Chest", "Machine"],
  ["Cable Fly", "Chest", "Cable"],
  ["Pec Deck", "Chest", "Machine"],
  ["Weighted Dip", "Chest", "Bodyweight"],
  ["Pull Up", "Back", "Bodyweight"],
  ["Lat Pulldown", "Back", "Cable"],
  ["Barbell Row", "Back", "Barbell"],
  ["Dumbbell Row", "Back", "Dumbbell"],
  ["Seated Cable Row", "Back", "Cable"],
  ["Chest Supported Row", "Back", "Machine"],
  ["Straight Arm Pulldown", "Back", "Cable"],
  ["Deadlift", "Back", "Barbell"],
  ["Overhead Press", "Shoulders", "Barbell"],
  ["Seated Dumbbell Press", "Shoulders", "Dumbbell"],
  ["Lateral Raise", "Shoulders", "Dumbbell"],
  ["Cable Lateral Raise", "Shoulders", "Cable"],
  ["Reverse Pec Deck", "Shoulders", "Machine"],
  ["Face Pull", "Shoulders", "Cable"],
  ["Barbell Curl", "Biceps", "Barbell"],
  ["Incline Dumbbell Curl", "Biceps", "Dumbbell"],
  ["Hammer Curl", "Biceps", "Dumbbell"],
  ["Cable Curl", "Biceps", "Cable"],
  ["Preacher Curl", "Biceps", "Machine"],
  ["Close Grip Bench Press", "Triceps", "Barbell"],
  ["Triceps Pushdown", "Triceps", "Cable"],
  ["Overhead Cable Extension", "Triceps", "Cable"],
  ["Skull Crusher", "Triceps", "Barbell"],
  ["Barbell Back Squat", "Legs", "Barbell"],
  ["Hack Squat", "Legs", "Machine"],
  ["Leg Press", "Legs", "Machine"],
  ["Romanian Deadlift", "Legs", "Barbell"],
  ["Bulgarian Split Squat", "Legs", "Dumbbell"],
  ["Leg Extension", "Legs", "Machine"],
  ["Seated Leg Curl", "Legs", "Machine"],
  ["Lying Leg Curl", "Legs", "Machine"],
  ["Hip Thrust", "Legs", "Barbell"],
  ["Standing Calf Raise", "Calves", "Machine"],
  ["Seated Calf Raise", "Calves", "Machine"],
  ["Hanging Leg Raise", "Core", "Bodyweight"],
  ["Cable Crunch", "Core", "Cable"],
  ["Plank", "Core", "Bodyweight"]
];

export const storeEvents = new EventTarget();

const cache = {
  plan: new Map(),
  exercises: new Map(),
  workouts: new Map(),
  workout_exercises: new Map(),
  sets: new Map()
};

export const uid = () => crypto.randomUUID();
export const now = () => Date.now();

export function todayISO(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function announce() {
  storeEvents.dispatchEvent(new CustomEvent("changed"));
}

async function commit(entries) {
  for (const entry of entries) cache[entry.table].set(entry.row.id, entry.row);
  await writeRows(entries);
  announce();
  scheduleSync();
}

async function hydrate() {
  for (const table of TABLES) {
    const rows = await readAll(table);
    cache[table] = new Map(rows.map((row) => [row.id, row]));
  }
}

const seedId = (name) => `seed_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

async function seedCatalog() {
  if (cache.exercises.size > 0) return false;
  if (await getMeta("seeded", false)) return false;
  const created = now();
  const entries = SEED.map(([name, muscle_group, equipment]) => ({
    table: "exercises",
    row: {
      id: seedId(name),
      name,
      muscle_group,
      equipment,
      notes: null,
      is_archived: 0,
      created_at: created,
      deleted_at: null
    }
  }));
  await setMeta("seeded", true);
  await commit(entries);
  return true;
}

export async function initStore() {
  await hydrate();
  syncEvents.addEventListener("changed", async () => {
    await hydrate();
    announce();
  });
  syncEvents.addEventListener("synced", async () => {
    await seedCatalog();
  });
}

export function list(table) {
  return [...cache[table].values()].filter((row) => !row.deleted_at);
}

export function byId(table, id) {
  const row = cache[table].get(id);
  return row && !row.deleted_at ? row : null;
}

export function exercisesSorted() {
  return list("exercises")
    .filter((row) => !row.is_archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const weekdayIndex = (date = new Date()) => (date.getDay() + 6) % 7;

export function planTitle(weekday) {
  const row = cache.plan.get(String(weekday));
  return row && !row.deleted_at && row.title ? row.title : "";
}

export const todayPlan = () => planTitle(weekdayIndex());

export async function setPlanTitle(weekday, title) {
  const id = String(weekday);
  const current = cache.plan.get(id);
  const clean = title.trim();
  await commit([
    {
      table: "plan",
      row: {
        id,
        title: clean || null,
        created_at: current ? current.created_at : now(),
        deleted_at: null
      }
    }
  ]);
}

export function exercisesByRecent() {
  const used = new Map();
  for (const link of list("workout_exercises")) {
    const workout = byId("workouts", link.workout_id);
    if (!workout) continue;
    const seen = used.get(link.exercise_id);
    if (!seen || workout.performed_on > seen) used.set(link.exercise_id, workout.performed_on);
  }
  return exercisesSorted().sort((a, b) => {
    const first = used.get(a.id);
    const second = used.get(b.id);
    if (first && second) return first < second ? 1 : first > second ? -1 : a.name.localeCompare(b.name);
    if (first) return -1;
    if (second) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function workoutsSorted() {
  return list("workouts").sort((a, b) => (a.performed_on < b.performed_on ? 1 : a.performed_on > b.performed_on ? -1 : b.created_at - a.created_at));
}

export function workoutExercises(workoutId) {
  return list("workout_exercises")
    .filter((row) => row.workout_id === workoutId)
    .sort((a, b) => a.position - b.position);
}

export function setsOf(workoutExerciseId) {
  return list("sets")
    .filter((row) => row.workout_exercise_id === workoutExerciseId)
    .sort((a, b) => a.position - b.position);
}

export async function createWorkout(performed_on, title) {
  const row = {
    id: uid(),
    performed_on,
    title: title || null,
    notes: null,
    started_at: now(),
    finished_at: null,
    created_at: now(),
    deleted_at: null
  };
  await commit([{ table: "workouts", row }]);
  return row;
}

export async function updateWorkout(id, patch) {
  const current = byId("workouts", id);
  if (!current) return;
  await commit([{ table: "workouts", row: { ...current, ...patch } }]);
}

export async function deleteWorkout(id) {
  const current = byId("workouts", id);
  if (!current) return;
  const stamp = now();
  const entries = [{ table: "workouts", row: { ...current, deleted_at: stamp } }];
  for (const link of workoutExercises(id)) {
    entries.push({ table: "workout_exercises", row: { ...link, deleted_at: stamp } });
    for (const set of setsOf(link.id)) entries.push({ table: "sets", row: { ...set, deleted_at: stamp } });
  }
  await commit(entries);
}

export async function addExerciseToWorkout(workoutId, exerciseId) {
  const position = workoutExercises(workoutId).length;
  const row = {
    id: uid(),
    workout_id: workoutId,
    exercise_id: exerciseId,
    position,
    notes: null,
    created_at: now(),
    deleted_at: null
  };
  await commit([{ table: "workout_exercises", row }]);
  return row;
}

export async function removeWorkoutExercise(id) {
  const current = byId("workout_exercises", id);
  if (!current) return;
  const stamp = now();
  const entries = [{ table: "workout_exercises", row: { ...current, deleted_at: stamp } }];
  for (const set of setsOf(id)) entries.push({ table: "sets", row: { ...set, deleted_at: stamp } });
  await commit(entries);
}

export async function moveWorkoutExercise(id, direction) {
  const current = byId("workout_exercises", id);
  if (!current) return;
  const siblings = workoutExercises(current.workout_id);
  const index = siblings.findIndex((row) => row.id === id);
  const target = index + direction;
  if (target < 0 || target >= siblings.length) return;
  const other = siblings[target];
  await commit([
    { table: "workout_exercises", row: { ...current, position: other.position } },
    { table: "workout_exercises", row: { ...other, position: current.position } }
  ]);
}

export async function addSet(workoutExerciseId, values = {}) {
  const existing = setsOf(workoutExerciseId);
  const previous = existing[existing.length - 1];
  const row = {
    id: uid(),
    workout_exercise_id: workoutExerciseId,
    position: existing.length,
    reps: values.reps ?? previous?.reps ?? null,
    weight_kg: values.weight_kg ?? previous?.weight_kg ?? null,
    rir: values.rir ?? previous?.rir ?? null,
    is_warmup: values.is_warmup ?? 0,
    completed_at: null,
    created_at: now(),
    deleted_at: null
  };
  await commit([{ table: "sets", row }]);
  return row;
}

export async function updateSet(id, patch) {
  const current = byId("sets", id);
  if (!current) return;
  await commit([{ table: "sets", row: { ...current, ...patch } }]);
}

export async function deleteSet(id) {
  const current = byId("sets", id);
  if (!current) return;
  await commit([{ table: "sets", row: { ...current, deleted_at: now() } }]);
}

export async function createExercise(name, muscle_group, equipment) {
  const row = {
    id: uid(),
    name,
    muscle_group,
    equipment: equipment || null,
    notes: null,
    is_archived: 0,
    created_at: now(),
    deleted_at: null
  };
  await commit([{ table: "exercises", row }]);
  return row;
}

export async function updateExercise(id, patch) {
  const current = byId("exercises", id);
  if (!current) return;
  await commit([{ table: "exercises", row: { ...current, ...patch } }]);
}

export async function deleteExercise(id) {
  const current = byId("exercises", id);
  if (!current) return;
  await commit([{ table: "exercises", row: { ...current, deleted_at: now() } }]);
}

export const epley = (weight, reps) => (weight && reps ? weight * (1 + reps / 30) : 0);

export function workingSets(workoutExerciseId) {
  return setsOf(workoutExerciseId).filter((set) => !set.is_warmup && set.reps > 0);
}

export function describeSets(sets) {
  const groups = [];
  for (const set of sets) {
    const key = `${set.reps}x${set.weight_kg}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.count += 1;
    else groups.push({ key, count: 1, reps: set.reps, weight: set.weight_kg });
  }
  return groups.map((group) => `${group.count}×${group.reps} @ ${group.weight ?? 0}kg`).join(" · ");
}

export function summarizeSets(sets) {
  let volume = 0;
  let best = null;
  for (const set of sets) {
    const weight = set.weight_kg || 0;
    const reps = set.reps || 0;
    volume += weight * reps;
    const score = epley(weight, reps);
    if (!best || score > best.score) best = { score, set };
  }
  return { volume, best: best ? best.set : null, count: sets.length };
}

export function exerciseSessions(exerciseId) {
  const links = list("workout_exercises").filter((row) => row.exercise_id === exerciseId);
  const sessions = [];
  for (const link of links) {
    const workout = byId("workouts", link.workout_id);
    if (!workout) continue;
    const sets = workingSets(link.id);
    if (sets.length === 0) continue;
    const summary = summarizeSets(sets);
    sessions.push({
      workout,
      link,
      sets,
      volume: summary.volume,
      best: summary.best,
      e1rm: summary.best ? epley(summary.best.weight_kg, summary.best.reps) : 0
    });
  }
  return sessions.sort((a, b) => (a.workout.performed_on < b.workout.performed_on ? -1 : 1));
}

export function lastPerformance(exerciseId, excludeWorkoutId) {
  const sessions = exerciseSessions(exerciseId).filter((session) => session.workout.id !== excludeWorkoutId);
  return sessions.length > 0 ? sessions[sessions.length - 1] : null;
}

export function personalRecords(exerciseId) {
  const sessions = exerciseSessions(exerciseId);
  let heaviest = null;
  let bestE1rm = 0;
  let bestVolume = 0;
  for (const session of sessions) {
    for (const set of session.sets) {
      if (!heaviest || (set.weight_kg || 0) > (heaviest.weight_kg || 0)) heaviest = set;
      bestE1rm = Math.max(bestE1rm, epley(set.weight_kg, set.reps));
    }
    bestVolume = Math.max(bestVolume, session.volume);
  }
  return { heaviest, bestE1rm, bestVolume, sessions: sessions.length };
}

export function startOfWeek(date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);
  return copy;
}

export function weeklyBreakdown(weeks = 8) {
  const buckets = [];
  const base = startOfWeek(new Date());
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = new Date(base);
    start.setDate(start.getDate() - index * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({
      key: todayISO(start),
      start,
      end,
      volume: 0,
      sets: 0,
      workouts: 0,
      byMuscle: Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0]))
    });
  }
  for (const workout of list("workouts")) {
    const performed = new Date(`${workout.performed_on}T00:00:00`);
    const bucket = buckets.find((item) => performed >= item.start && performed < item.end);
    if (!bucket) continue;
    let counted = false;
    for (const link of workoutExercises(workout.id)) {
      const exercise = cache.exercises.get(link.exercise_id);
      const sets = workingSets(link.id);
      if (sets.length === 0) continue;
      counted = true;
      const summary = summarizeSets(sets);
      bucket.volume += summary.volume;
      bucket.sets += sets.length;
      if (exercise && bucket.byMuscle[exercise.muscle_group] !== undefined) {
        bucket.byMuscle[exercise.muscle_group] += sets.length;
      }
    }
    if (counted) bucket.workouts += 1;
  }
  return buckets;
}

export async function exportData() {
  return { exportedAt: new Date().toISOString(), data: await snapshot() };
}
