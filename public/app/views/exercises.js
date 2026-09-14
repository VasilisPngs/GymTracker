import { el, formatDate, formatNumber, plural, confirmSheet, openSheet, toast } from "../dom.js";
import {
  MUSCLE_GROUPS,
  byId,
  exerciseSessions,
  personalRecords,
  updateExercise,
  deleteExercise,
  describeSets
} from "../store.js";
import { sparkline } from "../chart.js";
import { navigate } from "../router.js";
import { t, muscleGroupName } from "../i18n.js";

export function renderExerciseDetail(container, params) {
  const exercise = byId("exercises", params.id);
  if (!exercise) {
    container.append(el("div", { class: "empty", text: t("exerciseNotFound") }));
    return;
  }

  const sessions = exerciseSessions(exercise.id);
  const records = personalRecords(exercise.id);

  container.append(
    el("div", { class: "row between" }, [
      el("div", { class: "grow" }, [
        el("h1", { text: exercise.name }),
        el("div", {
          class: "tiny",
          text: muscleGroupName(exercise.muscle_group)
        })
      ]),
      el("button", { class: "btn small ghost", type: "button", text: "···", onclick: () => openMenu(exercise) })
    ])
  );

  container.append(
    el("div", { class: "stat-grid" }, [
      el("div", { class: "stat" }, [el("b", { class: "num", text: formatNumber(records.bestE1rm, 0) }), el("span", { class: "tiny", text: t("bestE1rm") })]),
      el("div", { class: "stat" }, [
        el("b", { class: "num", text: records.heaviest ? formatNumber(records.heaviest.weight_kg) : "-" }),
        el("span", { class: "tiny", text: t("heaviest") })
      ]),
      el("div", { class: "stat" }, [el("b", { class: "num", text: String(records.sessions) }), el("span", { class: "tiny", text: t("sessionsLabel") })])
    ])
  );

  if (sessions.length >= 2) {
    const chart = sparkline(sessions.map((session) => session.e1rm));
    container.append(
      el("div", { class: "card" }, [
        el("div", { class: "row between" }, [el("h2", { text: t("estimated1rm") }), el("span", { class: "tiny", text: plural(sessions.length, "session") })]),
        chart
      ])
    );
  }

  if (sessions.length === 0) {
    container.append(el("div", { class: "empty", text: t("noLoggedSets") }));
    return;
  }

  container.append(el("h2", { text: t("sessionsHeading") }));
  const list = el("div", { class: "list" });
  for (const session of [...sessions].reverse()) {
    list.append(
      el("a", { class: "list-item", href: `/workout/${session.workout.id}`, "data-link": "" }, [
        el("span", { class: "grow" }, [
          el("div", { text: formatDate(session.workout.performed_on, true) }),
          el("div", { class: "tiny", text: describeSets(session.sets) })
        ]),
        el("span", { class: "tiny num", style: "text-align:right", text: `${formatNumber(session.e1rm, 0)} e1RM` })
      ])
    );
  }
  container.append(list);
}

function openMenu(exercise) {
  openSheet((close) => [
    el("h2", { text: t("exerciseOptions") }),
    el("input", {
      type: "text",
      value: exercise.name,
      onchange: (event) => updateExercise(exercise.id, { name: event.target.value.trim() || exercise.name })
    }),
    el(
      "select",
      { onchange: (event) => updateExercise(exercise.id, { muscle_group: event.target.value }) },
      MUSCLE_GROUPS.map((item) => el("option", { value: item, text: muscleGroupName(item), selected: item === exercise.muscle_group }))
    ),
    el("button", {
      class: "btn block",
      type: "button",
      text: exercise.is_archived ? t("unarchive") : t("archive"),
      onclick: () => {
        updateExercise(exercise.id, { is_archived: exercise.is_archived ? 0 : 1 });
        close();
      }
    }),
    el("button", {
      class: "btn block danger",
      type: "button",
      text: t("deleteExercise"),
      onclick: async () => {
        close();
        const confirmed = await confirmSheet(t("deleteExercise"), t("deleteExerciseBody"), t("delete"));
        if (confirmed) {
          await deleteExercise(exercise.id);
          navigate("/exercises");
        }
      }
    })
  ]);
}
