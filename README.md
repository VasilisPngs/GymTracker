# GymTracker

**English** · [Ελληνικά](#ελληνικά)

Single-user hypertrophy training log. Cloudflare Worker with static assets, D1 database,
offline-first PWA client, Cloudflare Access for authentication.

The interface ships in English and Greek. It follows the browser language on first run and
can be switched any time in Stats → Settings → Language; the choice is stored per device.
Exercise names, muscle groups, split days, equipment and all dates follow the selected
language, while the database keeps canonical English values.

## Architecture

```
Browser (PWA)                       Cloudflare edge
┌──────────────────────────┐        ┌───────────────────────────┐
│ IndexedDB  ← source of   │        │ Cloudflare Access (Google)│
│            truth for UI  │        │            ↓              │
│ outbox     ← queued      │  HTTPS │ Worker  /api/sync         │
│              mutations   │ ─────► │            ↓              │
│ Service Worker (shell)   │        │ D1 (SQLite)               │
└──────────────────────────┘        └───────────────────────────┘
```

The UI never waits for the network. Every read and write hits IndexedDB; the sync layer
drains an outbox to `/api/sync` whenever connectivity allows. Static assets are served
directly by the edge (free, no Worker invocation); the Worker only runs for `/api/*`.

## Data model

| Table | Purpose |
| --- | --- |
| `exercises` | Catalog: name, muscle group, equipment, archived flag |
| `workouts` | Session: date, title (split day), notes, started/finished timestamps |
| `workout_exercises` | Exercise inside a session, with ordering |
| `sets` | Reps, weight (kg), RIR, warm-up flag, completion timestamp, ordering |
| `sync_rev` | Single-row monotonic revision counter driving incremental pulls |

Every row carries a client-generated UUID, so offline writes have stable identity.
Deletes are soft (`deleted_at`) so other devices learn about them. There is no user
table and no ownership columns: authentication is handled entirely by Cloudflare Access.

## Sync protocol

`POST /api/sync` with `{ cursors, mutations }`:

- `mutations` are full-row upserts (`INSERT ... ON CONFLICT(id) DO UPDATE`), batched
  into multi-row statements sized to stay under D1's 100 bound parameters per query.
- The server bumps `sync_rev` once per request and stamps every written row with it.
- `cursors` is a per-table `{ rev, id }` position. The response returns rows after that
  position (ordered by `rev, id`), the next cursors, and `hasMore` for pagination.
- Conflict resolution is last-write-wins. Single user, so this is sufficient by design.

Client-side, a mutation is a row write plus an outbox entry keyed by `[table, id]`,
which coalesces repeated edits of the same row. Remote rows are never applied over a
row that still has a pending outbox entry.

## Setup

Prerequisites: Node.js 20+, a Cloudflare account, Wrangler authenticated
(`npx wrangler login`).

```sh
npm install
npx wrangler d1 create gymtracker
```

Copy the returned `database_id` into `wrangler.jsonc`, replacing `REPLACE_WITH_DATABASE_ID`.

```sh
npm run db:migrate:remote
npm run deploy
```

### Cloudflare Access

The Worker contains no login code. It rejects any request that does not carry the
`Cf-Access-Jwt-Assertion` header injected by Access, so protection must be enabled
before the app is usable:

1. Enable Zero Trust on the account (free plan covers up to 50 users).
2. Cloudflare dashboard → **Workers & Pages** → `gymtracker` → **Access** tab.
3. **Protect this Worker behind Access** → **All traffic**.
4. Authentication policy: Google login restricted to the owner's email address.
5. Session duration: up to one month.

Worker-level Access covers routes, custom domains, the `workers.dev` hostname and
previews in one policy. Preview URLs are disabled in `wrangler.jsonc` anyway.

## Free plan budget

Verified against Cloudflare documentation (September 2026):

| Resource | Free limit | This app |
| --- | --- | --- |
| Worker requests | 100,000/day | Only `/api/sync`; static assets are free and unmetered |
| Worker CPU | 10 ms/request | Sync is I/O bound; all analytics run in the browser |
| D1 rows read | 5,000,000/day | Incremental pulls return only changed rows |
| D1 rows written | 100,000/day | One row per logged set |
| D1 storage | 5 GB account / 500 MB per database | A set row is well under 100 bytes |
| D1 queries per invocation | 50 | Capped at 45 (1 revision bump + ≤40 upserts + 4 pulls) |
| D1 bound parameters per query | 100 | Batches chunked to ≤90 |
| Static asset files | 20,000 | 20 |

## Toolchain

Zero runtime dependencies: the browser and the Worker both run the source as
written, with no bundler, transpiler or framework in between.

Build tooling stays on the latest stable release: wrangler pinned to an exact
version in `package.json`, Node on the Active LTS line in `.nvmrc`. Stable
means the release line the upstream project supports for production, so Node
follows LTS rather than Current.

Clock times are always rendered on a 24-hour cycle (`hourCycle: "h23"`),
in every language, regardless of what the locale would pick by default.

## Local development

```sh
npm run db:migrate
npm run dev
```

Local requests bypass the Access check by hostname.

## Backup

Stats → Export backup writes a JSON snapshot of every table from the browser database,
so it costs nothing on the server and works offline.

---

## Ελληνικά

Προσωπικό ημερολόγιο προπόνησης για μυϊκή υπερτροφία, για έναν χρήστη. Τρέχει σε Cloudflare
Worker με static assets και βάση D1, με PWA που δουλεύει offline και προστασία από Cloudflare
Access. Δεν υπάρχει κώδικας σύνδεσης στην εφαρμογή.

**Γλώσσα:** η διεπαφή είναι στα αγγλικά και στα ελληνικά. Στην πρώτη εκτέλεση ακολουθεί τη
γλώσσα του browser και αλλάζει από Στατιστικά → Ρυθμίσεις → Γλώσσα. Μεταφράζονται και τα
ονόματα ασκήσεων, οι μυϊκές ομάδες, οι μέρες του split, ο εξοπλισμός και οι ημερομηνίες. Στη
βάση αποθηκεύονται πάντα οι αγγλικές τιμές, οπότε η αλλαγή γλώσσας δεν αγγίζει τα δεδομένα.

**Τι καταγράφει:** ασκήσεις (όνομα, μυϊκή ομάδα, εξοπλισμός), προπονήσεις (ημερομηνία, μέρα
split, σημειώσεις) και σετ (επαναλήψεις, κιλά, RIR, σήμανση ζεστάματος). Δείχνει την
προηγούμενη επίδοση σε κάθε άσκηση, εκτιμώμενο 1RM, εβδομαδιαίο όγκο και κύρια σετ ανά μυϊκή
ομάδα. Όλοι οι υπολογισμοί γίνονται στον browser, ώστε ο Worker να μένει κάτω από το όριο των
10 ms CPU.

**Offline:** το IndexedDB είναι η πηγή αλήθειας. Κάθε αλλαγή γράφεται τοπικά και μπαίνει σε
ουρά που αδειάζει μόλις υπάρξει δίκτυο, οπότε η καταγραφή σετ στο γυμναστήριο δουλεύει χωρίς
σήμα.

**Εγκατάσταση:**

```sh
npm install
npx wrangler login
npx wrangler d1 create gymtracker     # βάλε το database_id στο wrangler.jsonc
npm run db:migrate:remote
npm run deploy
```

**Cloudflare Access (υποχρεωτικό):** Workers & Pages → `gymtracker` → καρτέλα Access →
Protect this Worker behind Access → All traffic → πολιτική Google μόνο για το email σου →
διάρκεια συνεδρίας έως έναν μήνα. Χωρίς αυτό το `/api/sync` απαντάει 403 σε όλους.

**Στο κινητό:** άνοιξέ το στο Safari και Προσθήκη στην αρχική οθόνη, ώστε να εγκατασταθεί ως
PWA.
