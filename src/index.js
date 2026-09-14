const MAX_BOUND_PARAMS = 90;
const MAX_INSERT_STATEMENTS = 40;
const PULL_LIMIT = 400;
const MAX_MUTATIONS = 200;

const text = (v) => (v === undefined || v === null ? null : String(v));
const int = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};
const real = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (v) => (v ? 1 : 0);

const SCHEMA = {
  exercises: {
    id: { cast: text, required: true },
    name: { cast: text, required: true },
    muscle_group: { cast: text, required: true },
    equipment: { cast: text },
    notes: { cast: text },
    is_archived: { cast: bool, required: true },
    created_at: { cast: int, required: true },
    deleted_at: { cast: int }
  },
  workouts: {
    id: { cast: text, required: true },
    performed_on: { cast: text, required: true },
    program_id: { cast: text },
    title: { cast: text },
    notes: { cast: text },
    started_at: { cast: int },
    finished_at: { cast: int },
    created_at: { cast: int, required: true },
    deleted_at: { cast: int }
  },
  workout_exercises: {
    id: { cast: text, required: true },
    workout_id: { cast: text, required: true },
    exercise_id: { cast: text, required: true },
    position: { cast: int, required: true },
    rest_seconds: { cast: int },
    notes: { cast: text },
    created_at: { cast: int, required: true },
    deleted_at: { cast: int }
  },
  programs: {
    id: { cast: text, required: true },
    title: { cast: text, required: true },
    weekday: { cast: int },
    notes: { cast: text },
    position: { cast: int, required: true },
    created_at: { cast: int, required: true },
    deleted_at: { cast: int }
  },
  program_exercises: {
    id: { cast: text, required: true },
    program_id: { cast: text, required: true },
    exercise_id: { cast: text, required: true },
    position: { cast: int, required: true },
    target_sets: { cast: int },
    target_reps: { cast: int },
    target_weight_kg: { cast: real },
    rest_seconds: { cast: int },
    notes: { cast: text },
    created_at: { cast: int, required: true },
    deleted_at: { cast: int }
  },
  sets: {
    id: { cast: text, required: true },
    workout_exercise_id: { cast: text, required: true },
    position: { cast: int, required: true },
    reps: { cast: int },
    weight_kg: { cast: real },
    rir: { cast: int },
    is_warmup: { cast: bool, required: true },
    completed_at: { cast: int },
    created_at: { cast: int, required: true },
    deleted_at: { cast: int }
  }
};

const TABLES = Object.keys(SCHEMA);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

function normalizeRow(table, input) {
  const columns = SCHEMA[table];
  const row = {};
  for (const [column, spec] of Object.entries(columns)) {
    const value = spec.cast(input[column]);
    if (value === null && spec.required) {
      throw new Error(`missing ${table}.${column}`);
    }
    row[column] = value;
  }
  return row;
}

function buildUpserts(table, rows, rev) {
  const columns = Object.keys(SCHEMA[table]);
  const perStatement = Math.max(1, Math.floor(MAX_BOUND_PARAMS / columns.length));
  const assignments = columns
    .filter((c) => c !== "id")
    .map((c) => `${c}=excluded.${c}`)
    .concat(`rev=excluded.rev`)
    .join(", ");
  const statements = [];
  for (let i = 0; i < rows.length; i += perStatement) {
    const chunk = rows.slice(i, i + perStatement);
    const placeholders = chunk.map(() => `(${columns.map(() => "?").join(", ")}, ${rev})`).join(", ");
    const params = [];
    for (const row of chunk) for (const column of columns) params.push(row[column]);
    statements.push({
      sql: `INSERT INTO ${table} (${columns.join(", ")}, rev) VALUES ${placeholders} ON CONFLICT(id) DO UPDATE SET ${assignments}`,
      params
    });
  }
  return statements;
}

function readCursor(cursors, table) {
  const cursor = cursors && cursors[table];
  const rev = cursor && Number.isFinite(Number(cursor.rev)) ? Math.trunc(Number(cursor.rev)) : 0;
  const id = cursor && typeof cursor.id === "string" ? cursor.id : "";
  return { rev: rev < 0 ? 0 : rev, id };
}

async function sync(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const mutations = Array.isArray(payload.mutations) ? payload.mutations : [];
  if (mutations.length > MAX_MUTATIONS) return json({ error: "too_many_mutations" }, 413);

  const grouped = new Map();
  try {
    for (const mutation of mutations) {
      const table = mutation && mutation.table;
      if (!SCHEMA[table]) continue;
      if (!grouped.has(table)) grouped.set(table, new Map());
      const row = normalizeRow(table, mutation.row || {});
      grouped.get(table).set(row.id, row);
    }
  } catch (error) {
    return json({ error: "invalid_row", detail: error.message }, 400);
  }

  let rev = null;
  if (grouped.size > 0) {
    const bumped = await env.DB.prepare("UPDATE sync_rev SET value = value + 1 WHERE id = 1 RETURNING value").first();
    rev = bumped.value;

    const statements = [];
    for (const [table, rows] of grouped) {
      statements.push(...buildUpserts(table, [...rows.values()], rev));
    }
    if (statements.length > MAX_INSERT_STATEMENTS) return json({ error: "batch_too_large" }, 413);
    if (statements.length > 0) {
      await env.DB.batch(statements.map((s) => env.DB.prepare(s.sql).bind(...s.params)));
    }
  }

  const cursors = payload.cursors || {};
  const pulls = TABLES.map((table) => {
    const cursor = readCursor(cursors, table);
    return env.DB.prepare(
      `SELECT * FROM ${table} WHERE rev > ?1 OR (rev = ?1 AND id > ?2) ORDER BY rev, id LIMIT ?3`
    ).bind(cursor.rev, cursor.id, PULL_LIMIT);
  });

  const results = await env.DB.batch(pulls);
  const changes = {};
  const nextCursors = {};
  let hasMore = false;

  results.forEach((result, index) => {
    const table = TABLES[index];
    const rows = result.results || [];
    changes[table] = rows;
    const cursor = readCursor(cursors, table);
    const last = rows[rows.length - 1];
    nextCursors[table] = last ? { rev: last.rev, id: last.id } : cursor;
    if (rows.length === PULL_LIMIT) hasMore = true;
  });

  return json({ rev, cursors: nextCursors, changes, hasMore, serverTime: Date.now() });
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

async function behindAccess(request, url, ctx) {
  if (LOCAL_HOSTS.has(url.hostname)) return true;
  if (request.headers.has("cf-access-jwt-assertion")) return true;
  try {
    const identity = ctx && ctx.access ? await ctx.access.getIdentity() : null;
    if (identity && identity.email) return true;
  } catch {}
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/sync") return json({ error: "not_found" }, 404);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!(await behindAccess(request, url, ctx))) return json({ error: "forbidden" }, 403);
    try {
      return await sync(request, env);
    } catch (error) {
      return json({ error: "sync_failed", detail: String(error && error.message) }, 500);
    }
  }
};
