import { checkAccess } from "./access.js";

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
    rest_after_seconds: { cast: int },
    notes: { cast: text },
    created_at: { cast: int, required: true },
    deleted_at: { cast: int }
  },
  programs: {
    id: { cast: text, required: true },
    title: { cast: text, required: true },
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
    edited_at: { cast: int },
    created_at: { cast: int, required: true },
    deleted_at: { cast: int }
  },
  sets: {
    id: { cast: text, required: true },
    workout_exercise_id: { cast: text, required: true },
    position: { cast: int, required: true },
    reps: { cast: int },
    weight_kg: { cast: real },
    is_warmup: { cast: bool, required: true },
    rest_seconds: { cast: int },
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

function buildUpserts(table, rows) {
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
    const placeholders = chunk.map(() => `(${columns.map(() => "?").join(", ")}, (SELECT value FROM sync_rev WHERE id = 1))`).join(", ");
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
    return json({ error: "invalid_row", detail: String(error.message).slice(0, 200) }, 400);
  }

  let rev = null;
  if (grouped.size > 0) {
    const statements = [];
    for (const [table, rows] of grouped) {
      statements.push(...buildUpserts(table, [...rows.values()]));
    }
    if (statements.length > MAX_INSERT_STATEMENTS) return json({ error: "batch_too_large" }, 413);
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE sync_rev SET value = value + 1 WHERE id = 1 RETURNING value"),
      ...statements.map((s) => env.DB.prepare(s.sql).bind(...s.params))
    ]);
    rev = results[0].results[0].value;
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

const REPORT_WINDOW_MS = 60000;
const REPORT_LIMIT = 20;
const ERROR_RETENTION_MS = 30 * 86400000;
let reportWindow = 0;
let reportCount = 0;

function recordError(env, entry) {
  const now = Date.now();
  return env.DB.batch([
    env.DB.prepare("INSERT INTO errors (at, kind, message, stack, route, agent) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(
      now,
      String(entry.kind || "error").slice(0, 20),
      String(entry.message || "").slice(0, 300),
      String(entry.stack || "").slice(0, 1000) || null,
      String(entry.route || "").slice(0, 120) || null,
      String(entry.agent || "").slice(0, 200) || null
    ),
    env.DB.prepare("DELETE FROM errors WHERE at < ?1").bind(now - ERROR_RETENTION_MS)
  ]).catch(() => {});
}

async function handleReport(request, env) {
  const now = Date.now();
  if (now - reportWindow > REPORT_WINDOW_MS) {
    reportWindow = now;
    reportCount = 0;
  }
  if (reportCount >= REPORT_LIMIT) return json({ ok: true });
  reportCount += 1;
  const payload = await request.json().catch(() => null);
  const message = payload && typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) return json({ ok: true });
  await recordError(env, { ...payload, message, agent: request.headers.get("user-agent") });
  return json({ ok: true });
}

const ROUTES = {
  "/api/report": handleReport,
  "/api/sync": sync
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const route = ROUTES[url.pathname];
    if (!route) return json({ error: "not_found" }, 404);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const access = await checkAccess(request, url, env, ctx);
    if (access === "unavailable") return json({ error: "access_unavailable" }, 503);
    if (access !== "ok") return json({ error: "forbidden" }, 403);
    try {
      return await route(request, env);
    } catch (error) {
      return json({ error: "request_failed", detail: String(error && error.message).slice(0, 200) }, 500);
    }
  }
};
