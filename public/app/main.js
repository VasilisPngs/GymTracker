import { el, clear } from "./dom.js";
import { startShell, scrollViewTop } from "./shell.js";
import { initStore, storeEvents } from "./store.js";
import { startSync, syncEvents, getSyncState, requestSync } from "./sync.js";
import { currentRoute, startRouter } from "./router.js";
import { renderWorkout } from "./views/workout.js";
import { renderExerciseDetail } from "./views/exercises.js";
import { renderStats } from "./views/stats.js";
import { renderSettings } from "./views/settings.js";
import { t, applyLanguage, i18nEvents } from "./i18n.js";
import { applyTheme, themeEvents } from "./theme.js";

const view = document.getElementById("view");
const pill = document.getElementById("sync-pill");
const tabs = [...document.querySelectorAll(".tab")];

const VIEWS = {
  workout: renderWorkout,
  exercise: renderExerciseDetail,
  stats: renderStats,
  settings: renderSettings
};

const TAB_LABELS = { workout: "tabTrain", stats: "tabStats", settings: "tabSettings" };

const TAB_FOR_ROUTE = {
  workout: "workout",
  exercise: "workout",
  stats: "stats",
  settings: "settings"
};

let lastRouteKey = "";
let deferredRender = false;
let banner = null;

function isEditing() {
  const active = document.activeElement;
  return Boolean(active) && view.contains(active) && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
}

function render() {
  if (isEditing()) {
    deferredRender = true;
    return;
  }
  deferredRender = false;
  const route = currentRoute();
  const key = `${route.name}:${route.params.id || ""}`;
  for (const tab of tabs) {
    tab.setAttribute("aria-current", tab.dataset.route === TAB_FOR_ROUTE[route.name] ? "page" : "false");
    const label = tab.querySelector("span");
    if (label) label.textContent = t(TAB_LABELS[tab.dataset.route]);
  }
  clear(view);
  (VIEWS[route.name] || renderWorkout)(view, route.params);
  if (key !== lastRouteKey) {
    lastRouteKey = key;
    view.classList.remove("enter");
    void view.offsetWidth;
    view.classList.add("enter");
    scrollViewTop();
  }
}

function paintPill() {
  const state = getSyncState();
  let status = "idle";
  let label = t("statusSynced");
  if (state.status === "auth") {
    status = "auth";
    label = t("statusSignIn");
  } else if (state.status === "syncing") {
    status = "syncing";
    label = t("statusSyncing");
  } else if (state.status === "offline") {
    status = "offline";
    label = state.pending > 0 ? `${t("statusOffline")} · ${state.pending}` : t("statusOffline");
  } else if (state.status === "error") {
    status = "error";
    label = t("statusRetry");
  } else if (state.pending > 0) {
    status = "pending";
    label = `${t("statusQueued")} · ${state.pending}`;
  }
  pill.dataset.status = status;
  pill.textContent = label;
  paintBanner(state);
}

function paintBanner(state) {
  if (state.status === "auth" && !banner) {
    banner = el("div", { class: "banner" }, [
      el("span", { text: t("sessionExpired") }),
      el("button", { class: "btn small", type: "button", text: t("statusSignIn"), onclick: signIn })
    ]);
    view.before(banner);
  }
  if (state.status !== "auth" && banner) {
    banner.remove();
    banner = null;
  }
}

function signIn() {
  location.href = `/?signin=${Date.now()}`;
}

const UPDATE_CHECK_MS = 900000;

function watchServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").then((registration) => {
    let checkedAt = Date.now();
    addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || Date.now() - checkedAt < UPDATE_CHECK_MS) return;
      checkedAt = Date.now();
      registration.update().catch(() => {});
    });
  });
}

view.addEventListener("focusout", () => {
  setTimeout(() => {
    if (deferredRender && !isEditing()) render();
  }, 0);
});

pill.addEventListener("click", () => {
  if (getSyncState().status === "auth") signIn();
  else requestSync();
});

async function boot() {
  startShell();
  if (new URL(location.href).searchParams.has("signin")) history.replaceState({}, "", location.pathname);
  applyLanguage();
  applyTheme();
  await initStore();
  storeEvents.addEventListener("changed", render);
  i18nEvents.addEventListener("changed", () => {
    render();
    paintPill();
  });
  themeEvents.addEventListener("changed", render);
  syncEvents.addEventListener("state", paintPill);
  startRouter(render);
  paintPill();
  await startSync();
  watchServiceWorker();
}

boot().catch((error) => {
  clear(view);
  view.append(
    el("div", { class: "empty" }, [
      el("p", { text: String(error && error.message) === "database_blocked" ? t("storageBlocked") : t("storageFailed") }),
      el("button", { class: "btn primary", type: "button", text: t("reload"), onclick: () => location.reload() })
    ])
  );
});
