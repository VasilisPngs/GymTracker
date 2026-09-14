import { el, plural } from "../dom.js";
import { MUSCLE_GROUPS, weeklyBreakdown } from "../store.js";
import { t, muscleGroupName } from "../i18n.js";

function streakWeeks(buckets) {
  let streak = 0;
  for (let index = buckets.length - 1; index >= 0; index -= 1) {
    if (buckets[index].workouts > 0) streak += 1;
    else if (index !== buckets.length - 1) break;
  }
  return streak;
}

export function renderStats(container) {
  const buckets = weeklyBreakdown(8);
  const current = buckets[buckets.length - 1];

  container.append(el("h1", { text: t("statsTitle") }));

  container.append(
    el("div", { class: "stat-grid" }, [
      el("div", { class: "stat" }, [el("b", { class: "num", text: String(current.workouts) }), el("span", { class: "tiny", text: t("workoutsThisWeek") })]),
      el("div", { class: "stat" }, [el("b", { class: "num", text: String(current.sets) }), el("span", { class: "tiny", text: t("workingSetsLabel") })]),
      el("div", { class: "stat" }, [el("b", { class: "num", text: String(streakWeeks(buckets)) }), el("span", { class: "tiny", text: t("weekStreak") })])
    ])
  );

  const muscleRows = MUSCLE_GROUPS.map((group) =>
    el("div", { class: "row between" }, [
      el("span", { text: muscleGroupName(group) }),
      el("span", { class: "num", text: String(current.byMuscle[group] || 0) })
    ])
  );

  container.append(
    el("div", { class: "card" }, [
      el("div", { class: "row between" }, [el("h2", { text: t("setsPerMuscle") }), el("span", { class: "tiny", text: t("thisWeek") })]),
      ...muscleRows
    ])
  );

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
