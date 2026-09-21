const DB_NAME = "gymtracker";
const DB_VERSION = 4;

export const TABLES = ["exercises", "workouts", "workout_exercises", "sets", "programs", "program_exercises"];

let dbPromise = null;

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const ensure = (name, keyPath = "id") => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
      };
      for (const name of TABLES) ensure(name);
      if (db.objectStoreNames.contains("plan")) db.deleteObjectStore("plan");
      ensure("outbox", ["table", "id"]);
      ensure("meta", "key");
      for (const name of db.objectStoreNames) {
        const store = request.transaction.objectStore(name);
        for (const indexName of [...store.indexNames]) store.deleteIndex(indexName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("database_blocked"));
  });
  return dbPromise;
}

async function transact(stores, mode, run) {
  const db = await openDatabase();
  const tx = db.transaction(stores, mode);
  const settled = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("transaction_aborted"));
  });
  let result;
  try {
    result = await run(tx);
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    throw error;
  }
  await settled;
  return result;
}

export async function readAll(table) {
  return transact([table], "readonly", (tx) => promisify(tx.objectStore(table).getAll()));
}

export async function writeRows(entries) {
  if (entries.length === 0) return;
  const stamp = Date.now();
  const stores = [...new Set(entries.map((entry) => entry.table))];
  await transact([...stores, "outbox"], "readwrite", (tx) => {
    const outbox = tx.objectStore("outbox");
    for (const entry of entries) {
      const row = { ...entry.row, local_updated_at: stamp };
      tx.objectStore(entry.table).put(row);
      outbox.put({ table: entry.table, id: row.id, queued_at: stamp });
    }
  });
}

export async function applyRemote(changes) {
  const tables = Object.keys(changes).filter((table) => TABLES.includes(table) && changes[table].length > 0);
  if (tables.length === 0) return 0;
  return transact([...tables, "outbox"], "readwrite", async (tx) => {
    const outbox = tx.objectStore("outbox");
    let applied = 0;
    for (const table of tables) {
      const store = tx.objectStore(table);
      for (const row of changes[table]) {
        const pending = await promisify(outbox.get([table, row.id]));
        if (pending) continue;
        store.put(row);
        applied += 1;
      }
    }
    return applied;
  });
}

async function dropOutbox(entries) {
  await transact(["outbox"], "readwrite", (tx) => {
    const outbox = tx.objectStore("outbox");
    for (const entry of entries) outbox.delete([entry.table, entry.id]);
  });
}

export async function listOutbox(limit) {
  const stored = await transact(["outbox"], "readonly", (tx) => promisify(tx.objectStore("outbox").getAll()));
  const stale = stored.filter((entry) => !TABLES.includes(entry.table));
  if (stale.length > 0) await dropOutbox(stale);
  const entries = stored.filter((entry) => TABLES.includes(entry.table));
  const slice = entries.slice(0, limit);
  if (slice.length === 0) return { total: entries.length, items: [] };
  const stores = [...new Set(slice.map((entry) => entry.table))];
  const items = await transact(stores, "readonly", async (tx) => {
    const collected = [];
    for (const entry of slice) {
      const row = await promisify(tx.objectStore(entry.table).get(entry.id));
      if (row) collected.push({ table: entry.table, id: entry.id, queued_at: entry.queued_at, row });
    }
    return collected;
  });
  return { total: entries.length, items };
}

export async function clearOutbox(items) {
  if (items.length === 0) return;
  await transact(["outbox"], "readwrite", async (tx) => {
    const outbox = tx.objectStore("outbox");
    for (const item of items) {
      const current = await promisify(outbox.get([item.table, item.id]));
      if (current && current.queued_at === item.queued_at) outbox.delete([item.table, item.id]);
    }
  });
}

export async function countOutbox() {
  return transact(["outbox"], "readonly", (tx) => promisify(tx.objectStore("outbox").count()));
}

export async function getMeta(key, fallback) {
  const record = await transact(["meta"], "readonly", (tx) => promisify(tx.objectStore("meta").get(key)));
  return record ? record.value : fallback;
}

export async function setMeta(key, value) {
  await transact(["meta"], "readwrite", (tx) => {
    tx.objectStore("meta").put({ key, value });
  });
}

export async function snapshot() {
  const output = {};
  for (const table of TABLES) output[table] = await readAll(table);
  return output;
}
