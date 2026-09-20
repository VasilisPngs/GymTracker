import { el, toast } from "../dom.js";
import { exportData } from "../store.js";
import { t, language, languages, setLanguage } from "../i18n.js";
import { themeMode, themeModes, setTheme } from "../theme.js";

async function download() {
  const payload = await exportData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = el("a", { href: url, download: `gymtracker-${payload.exportedAt.slice(0, 10)}.json` });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(t("backupExported"));
}

export function renderSettings(container) {
  container.append(el("h1", { text: t("settingsTitle") }));

  container.append(
    el("div", { class: "card" }, [
      el("h2", { text: t("appearance") }),
      el("label", { class: "tiny", text: t("theme") }),
      el(
        "select",
        {
          onchange: (event) => {
            const next = event.target.value;
            event.target.blur();
            setTheme(next);
          }
        },
        themeModes().map((mode) =>
          el("option", {
            value: mode,
            text: t(`theme${mode[0].toUpperCase()}${mode.slice(1)}`),
            selected: mode === themeMode()
          })
        )
      ),
      el("label", { class: "tiny", text: t("language") }),
      el(
        "select",
        {
          onchange: (event) => {
            const next = event.target.value;
            event.target.blur();
            setLanguage(next);
          }
        },
        languages().map((code) =>
          el("option", { value: code, text: code === "el" ? "Ελληνικά" : "English", selected: code === language() })
        )
      )
    ])
  );

  container.append(
    el("div", { class: "card" }, [
      el("h2", { text: t("backup") }),
      el("button", { class: "btn block", type: "button", text: t("exportBackup"), onclick: download })
    ])
  );
}
