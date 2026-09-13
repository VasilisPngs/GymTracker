import { el, clear, formatDate, formatNumber, formatVolume, confirmSheet, openSheet, toast } from "../dom.js";
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
import { openExerciseCreator } from "./workout.js";
import { sparkline } from "../chart.js";
import { navigate } from "../router.js";

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
      listNode.append(el("div", { class: "empty", text: "Nothing here yet." }));
      return;
    }
    for (const exercise of matches) {
      const sessions = exerciseSessions(exercise.id);
      const last = sessions[sessions.length - 1];
      listNode.append(
        el("a", { class: "list-item", href: `/exercise/${exercise.id}`, "data-link": "" }, [
          el("span", { class: "grow" }, [
            el("div", { text: exercise.name }),
            el("div", {
              class: "tiny",
              text: last ? `Last ${formatDate(last.workout.performed_on)} · ${formatNumber(last.e1rm, 0)} kg e1RM` : "Never trained"
            })
          ]),
          el("span", { class: "badge", text: exercise.muscle_group })
        ])
      );
    }
  };

  container.append(
    el("div", { class: "row between" }, [
      el("h1", { text: "Exercises" }),
      el("button", {
        class: "btn small primary",
        type: "button",
        text: "+ New",
        onclick: () => openExerciseCreator("", () => toast("Exercise created"))
      })
    ]),
    el("input", {
      type: "search",
      placeholder: "Search",
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
          text: name,
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
    container.append(el("div", { class: "empty", text: "Exercise not found." }));
    return;
  }

  const sessions = exerciseSessions(exercise.id);
  const records = personalRecords(exercise.id);

  container.append(
    el("div", { class: "row between" }, [
      el("div", { class: "grow" }, [
        el("h1", { text: exercise.name }),
        el("div", { class: "tiny", text: `${exercise.muscle_group}${exercise.equipment ? ` · ${exercise.equipment}` : ""}` })
      ]),
      el("button", { class: "btn small ghost", type: "button", text: "···", onclick: () => openMenu(exercise) })
    ])
  );

  container.append(
    el("div", { class: "stat-grid" }, [
      el("div", { class: "stat" }, [el("b", { class: "num", text: formatNumber(records.bestE1rm, 0) }), el("span", { class: "tiny", text: "best e1RM kg" })]),
      el("div", { class: "stat" }, [
        el("b", { class: "num", text: records.heaviest ? formatNumber(records.heaviest.weight_kg) : "-" }),
        el("span", { class: "tiny", text: "heaviest kg" })
      ]),
      el("div", { class: "stat" }, [el("b", { class: "num", text: formatVolume(records.bestVolume) }), el("span", { class: "tiny", text: "best session kg" })]),
      el("div", { class: "stat" }, [el("b", { class: "num", text: String(records.sessions) }), el("span", { class: "tiny", text: "sessions" })])
    ])
  );

  if (sessions.length >= 2) {
    const chart = sparkline(sessions.map((session) => session.e1rm));
    container.append(
      el("div", { class: "card" }, [
        el("div", { class: "row between" }, [el("h2", { text: "Estimated 1RM" }), el("span", { class: "tiny", text: `${sessions.length} sessions` })]),
        chart
      ])
    );
  }

  if (sessions.length === 0) {
    container.append(el("div", { class: "empty", text: "No logged sets for this exercise." }));
    return;
  }

  container.append(el("h2", { text: "Sessions" }));
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
    el("h2", { text: "Exercise options" }),
    el("input", {
      type: "text",
      value: exercise.name,
      onchange: (event) => updateExercise(exercise.id, { name: event.target.value.trim() || exercise.name })
    }),
    el(
      "select",
      { onchange: (event) => updateExercise(exercise.id, { muscle_group: event.target.value }) },
      MUSCLE_GROUPS.map((item) => el("option", { value: item, text: item, selected: item === exercise.muscle_group }))
    ),
    el("button", {
      class: "btn block",
      type: "button",
      text: exercise.is_archived ? "Unarchive" : "Archive",
      onclick: () => {
        updateExercise(exercise.id, { is_archived: exercise.is_archived ? 0 : 1 });
        close();
      }
    }),
    el("button", {
      class: "btn block danger",
      type: "button",
      text: "Delete exercise",
      onclick: async () => {
        close();
        const confirmed = await confirmSheet("Delete exercise", "Logged sets stay in past workouts but the exercise disappears from the catalog.", "Delete");
        if (confirmed) {
          await deleteExercise(exercise.id);
          navigate("/exercises");
        }
      }
    })
  ]);
}
