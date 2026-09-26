import { el, formatDay, formatDuration, plural } from "../dom.js";
import { workoutsSorted, workoutExercises, workingSets } from "../store.js";
import { t, locale } from "../i18n.js";
import { isRunning } from "./workout.js";

function status(workout) {
  if (workout.finished_at) {
    return workout.started_at
      ? el("span", { class: "tiny num", text: formatDuration((workout.finished_at - workout.started_at) / 1000) })
      : null;
  }
  return isRunning(workout)
    ? el("span", { class: "badge live", text: t("inProgress") })
    : el("span", { class: "badge", text: t("unfinished") });
}

function workoutRow(workout) {
  const links = workoutExercises(workout.id);
  let sets = 0;
  for (const link of links) sets += workingSets(link.id).length;
  return el("a", { class: "list-item", href: `/workout/${workout.id}`, "data-link": "" }, [
    el("span", { class: "grow" }, [
      el("div", { class: "history-title", text: workout.title || t("tabWorkout") }),
      el("div", { class: "tiny", text: [formatDay(workout.performed_on), plural(links.length, "exercise"), plural(sets, "workingSet")].map((part) => part.replace(/ /g, "\u00a0")).join(" · ") })
    ]),
    status(workout)
  ]);
}

export function renderHistory(container) {
  container.append(el("div", { class: "list-bar" }, [el("h1", { text: t("tabHistory") })]));

  const workouts = workoutsSorted();
  if (workouts.length === 0) {
    container.append(el("div", { class: "empty", text: t("noWorkoutsYet") }));
    return;
  }

  const month = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" });
  let key = null;
  let list = null;
  for (const workout of workouts) {
    const current = workout.performed_on.slice(0, 7);
    if (current !== key) {
      key = current;
      list = el("div", { class: "list" });
      const label = month.format(new Date(`${current}-01T00:00:00`));
      container.append(el("div", { class: "card" }, [el("h2", { text: label.charAt(0).toLocaleUpperCase(locale()) + label.slice(1) }), list]));
    }
    list.append(workoutRow(workout));
  }
}
