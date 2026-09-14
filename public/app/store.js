import { TABLES, readAll, writeRows, snapshot } from "./db.js";
import { scheduleSync, syncEvents } from "./sync.js";

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "LowerBack",
  "Shoulders",
  "Traps",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Adductors",
  "Abductors",
  "Calves",
  "Abs"
];

export const storeEvents = new EventTarget();

const cache = {
  exercises: new Map(),
  workouts: new Map(),
  workout_exercises: new Map(),
  sets: new Map(),
  programs: new Map(),
  program_exercises: new Map()
};

export const MAX_SETS = 12;

const uid = () => crypto.randomUUID();
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

export async function initStore() {
  await hydrate();
  syncEvents.addEventListener("changed", async () => {
    await hydrate();
    announce();
  });
}

export function list(table) {
  return [...cache[table].values()].filter((row) => !row.deleted_at);
}

export function byId(table, id) {
  const row = cache[table].get(id);
  return row && !row.deleted_at ? row : null;
}

function exercisesSorted() {
  return list("exercises")
    .filter((row) => !row.is_archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function programsSorted() {
  return list("programs").sort((a, b) => a.position - b.position || a.created_at - b.created_at);
}

export function lastTrained(programId) {
  const dates = list("workouts")
    .filter((workout) => workout.program_id === programId)
    .map((workout) => workout.performed_on)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
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
    rest_seconds: null,
    notes: null,
    created_at: now(),
    deleted_at: null
  };
  await commit([{ table: "workout_exercises", row }]);
  return row;
}

export async function updateWorkoutExercise(id, patch) {
  const current = byId("workout_exercises", id);
  if (!current) return;
  const row = { ...current, ...patch };
  const entries = [{ table: "workout_exercises", row }];
  const workout = byId("workouts", row.workout_id);
  if (workout && workout.program_id) {
    const planned = plannedFor(row, workout.program_id);
    if (planned && (planned.notes !== row.notes || planned.rest_seconds !== row.rest_seconds)) {
      entries.push({ table: "program_exercises", row: { ...planned, notes: row.notes, rest_seconds: row.rest_seconds } });
    }
  }
  await commit(entries);
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
  const warmup = values.is_warmup ?? 0;
  const previous = warmup ? null : existing.filter((set) => !set.is_warmup).pop();
  const row = {
    id: uid(),
    workout_exercise_id: workoutExerciseId,
    position: existing.length,
    reps: values.reps ?? previous?.reps ?? null,
    weight_kg: values.weight_kg ?? previous?.weight_kg ?? null,
    is_warmup: warmup,
    completed_at: null,
    created_at: now(),
    deleted_at: null
  };
  const link = byId("workout_exercises", workoutExerciseId);
  const entries = [{ table: "sets", row }];
  if (link && !row.is_warmup) {
    const target = targetFromRows(link, existing.filter((set) => !set.is_warmup).length + 1);
    if (target) entries.push({ table: "program_exercises", row: target });
  }
  await commit(entries);
  return row;
}

function targetFromRows(link, rows) {
  const workout = byId("workouts", link.workout_id);
  if (!workout || !workout.program_id) return null;
  const planned = plannedFor(link, workout.program_id);
  if (!planned || rows === 0 || planned.target_sets === rows) return null;
  return { ...planned, target_sets: rows };
}

function plannedFor(link, programId) {
  return programExercises(programId).find((item) => item.exercise_id === link.exercise_id) || null;
}

function targetFromSets(row) {
  const link = byId("workout_exercises", row.workout_exercise_id);
  if (!link) return null;
  const workout = byId("workouts", link.workout_id);
  if (!workout || !workout.program_id) return null;
  const planned = plannedFor(link, workout.program_id);
  if (!planned) return null;
  const done = setsOf(link.id)
    .map((set) => (set.id === row.id ? row : set))
    .filter((set) => !set.is_warmup && set.completed_at && set.weight_kg > 0 && set.reps > 0);
  if (done.length === 0) return null;
  const last = done.reduce((latest, set) => (set.completed_at >= latest.completed_at ? set : latest));
  if (planned.target_weight_kg === last.weight_kg && planned.target_reps === last.reps) return null;
  return { ...planned, target_weight_kg: last.weight_kg, target_reps: last.reps };
}

export async function updateSet(id, patch) {
  const current = byId("sets", id);
  if (!current) return;
  const row = { ...current, ...patch };
  const entries = [{ table: "sets", row }];
  const target = targetFromSets(row);
  if (target) entries.push({ table: "program_exercises", row: target });
  await commit(entries);
}

export async function deleteSet(id) {
  const current = byId("sets", id);
  if (!current) return;
  const entries = [{ table: "sets", row: { ...current, deleted_at: now() } }];
  const link = byId("workout_exercises", current.workout_exercise_id);
  if (link && !current.is_warmup) {
    const target = targetFromRows(link, setsOf(link.id).filter((set) => !set.is_warmup && set.id !== id).length);
    if (target) entries.push({ table: "program_exercises", row: target });
  }
  await commit(entries);
}

export function programExercises(programId) {
  return list("program_exercises")
    .filter((row) => row.program_id === programId && byId("exercises", row.exercise_id))
    .sort((a, b) => a.position - b.position);
}

export async function createProgram(title) {
  const row = {
    id: uid(),
    title,
    notes: null,
    position: programsSorted().length,
    created_at: now(),
    deleted_at: null
  };
  await commit([{ table: "programs", row }]);
  return row;
}

export async function updateProgram(id, patch) {
  const current = byId("programs", id);
  if (!current) return;
  await commit([{ table: "programs", row: { ...current, ...patch } }]);
}

export async function deleteProgram(id) {
  const current = byId("programs", id);
  if (!current) return;
  const stamp = now();
  const entries = [{ table: "programs", row: { ...current, deleted_at: stamp } }];
  for (const item of programExercises(id)) entries.push({ table: "program_exercises", row: { ...item, deleted_at: stamp } });
  await commit(entries);
}

export async function addProgramExercise(programId, exerciseId) {
  const siblings = programExercises(programId);
  const row = {
    id: uid(),
    program_id: programId,
    exercise_id: exerciseId,
    position: siblings.length,
    target_sets: null,
    target_reps: null,
    target_weight_kg: null,
    rest_seconds: null,
    notes: null,
    created_at: now(),
    deleted_at: null
  };
  await commit([{ table: "program_exercises", row }]);
  return row;
}

export async function updateProgramExercise(id, patch) {
  const current = byId("program_exercises", id);
  if (!current) return;
  await commit([{ table: "program_exercises", row: { ...current, ...patch } }]);
}

export async function removeProgramExercise(id) {
  const current = byId("program_exercises", id);
  if (!current) return;
  await commit([{ table: "program_exercises", row: { ...current, deleted_at: now() } }]);
}

export async function moveProgramExercise(id, direction) {
  const current = byId("program_exercises", id);
  if (!current) return;
  const siblings = programExercises(current.program_id);
  const index = siblings.findIndex((row) => row.id === id);
  const target = index + direction;
  if (target < 0 || target >= siblings.length) return;
  const other = siblings[target];
  await commit([
    { table: "program_exercises", row: { ...current, position: other.position } },
    { table: "program_exercises", row: { ...other, position: current.position } }
  ]);
}

export async function startWorkoutFromProgram(programId, performed_on = todayISO()) {
  const program = byId("programs", programId);
  if (!program) return null;
  const stamp = now();
  const workout = {
    id: uid(),
    performed_on,
    program_id: program.id,
    title: program.title,
    notes: null,
    started_at: stamp,
    finished_at: null,
    created_at: stamp,
    deleted_at: null
  };
  const entries = [{ table: "workouts", row: workout }];
  let position = 0;
  for (const planned of programExercises(programId)) {
    if (!byId("exercises", planned.exercise_id)) continue;
    const link = {
      id: uid(),
      workout_id: workout.id,
      exercise_id: planned.exercise_id,
      position,
      rest_seconds: planned.rest_seconds,
      notes: planned.notes,
      created_at: stamp,
      deleted_at: null
    };
    entries.push({ table: "workout_exercises", row: link });
    const count = Math.min(Math.max(planned.target_sets || 0, 0), MAX_SETS);
    for (let index = 0; index < count; index += 1) {
      entries.push({
        table: "sets",
        row: {
          id: uid(),
          workout_exercise_id: link.id,
          position: index,
          reps: planned.target_reps,
          weight_kg: planned.target_weight_kg,
          is_warmup: 0,
          completed_at: null,
          created_at: stamp,
          deleted_at: null
        }
      });
    }
    position += 1;
  }
  await commit(entries);
  return workout;
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
  const stamp = now();
  const entries = [{ table: "exercises", row: { ...current, deleted_at: stamp } }];
  for (const row of list("program_exercises")) {
    if (row.exercise_id === id) entries.push({ table: "program_exercises", row: { ...row, deleted_at: stamp } });
  }
  for (const link of list("workout_exercises")) {
    if (link.exercise_id !== id) continue;
    entries.push({ table: "workout_exercises", row: { ...link, deleted_at: stamp } });
    for (const set of setsOf(link.id)) entries.push({ table: "sets", row: { ...set, deleted_at: stamp } });
  }
  await commit(entries);
}

export function workingSets(workoutExerciseId) {
  return setsOf(workoutExerciseId).filter((set) => !set.is_warmup && set.completed_at && set.reps > 0);
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
    if (!best || weight > best.weight || (weight === best.weight && reps > best.reps)) best = { weight, reps, set };
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
      best: summary.best
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
  for (const session of sessions) {
    for (const set of session.sets) {
      if (!heaviest || (set.weight_kg || 0) > (heaviest.weight_kg || 0)) heaviest = set;
    }
  }
  return { heaviest, sessions: sessions.length };
}

function startOfWeek(date) {
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
