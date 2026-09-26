import { locale, t, tn } from "./i18n.js";

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false || child === "") continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function svg(tag, props = {}, children = []) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) continue;
    node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

const ICON_PATHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  up: "M12 6.5l6 10H6z",
  down: "M12 17.5l-6-10h12z",
  close: "M7 7l10 10M17 7L7 17"
};

const SOLID_ICONS = new Set(["up", "down"]);

export function icon(name) {
  if (name === "more") {
    return svg("svg", { class: "icon solid", viewBox: "0 0 24 24", "aria-hidden": "true" }, [5, 12, 19].map((cx) => svg("circle", { cx, cy: 12, r: 1.9 })));
  }
  const kind = SOLID_ICONS.has(name) ? "icon solid trend" : "icon";
  return svg("svg", { class: kind, viewBox: "0 0 24 24", "aria-hidden": "true" }, svg("path", { d: ICON_PATHS[name] }));
}

export function searchField(props) {
  const { class: extra, ...rest } = props;
  const input = el("input", { type: "search", ...rest });
  return el("div", { class: extra ? `search-field ${extra}` : "search-field" }, [
    input,
    el(
      "button",
      {
        class: "search-clear",
        type: "button",
        "aria-label": t("clearSearch"),
        onclick: () => {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        }
      },
      icon("close")
    )
  ]);
}

export function clear(node) {
  while (node.firstChild) node.firstChild.remove();
  return node;
}

const formatters = new Map();

function dateFormatter(long) {
  const key = `${locale()}:${long}`;
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.DateTimeFormat(
        locale(),
        long
          ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
          : { weekday: "short", day: "numeric", month: "short" }
      )
    );
  }
  return formatters.get(key);
}

export function formatDate(iso, long = false) {
  return dateFormatter(long).format(new Date(`${iso}T00:00:00`));
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return String(rounded);
}

export function plural(count, key) {
  return tn(count, key);
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

export function toast(message) {
  const host = document.getElementById("toast-host");
  const node = el("div", { class: "toast", text: message });
  host.append(node);
  setTimeout(() => {
    node.classList.add("leaving");
    node.addEventListener("transitionend", () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 600);
  }, 2200);
}

export function openSheet(build, onClose) {
  const host = document.getElementById("sheet-host");
  const sheet = el("div", { class: "sheet" });
  const backdrop = el("div", { class: "sheet-backdrop" }, sheet);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.classList.add("closing");
    sheet.addEventListener("transitionend", (event) => {
      if (event.target === sheet) backdrop.remove();
    });
    setTimeout(() => backdrop.remove(), 700);
    document.removeEventListener("keydown", onKey);
    if (onClose) onClose();
  };
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener("keydown", onKey);
  append(sheet, build(close));
  host.append(backdrop);
  const focusable = sheet.querySelector("input, select, textarea, button");
  if (focusable && !matchMedia("(pointer: coarse)").matches) focusable.focus();
  return close;
}

export function confirmSheet(title, message, confirmLabel) {
  return new Promise((resolve) => {
    let answer = false;
    openSheet(
      (close) => [
        el("h2", { text: title }),
        el("p", { class: "muted", text: message }),
        el("div", { class: "row" }, [
          el("button", { class: "btn grow", type: "button", text: t("cancel"), onclick: close }),
          el("button", {
            class: "btn primary grow",
            type: "button",
            text: confirmLabel || t("delete"),
            onclick: () => {
              answer = true;
              close();
            }
          })
        ])
      ],
      () => resolve(answer)
    );
  });
}

export function stepper(value, step, min, onCommit, options = {}) {
  const input = el("input", {
    type: "text",
    inputMode: options.decimal ? "decimal" : "numeric",
    placeholder: "0",
    value: value === null || value === undefined ? "" : String(value),
    onchange: (event) => {
      const raw = event.target.value.replace(",", ".").trim();
      if (raw === "") return onCommit(null);
      const parsed = options.decimal ? Number(raw) : Math.round(Number(raw));
      onCommit(Number.isFinite(parsed) ? Math.max(min, parsed) : null);
    },
    onfocus: (event) => event.target.select()
  });
  const bump = (delta) => {
    const current = Number(input.value.replace(",", ".")) || 0;
    const next = Math.max(min, Math.round((current + delta) * 100) / 100);
    input.value = String(next);
    onCommit(next);
  };
  return el("div", { class: "stepper" }, [
    el("button", { type: "button", "aria-label": t("ariaDecrease"), onclick: () => bump(-step) }, icon("minus")),
    input,
    el("button", { type: "button", "aria-label": t("ariaIncrease"), onclick: () => bump(step) }, icon("plus"))
  ]);
}
