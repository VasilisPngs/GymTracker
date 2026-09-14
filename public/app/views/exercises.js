import { el, clear, formatDate, formatNumber, formatVolume, plural, confirmSheet, openSheet, toast } from "../dom.js";
import {
  MUSCLE_GROUPS,
  byId,
  exercisesSorted,
  exerciseSessions,
  personalRecords,
  updateExercise,
  deleteExercise,
  describeSets
} from "../store.js";
import { openExerciseCreator } from "./picker.js";
import { sparkline } from "../chart.js";
import { navigate } from "../router.js";
import { t, muscleGroupName, equipmentName, exerciseName } from "../i18n.js";

export function renderExercises(container) {
  let query = "";
  let group = "";
  const listNode = el("div", { class: "list" });

  const paint = () => {
    clear(listNode);
    const matches = exercisesSorted().filter((exercise) => {
      const matchesGroup = !group || exercise.muscle_group === group;
      const matchesQuery = !query || exercise.name.toLowerCase().includes(query.toLowerCase());
      return matchesGroup && matchesQuery;
    });
    if (matches.length === 0) {
      listNode.append(el("div", { class: "empty", text: t("nothingHere") }));
      return;
    }
    for (const exercise of matches) {
      const sessions = exerciseSessions(exercise.id);
      const last = sessions[sessions.length - 1];
      listNode.append(
        el("a", { class: "list-item", href: `/exercise/${exercise.id}`, "data-link": "" }, [
          el("span", { class: "grow" }, [
            el("div", { text: exerciseName(exercise.name) }),
            el("div", {
              class: "tiny",
              text: last
                ? t("lastWithE1rm", { date: formatDate(last.workout.performed_on), value: formatNumber(last.e1rm, 0) })
                : t("neverTrained")
            })
          ]),
          el("span", { class: "badge", text: muscleGroupName(exercise.muscle_group) })
        ])
      );
    }
  };

  container.append(
    el("div", { class: "row between" }, [
      el("h1", { text: t("exercisesTitle") }),
      el("button", {
        class: "btn small primary",
        type: "button",
        text: t("newShort"),
        onclick: () => openExerciseCreator("", () => toast(t("exerciseCreated")))
      })
    ]),
    el("input", {
      type: "search",
      placeholder: t("search"),
      oninput: (event) => {
        query = event.target.value;
        paint();
      }
    }),
    el(
      "div",
      { class: "chips" },
      ["All", ...MUSCLE_GROUPS].map((name) =>
        el("button", {
          class: "chip",
          type: "button",
          text: name === "All" ? t("all") : muscleGroupName(name),
          "aria-pressed": (name === "All" && group === "") || name === group ? "true" : "false",
          onclick: (event) => {
            group = name === "All" ? "" : name;
            for (const chip of event.target.parentElement.children) chip.setAttribute("aria-pressed", "false");
            event.target.setAttribute("aria-pressed", "true");
            paint();
          }
        })
      )
    ),
    listNode
  );

  paint();
}

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
        el("h1", { text: exerciseName(exercise.name) }),
        el("div", {
          class: "tiny",
          text: `${muscleGroupName(exercise.muscle_group)}${exercise.equipment ? ` · ${equipmentName(exercise.equipment)}` : ""}`
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
      el("div", { class: "stat" }, [el("b", { class: "num", text: formatVolume(records.bestVolume) }), el("span", { class: "tiny", text: t("bestSession") })]),
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
        el("span", { class: "tiny num", style: "text-align:right" }, [
          el("div", { text: `${formatNumber(session.e1rm, 0)} e1RM` }),
          el("div", { text: `${formatVolume(session.volume)} kg` })
        ])
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
