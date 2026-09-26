# GymTracker

**English** · [Ελληνικά](#ελληνικά)

Single-user hypertrophy training log. Cloudflare Worker with static assets, D1 database,
offline-first PWA client, Cloudflare Access for authentication.

The interface ships in English and Greek. It follows the browser language on first run and
can be switched any time in Settings → Language; the choice is stored per device.
Muscle groups and all dates follow the selected language, while the database
keeps canonical English values.

## Architecture

```
Browser (PWA)                       Cloudflare edge
┌──────────────────────────┐        ┌───────────────────────────┐
│ IndexedDB  ← source of   │        │ Cloudflare Access         │
│            truth for UI  │        │            ↓              │
│ outbox     ← queued      │  HTTPS │ Worker  /api/sync         │
│              mutations   │ ─────► │            ↓              │
│ Service Worker (shell)   │        │ D1 (SQLite)               │
└──────────────────────────┘        └───────────────────────────┘
```

The UI never waits for the network. Every read and write hits IndexedDB; the sync layer
drains an outbox to `/api/sync` whenever connectivity allows: on a change, on coming
back online, and whenever the app returns to the foreground. Parent-to-child lookups
(a workout's exercises, an exercise's sets, a programme's plan) are served from indexes
rebuilt whenever the cache changes, so a screen costs the rows it draws rather than the
whole database. Static assets are served
directly by the edge (free, no Worker invocation); the Worker only runs for `/api/*`.

## Data model

| Table | Purpose |
| --- | --- |
| `exercises` | Catalog: name, muscle group |
| `workouts` | Session: date, title, notes, programme it came from, started/finished timestamps |
| `workout_exercises` | Exercise inside a session, with ordering and the rest before the next exercise |
| `sets` | Reps, weight (kg), warm-up flag, rest after the set, completion timestamp, ordering |
| `programs` | A reusable split: title, ordering |
| `program_exercises` | Planned exercise in a programme, with target sets, reps, weight and rest |
| `errors` | What the browser reported went wrong, kept for thirty days |
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

Prerequisites: Node on the version in `.nvmrc`, a Cloudflare account, Wrangler
authenticated (`npx wrangler login`).

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

The Worker contains no login code. It verifies the token Access issues: the assertion
header or the `CF_Authorization` cookie is parsed, checked against the team's published
RS256 keys, and rejected unless the signature, the issuer, the audience tag and the
expiry all hold. The keys are fetched once an hour and re-fetched on an unknown key id;
if they cannot be fetched at all the Worker answers 503 rather than guessing. The team
domain and the audience tag live in `vars` in `wrangler.jsonc`. Access still stands in
front of the hostname, so this is the second lock, not the first:

1. Enable Zero Trust on the account (free plan covers up to 50 users).
2. Self-hosted application `GymTracker` for `gymtracker.<subdomain>.workers.dev`, with its own Allow
   policy `GymTracker` (the owner's email address) and a session of one month. Its audience tag
   goes into `ACCESS_AUD` in `wrangler.jsonc`.
3. Self-hosted application `GymTracker public` for the same hostname with path `icons`, with its
   own Bypass policy `GymTracker public` for Everyone. iOS fetches the home-screen icon without
   the Access cookie; behind Access it would get the login page and draw a letter instead.

Access sits on the hostname rather than on the Worker: Worker-level Access is checked after
any path rule and cannot be bypassed, so the icons would stay locked. No policy is shared
with the other apps.

## Free plan budget

Verified against Cloudflare documentation (September 2026):

| Resource | Free limit | This app |
| --- | --- | --- |
| Worker requests | 100,000/day | Only `/api/sync`; static assets are free and unmetered |
| Worker CPU | 10 ms/request | Sync is I/O bound; all analytics run in the browser |
| D1 rows read | 5,000,000/day | Incremental pulls return only changed rows |
| D1 rows written | 100,000/day | One row per logged set |
| D1 storage | 5 GB account / 500 MB per database | A set row is well under 100 bytes |
| D1 queries per invocation | 50 | Capped at 47 (1 revision bump + ≤40 upserts + 6 pulls) |
| D1 bound parameters per query | 100 | Batches chunked to ≤90 |
| Static asset files | 20,000 | 28 |

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

Settings → Export backup writes a JSON snapshot of every table from the browser database,
so it costs nothing on the server and works offline. It is for taking the data elsewhere;
recovery rests on D1 itself: deletes are soft, so deleted rows stay in the database, and
Time Travel restores the whole database to any minute of the last 7 days on the Free plan
(30 on Workers Paid).

---

## Ελληνικά

Προσωπικό ημερολόγιο προπόνησης για μυϊκή υπερτροφία, για έναν χρήστη. Τρέχει σε Cloudflare
Worker με static assets και βάση D1, με PWA που δουλεύει offline και προστασία από Cloudflare
Access. Δεν υπάρχει κώδικας σύνδεσης στην εφαρμογή.

**Γλώσσα:** η διεπαφή είναι στα αγγλικά και στα ελληνικά. Στην πρώτη εκτέλεση ακολουθεί τη
γλώσσα του browser και αλλάζει από Ρυθμίσεις → Γλώσσα. Μεταφράζονται οι μυϊκές ομάδες και
οι ημερομηνίες. Στη βάση αποθηκεύονται πάντα οι αγγλικές τιμές, οπότε η
αλλαγή γλώσσας δεν αγγίζει τα δεδομένα.

**Τι καταγράφει:** ασκήσεις (όνομα, μυϊκή ομάδα), προγράμματα με στόχους ανά άσκηση,
προπονήσεις (ημερομηνία, τίτλος, σημειώσεις, διάρκεια) και σετ (επαναλήψεις, κιλά, σήμανση
ζεστάματος, διάλειμμα). Το Ιστορικό δείχνει όλες τις προπονήσεις ανά μήνα, με όσες έμειναν
ανολοκλήρωτες σημαδεμένες. Δείχνει την προηγούμενη επίδοση σε κάθε άσκηση, τα ρεκόρ της,
τον εβδομαδιαίο όγκο και τα κύρια σετ ανά μυϊκή ομάδα. Όλοι οι υπολογισμοί γίνονται στον browser, ώστε ο
Worker να μένει κάτω από το όριο των 10 ms CPU.

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

**Cloudflare Access (υποχρεωτικό):** self-hosted εφαρμογή `GymTracker` για το
`gymtracker.<subdomain>.workers.dev` με δική της πολιτική Allow `GymTracker` (μόνο το email σου) και
συνεδρία ενός μήνα· το audience tag της μπαίνει στο `ACCESS_AUD`. Δεύτερη εφαρμογή
`GymTracker public` με path `icons` και δική της πολιτική Bypass `GymTracker public`, για να κατεβάζει
το iOS το εικονίδιο της αρχικής οθόνης. Καμία πολιτική δεν μοιράζεται με τις άλλες εφαρμογές. Ο Worker επαληθεύει και ο ίδιος την υπογραφή του token,
οπότε χωρίς Access το `/api/sync` απαντάει 403 σε όλους.

**Αντίγραφο:** Ρυθμίσεις → Εξαγωγή αντιγράφου, για μεταφορά των δεδομένων αλλού. Η ανάκτηση
στηρίζεται στη D1: οι διαγραφές είναι soft και οι γραμμές μένουν στη βάση, και το Time Travel
επαναφέρει ολόκληρη τη βάση σε οποιοδήποτε λεπτό των τελευταίων 7 ημερών (30 στο Workers Paid).

**Στο κινητό:** άνοιξέ το στο Safari και Προσθήκη στην αρχική οθόνη, ώστε να εγκατασταθεί ως
PWA.
