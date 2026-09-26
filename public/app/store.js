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

let indexes = null;

function bucket(map, key, row) {
  const rows = map.get(key);
  if (rows) rows.push(row);
  else map.set(key, [row]);
}

function buildIndexes() {
  const setsByLink = new Map();
  const linksByWorkout = new Map();
  const linksByExercise = new Map();
  const plannedByProgram = new Map();
  for (const row of cache.sets.values()) if (!row.deleted_at) bucket(setsByLink, row.workout_exercise_id, row);
  for (const row of cache.workout_exercises.values()) {
    if (row.deleted_at) continue;
    bucket(linksByWorkout, row.workout_id, row);
    bucket(linksByExercise, row.exercise_id, row);
  }
  for (const row of cache.program_exercises.values()) if (!row.deleted_at) bucket(plannedByProgram, row.program_id, row);
  const byPosition = (a, b) => a.position - b.position;
  for (const map of [setsByLink, linksByWorkout, linksByExercise, plannedByProgram]) {
    for (const rows of map.values()) rows.sort(byPosition);
  }
  indexes = { setsByLink, linksByWorkout, linksByExercise, plannedByProgram };
  return indexes;
}

const index = () => indexes || buildIndexes();

const children = (map, key) => {
  const rows = map.get(key);
  return rows ? rows.slice() : [];
};

const uid = () => crypto.randomUUID();
const nextPosition = (rows) => (rows.length > 0 ? rows[rows.length - 1].position + 1 : 0);

function reorder(table, siblings, from, to) {
  if (from < 0 || to < 0 || to >= siblings.length) return [];
  const order = siblings.slice();
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  return order.flatMap((row, position) => (row.position === position ? [] : [{ table, row: { ...row, position } }]));
}
export const now = () => Date.now();

function todayISO(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function announce() {
  storeEvents.dispatchEvent(new CustomEvent("changed"));
}

async function commit(entries) {
  for (const entry of entries) cache[entry.table].set(entry.row.id, entry.row);
  indexes = null;
  await writeRows(entries);
  announce();
  scheduleSync();
}

async function hydrate() {
  for (const table of TABLES) {
    const rows = await readAll(table);
    cache[table] = new Map(rows.map((row) => [row.id, row]));
  }
  indexes = null;
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
  return list("exercises").sort((a, b) => a.name.localeCompare(b.name));
}

export function programsSorted() {
  return list("programs").sort((a, b) => a.position - b.position || a.created_at - b.created_at);
}

export function lastTrained(programId) {
  const dates = list("workouts")
    .filter((workout) => workout.program_id === programId && workoutExercises(workout.id).some((link) => workingSets(link.id).length > 0))
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
  return children(index().linksByWorkout, workoutId);
}

export function setsOf(workoutExerciseId) {
  return children(index().setsByLink, workoutExerciseId);
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

function latestOfProgram(workout) {
  if (!workout || !workout.program_id) return false;
  return workoutsSorted().find((row) => row.program_id === workout.program_id)?.id === workout.id;
}

function plannedForLatest(link) {
  const workout = byId("workouts", link.workout_id);
  if (!latestOfProgram(workout)) return null;
  const first = workoutExercises(link.workout_id).find((row) => row.exercise_id === link.exercise_id);
  return !first || first.id === link.id ? plannedFor(link, workout.program_id) : null;
}

function latestSets(exerciseId, workoutId) {
  const previous = lastPerformance(exerciseId, workoutId);
  if (!previous) return null;
  const sets = setsOf(previous.link.id);
  return { previous, sets: sets.filter((set) => set.is_warmup).concat(sets.filter((set) => !set.is_warmup)) };
}

function setRows(linkId, template, stamp, from = 0) {
  return template.map((set, index) => ({
    table: "sets",
    row: {
      id: uid(),
      workout_exercise_id: linkId,
      position: from + index,
      reps: set.reps ?? null,
      weight_kg: set.weight_kg ?? null,
      is_warmup: set.is_warmup ? 1 : 0,
      rest_seconds: set.is_warmup ? null : set.rest_seconds ?? null,
      completed_at: null,
      created_at: stamp,
      deleted_at: null
    }
  }));
}

export async function addExerciseToWorkout(workoutId, exerciseId) {
  const links = workoutExercises(workoutId);
  const earlier = links.filter((link) => link.exercise_id === exerciseId).pop();
  const latest = earlier ? null : latestSets(exerciseId, workoutId);
  const today = earlier ? setsOf(earlier.id).filter((set) => !set.is_warmup).slice(-1) : [];
  const stamp = now();
  const row = {
    id: uid(),
    workout_id: workoutId,
    exercise_id: exerciseId,
    position: nextPosition(links),
    rest_after_seconds: latest?.previous.link.rest_after_seconds ?? null,
    notes: earlier ? earlier.notes : latest?.previous.link.notes ?? null,
    created_at: stamp,
    deleted_at: null
  };
  await commit([{ table: "workout_exercises", row }].concat(setRows(row.id, earlier ? today : latest ? latest.sets : [], stamp)));
  return row;
}

export async function replaceWorkoutExercise(linkId, exerciseId) {
  const link = byId("workout_exercises", linkId);
  if (!link || link.exercise_id === exerciseId) return;
  const stamp = now();
  const sets = setsOf(link.id);
  const open = sets.filter((set) => !set.completed_at);
  const latest = latestSets(exerciseId, link.workout_id);
  const entries = [];
  let target;
  if (open.length < sets.length) {
    const siblings = workoutExercises(link.workout_id);
    for (const row of siblings.slice(siblings.findIndex((row) => row.id === link.id) + 1)) {
      entries.push({ table: "workout_exercises", row: { ...row, position: row.position + 1 } });
    }
    target = { id: uid(), workout_id: link.workout_id, exercise_id: exerciseId, position: link.position + 1, created_at: stamp, deleted_at: null };
  } else {
    target = { ...link, exercise_id: exerciseId };
  }
  target.rest_after_seconds = latest ? latest.previous.link.rest_after_seconds ?? null : link.rest_after_seconds;
  target.notes = latest?.previous.link.notes ?? null;
  entries.push({ table: "workout_exercises", row: target });
  if (latest) {
    for (const set of open) entries.push({ table: "sets", row: { ...set, deleted_at: stamp } });
    entries.push(...setRows(target.id, latest.sets, stamp));
  } else {
    for (const set of open) entries.push({ table: "sets", row: { ...set, workout_exercise_id: target.id, weight_kg: null } });
  }
  await commit(entries);
}

export async function updateWorkoutExercise(id, patch) {
  const current = byId("workout_exercises", id);
  if (!current) return;
  const row = { ...current, ...patch };
  const entries = [{ table: "workout_exercises", row }];
  const planned = plannedForLatest(row);
  if (planned && planned.notes !== row.notes) entries.push({ table: "program_exercises", row: { ...planned, notes: row.notes } });
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
  const entries = reorder("workout_exercises", siblings, index, index + direction);
  if (entries.length > 0) await commit(entries);
}

function restPlan(exerciseId, workoutId) {
  const previous = lastPerformance(exerciseId, workoutId);
  return previous ? setsOf(previous.link.id).filter((set) => !set.is_warmup).map((set) => set.rest_seconds ?? null) : [];
}

function usualRest(workoutId, excludeLinkId) {
  const counts = new Map();
  for (const link of workoutExercises(workoutId)) {
    if (link.id === excludeLinkId) continue;
    for (const set of setsOf(link.id)) {
      if (!set.is_warmup && set.rest_seconds) counts.set(set.rest_seconds, (counts.get(set.rest_seconds) || 0) + 1);
    }
  }
  let usual = null;
  for (const [value, count] of counts) if (usual === null || count > counts.get(usual)) usual = value;
  return usual;
}

function restFor(plan, index, fallback) {
  return plan.length > 0 ? plan[Math.min(index, plan.length - 1)] : fallback ?? null;
}

export async function addSet(workoutExerciseId, values = {}) {
  const existing = setsOf(workoutExerciseId);
  const warmup = values.is_warmup ?? 0;
  const working = existing.filter((set) => !set.is_warmup);
  const previous = warmup ? null : working[working.length - 1];
  const link = byId("workout_exercises", workoutExerciseId);
  let rest = null;
  if (!warmup && link) {
    const workout = byId("workouts", link.workout_id);
    const planned = workout && workout.program_id ? plannedFor(link, workout.program_id) : null;
    rest =
      previous?.rest_seconds ??
      restFor(restPlan(link.exercise_id, link.workout_id), working.length, planned?.rest_seconds ?? usualRest(link.workout_id, link.id));
  }
  const row = {
    id: uid(),
    workout_exercise_id: workoutExerciseId,
    position: nextPosition(existing),
    reps: values.reps ?? previous?.reps ?? null,
    weight_kg: values.weight_kg ?? previous?.weight_kg ?? null,
    is_warmup: warmup,
    rest_seconds: rest,
    completed_at: null,
    created_at: now(),
    deleted_at: null
  };
  const entries = [{ table: "sets", row }];
  if (link && !row.is_warmup) {
    const target = targetFromRows(link, existing.filter((set) => !set.is_warmup).length + 1);
    if (target) entries.push({ table: "program_exercises", row: target });
  }
  await commit(entries);
  return row;
}

function targetFromRows(link, rows) {
  const planned = plannedForLatest(link);
  if (!planned || rows === 0 || planned.target_sets === rows) return null;
  return { ...planned, target_sets: rows };
}

function plannedFor(link, programId) {
  return programExercises(programId).find((item) => item.exercise_id === link.exercise_id) || null;
}

function targetFromSets(row) {
  const link = byId("workout_exercises", row.workout_exercise_id);
  if (!link) return null;
  const planned = plannedForLatest(link);
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
  return children(index().plannedByProgram, programId).filter((row) => byId("exercises", row.exercise_id));
}

export async function createProgram(title) {
  const row = {
    id: uid(),
    title,
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

export async function moveProgram(id, direction) {
  const siblings = programsSorted();
  const index = siblings.findIndex((row) => row.id === id);
  const entries = reorder("programs", siblings, index, index + direction);
  if (entries.length > 0) await commit(entries);
}

export async function deleteProgram(id) {
  const current = byId("programs", id);
  if (!current) return;
  const stamp = now();
  const entries = [{ table: "programs", row: { ...current, deleted_at: stamp } }];
  for (const item of programExercises(id)) entries.push({ table: "program_exercises", row: { ...item, deleted_at: stamp } });
  await commit(entries);
}

function latestTargets(exerciseId) {
  const latest = latestSets(exerciseId, null);
  const working = latest ? latest.sets.filter((set) => !set.is_warmup) : [];
  const last = working[working.length - 1];
  return {
    target_sets: working.length || null,
    target_reps: last?.reps ?? null,
    target_weight_kg: last?.weight_kg ?? null,
    rest_seconds: working[0]?.rest_seconds ?? null,
    notes: latest?.previous.link.notes ?? null
  };
}

export async function addProgramExercise(programId, exerciseId) {
  const siblings = programExercises(programId);
  const row = {
    id: uid(),
    program_id: programId,
    exercise_id: exerciseId,
    position: nextPosition(siblings),
    ...latestTargets(exerciseId),
    edited_at: null,
    created_at: now(),
    deleted_at: null
  };
  await commit([{ table: "program_exercises", row }]);
  return row;
}

const PLANNED_TARGETS = ["target_sets", "target_reps", "target_weight_kg", "rest_seconds"];

export async function updateProgramExercise(id, patch) {
  const current = byId("program_exercises", id);
  if (!current) return;
  const edited = PLANNED_TARGETS.some((key) => key in patch) ? { edited_at: now() } : {};
  await commit([{ table: "program_exercises", row: { ...current, ...patch, ...edited } }]);
}

export async function replaceProgramExercise(id, exerciseId) {
  const current = byId("program_exercises", id);
  if (!current || current.exercise_id === exerciseId) return;
  const latest = latestTargets(exerciseId);
  await commit([
    {
      table: "program_exercises",
      row: {
        ...current,
        exercise_id: exerciseId,
        target_sets: latest.target_sets ?? current.target_sets,
        target_reps: latest.target_reps ?? current.target_reps,
        target_weight_kg: latest.target_weight_kg,
        rest_seconds: latest.rest_seconds ?? current.rest_seconds,
        notes: latest.notes,
        edited_at: null
      }
    }
  ]);
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
  const entries = reorder("program_exercises", siblings, index, index + direction);
  if (entries.length > 0) await commit(entries);
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
    const latest = latestSets(planned.exercise_id, workout.id);
    const link = {
      id: uid(),
      workout_id: workout.id,
      exercise_id: planned.exercise_id,
      position,
      rest_after_seconds: latest?.previous.link.rest_after_seconds ?? null,
      notes: planned.notes ?? latest?.previous.link.notes ?? null,
      created_at: stamp,
      deleted_at: null
    };
    entries.push({ table: "workout_exercises", row: link });
    const edited = latest && planned.edited_at > (latest.previous.workout.started_at || latest.previous.workout.created_at);
    const plan = restPlan(planned.exercise_id, workout.id);
    const template =
      latest && !edited
        ? latest.sets
        : (latest ? latest.sets.filter((set) => set.is_warmup) : []).concat(
            Array.from({ length: Math.max(planned.target_sets || 0, 0) }, (_, index) => ({
              reps: planned.target_reps,
              weight_kg: planned.target_weight_kg,
              is_warmup: 0,
              rest_seconds: restFor(plan, index, planned.rest_seconds)
            }))
          );
    entries.push(...setRows(link.id, template, stamp));
    position += 1;
  }
  await commit(entries);
  return workout;
}

export async function createExercise(name, muscle_group) {
  const row = {
    id: uid(),
    name,
    muscle_group,
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
  for (const link of children(index().linksByExercise, id)) {
    entries.push({ table: "workout_exercises", row: { ...link, deleted_at: stamp } });
    for (const set of setsOf(link.id)) entries.push({ table: "sets", row: { ...set, deleted_at: stamp } });
  }
  await commit(entries);
}

export function exerciseUsage(id) {
  const sessions = exerciseSessions(id);
  const programs = new Set();
  for (const row of list("program_exercises")) {
    if (row.exercise_id === id && byId("programs", row.program_id)) programs.add(row.program_id);
  }
  return { sessions: sessions.length, sets: sessions.reduce((sum, session) => sum + session.sets.length, 0), programs: programs.size };
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
  const byWorkout = new Map();
  for (const link of index().linksByExercise.get(exerciseId) || []) {
    const workout = byId("workouts", link.workout_id);
    if (!workout) continue;
    const sets = workingSets(link.id);
    if (sets.length === 0) continue;
    const session = byWorkout.get(workout.id);
    if (!session) {
      byWorkout.set(workout.id, { workout, link, main: sets.length, sets: sets.slice() });
      continue;
    }
    if (sets.length > session.main || (sets.length === session.main && link.position < session.link.position)) {
      session.link = link;
      session.main = sets.length;
    }
    session.sets.push(...sets);
  }
  const sessions = [...byWorkout.values()].map(({ workout, link, sets }) => {
    const summary = summarizeSets(sets);
    return { workout, link, sets, volume: summary.volume, best: summary.best };
  });
  return sessions.sort((a, b) =>
    a.workout.performed_on < b.workout.performed_on ? -1 : a.workout.performed_on > b.workout.performed_on ? 1 : a.workout.created_at - b.workout.created_at
  );
}

export function lastPerformance(exerciseId, workoutId) {
  const workout = workoutId ? byId("workouts", workoutId) : null;
  const sessions = exerciseSessions(exerciseId).filter(
    (session) =>
      session.workout.id !== workoutId &&
      (!workout ||
        session.workout.performed_on < workout.performed_on ||
        (session.workout.performed_on === workout.performed_on && session.workout.created_at < workout.created_at))
  );
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
  const linksByWorkout = index().linksByWorkout;
  for (const workout of list("workouts")) {
    const performed = new Date(`${workout.performed_on}T00:00:00`);
    const week = buckets.find((item) => performed >= item.start && performed < item.end);
    if (!week) continue;
    let counted = false;
    for (const link of linksByWorkout.get(workout.id) || []) {
      const exercise = cache.exercises.get(link.exercise_id);
      const sets = workingSets(link.id);
      if (sets.length === 0) continue;
      counted = true;
      const summary = summarizeSets(sets);
      week.volume += summary.volume;
      week.sets += sets.length;
      if (exercise && week.byMuscle[exercise.muscle_group] !== undefined) {
        week.byMuscle[exercise.muscle_group] += sets.length;
      }
    }
    if (counted) week.workouts += 1;
  }
  return buckets;
}

export async function exportData() {
  return { exportedAt: new Date().toISOString(), data: await snapshot() };
}
