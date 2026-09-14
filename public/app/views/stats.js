import { el, clear, formatNumber, plural } from "../dom.js";
import { MUSCLE_GROUPS, list, weeklyBreakdown, exerciseSessions } from "../store.js";
import { t, muscleGroupName } from "../i18n.js";

function progressRows() {
  const rows = [];
  for (const exercise of list("exercises")) {
    const sessions = exerciseSessions(exercise.id);
    if (sessions.length === 0) continue;
    const last = sessions[sessions.length - 1];
    const previous = sessions.length > 1 ? sessions[sessions.length - 2] : null;
    const weight = last.best ? last.best.weight_kg : 0;
    const before = previous && previous.best ? previous.best.weight_kg : null;
    rows.push({
      exercise,
      weight,
      reps: last.best ? last.best.reps : 0,
      performed_on: last.workout.performed_on,
      trend: before === null || weight === before ? "" : weight > before ? "▲" : "▼"
    });
  }
  return rows.sort((a, b) => (a.performed_on < b.performed_on ? 1 : a.performed_on > b.performed_on ? -1 : 0));
}

export function renderStats(container) {
  const buckets = weeklyBreakdown(8);
  const current = buckets[buckets.length - 1];
  const previous = buckets[buckets.length - 2];

  container.append(el("h1", { text: t("statsTitle") }));

  container.append(
    el("div", { class: "stat-grid" }, [
      el("div", { class: "stat" }, [
        el("b", { class: "num", text: String(current.workouts) }),
        el("span", { class: "tiny", text: t("workoutsThisWeek") })
      ]),
      el("div", { class: "stat" }, [
        el("b", { class: "num", text: String(current.sets) }),
        el("span", { class: "tiny", text: t("workingSetsLabel") })
      ])
    ])
  );

  container.append(
    el("div", {
      class: "tiny",
      text: t("lastWeekWas", { sessions: plural(previous.workouts, "session"), sets: plural(previous.sets, "set") })
    })
  );

  const muscles = MUSCLE_GROUPS.map((group) => ({
    group,
    value: current.byMuscle[group] || 0,
    before: previous.byMuscle[group] || 0
  }))
    .filter((row) => row.value > 0 || row.before > 0)
    .sort((a, b) => b.value - a.value || b.before - a.before);

  if (muscles.length > 0) {
    container.append(
      el("div", { class: "card" }, [
        el("div", { class: "row between" }, [
          el("h2", { text: t("setsPerMuscle") }),
          el("span", { class: "tiny", text: t("thisWeek") })
        ]),
        ...muscles.map((row) =>
          el("div", { class: "row between" }, [
            el("span", { text: muscleGroupName(row.group) }),
            el("span", { class: "num" }, [
              el("span", { text: String(row.value) }),
              el("span", { class: "tiny", text: ` (${row.before})` })
            ])
          ])
        )
      ])
    );
  }

  const progress = progressRows();
  if (progress.length > 0) {
    const listNode = el("div", { class: "list" });
    let query = "";
    const paint = () => {
      clear(listNode);
      const needle = query.trim().toLowerCase();
      const matches = progress.filter((row) => !needle || row.exercise.name.toLowerCase().includes(needle));
      if (matches.length === 0) {
        listNode.append(el("div", { class: "empty", text: t("noExerciseMatch") }));
        return;
      }
      for (const row of matches.slice(0, 40)) {
        listNode.append(
          el("a", { class: "list-item", href: `/exercise/${row.exercise.id}`, "data-link": "" }, [
            el("span", { class: "grow" }, [
              el("div", { text: row.exercise.name }),
              el("div", { class: "tiny", text: muscleGroupName(row.exercise.muscle_group) })
            ]),
            el("span", { class: "tiny num", style: "text-align:right" }, [
              el("div", { text: `${formatNumber(row.weight)} kg × ${row.reps} ${row.trend}`.trim() })
            ])
          ])
        );
      }
    };
    paint();

    container.append(
      el("div", { class: "card" }, [
        el("h2", { text: t("progressPerExercise") }),
        el("input", {
          type: "search",
          placeholder: t("searchExercises"),
          oninput: (event) => {
            query = event.target.value;
            paint();
          }
        }),
        listNode
      ])
    );
  }

  container.append(
    el("div", { class: "card" }, [
      el("h2", { text: t("previousWeeks") }),
      ...buckets
        .slice(0, -1)
        .reverse()
        .map((bucket) =>
          el("div", { class: "row between tiny" }, [
            el("span", { text: bucket.key }),
            el("span", { class: "num", text: `${plural(bucket.workouts, "session")} · ${plural(bucket.sets, "set")}` })
          ])
        )
    ])
  );
}
