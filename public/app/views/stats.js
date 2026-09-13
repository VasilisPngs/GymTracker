import { el, formatVolume, plural, toast } from "../dom.js";
import { MUSCLE_GROUPS, weeklyBreakdown, exportData } from "../store.js";
import { sparkline } from "../chart.js";
import { restSeconds, setRestSeconds } from "../timer.js";

const REFERENCE_SETS = 20;

function streakWeeks(buckets) {
  let streak = 0;
  for (let index = buckets.length - 1; index >= 0; index -= 1) {
    if (buckets[index].workouts > 0) streak += 1;
    else if (index !== buckets.length - 1) break;
  }
  return streak;
}

async function download() {
  const payload = await exportData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = el("a", { href: url, download: `gymtracker-${payload.exportedAt.slice(0, 10)}.json` });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup exported");
}

export function renderStats(container) {
  const buckets = weeklyBreakdown(8);
  const current = buckets[buckets.length - 1];

  container.append(el("h1", { text: "Stats" }));

  container.append(
    el("div", { class: "stat-grid" }, [
      el("div", { class: "stat" }, [el("b", { class: "num", text: String(current.workouts) }), el("span", { class: "tiny", text: "workouts this week" })]),
      el("div", { class: "stat" }, [el("b", { class: "num", text: String(current.sets) }), el("span", { class: "tiny", text: "working sets" })]),
      el("div", { class: "stat" }, [el("b", { class: "num", text: formatVolume(current.volume) }), el("span", { class: "tiny", text: "kg volume" })]),
      el("div", { class: "stat" }, [el("b", { class: "num", text: String(streakWeeks(buckets)) }), el("span", { class: "tiny", text: "week streak" })])
    ])
  );

  const volumes = buckets.map((bucket) => bucket.volume);
  if (volumes.some((value) => value > 0)) {
    container.append(
      el("div", { class: "card" }, [
        el("div", { class: "row between" }, [el("h2", { text: "Weekly volume" }), el("span", { class: "tiny", text: "last 8 weeks" })]),
        sparkline(volumes),
        el("div", { class: "row between tiny" }, [
          el("span", { text: `${formatVolume(Math.min(...volumes))} kg` }),
          el("span", { text: `${formatVolume(Math.max(...volumes))} kg` })
        ])
      ])
    );
  }

  const muscleRows = MUSCLE_GROUPS.map((group) => {
    const value = current.byMuscle[group] || 0;
    const ratio = Math.min(1, value / REFERENCE_SETS);
    return el("div", { class: "bar-row" }, [
      el("span", { text: group }),
      el("div", { class: "bar" }, el("span", { style: `width:${(ratio * 100).toFixed(1)}%` })),
      el("span", { class: "num", style: "text-align:right", text: String(value) })
    ]);
  });

  container.append(
    el("div", { class: "card" }, [
      el("div", { class: "row between" }, [el("h2", { text: "Sets per muscle" }), el("span", { class: "tiny", text: "this week" })]),
      ...muscleRows,
      el("div", { class: "tiny", text: `Bar is full at ${REFERENCE_SETS} hard sets per week.` })
    ])
  );

  container.append(
    el("div", { class: "card" }, [
      el("h2", { text: "Previous weeks" }),
      ...buckets
        .slice(0, -1)
        .reverse()
        .map((bucket) =>
          el("div", { class: "row between tiny" }, [
            el("span", { text: bucket.key }),
            el("span", { class: "num", text: `${plural(bucket.workouts, "session")} · ${plural(bucket.sets, "set")} · ${formatVolume(bucket.volume)} kg` })
          ])
        )
    ])
  );

  container.append(
    el("div", { class: "card" }, [
      el("h2", { text: "Settings" }),
      el("label", { class: "tiny", text: "Default rest timer (seconds)" }),
      el("input", {
        type: "number",
        min: "15",
        step: "15",
        value: String(restSeconds()),
        onchange: (event) => {
          setRestSeconds(Number(event.target.value));
          toast("Rest timer updated");
        }
      }),
      el("button", { class: "btn block", type: "button", text: "Export backup (JSON)", onclick: download })
    ])
  );
}
