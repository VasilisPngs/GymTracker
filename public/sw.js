const VERSION = "v49";
const CACHE = `gymtracker-${VERSION}`;

const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/app/styles.css",
  "/app/main.js",
  "/app/db.js",
  "/app/sync.js",
  "/app/store.js",
  "/app/router.js",
  "/app/dom.js",
  "/app/i18n.js",
  "/app/theme.js",
  "/app/report.js",
  "/app/shell.js",
  "/app/chart.js",
  "/app/timer.js",
  "/app/views/workout.js",
  "/app/views/exercises.js",
  "/app/views/stats.js",
  "/app/views/settings.js",
  "/app/views/programs.js",
  "/app/views/picker.js",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "skip_waiting") self.skipWaiting();
});

async function staleWhileRevalidate(event, cacheKey) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(cacheKey);
  const network = fetch(event.request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") cache.put(cacheKey, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const response = await network;
  return response || new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.searchParams.has("signin")) return;
  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(event, "/"));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, request));
});

const REPORT_LIMIT = 3;
let reported = 0;

function report(kind, message, detail) {
  const text = String(message == null ? "" : message).slice(0, 300).trim();
  if (!text || reported >= REPORT_LIMIT) return;
  reported += 1;
  fetch("/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, message: text, stack: String(detail || "").slice(0, 1000), route: "/sw" })
  }).catch(() => {});
}

self.addEventListener("error", (event) => {
  report("sw-error", event.message, `${event.filename}:${event.lineno}`);
});

self.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  report("sw-rejection", reason && reason.message ? reason.message : String(reason), reason && reason.stack);
});
