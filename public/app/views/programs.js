import { el, plural, stepper, openSheet, confirmSheet, toast } from "../dom.js";
import { t, muscleGroupName, relativeDay } from "../i18n.js";
import {
  byId,
  storeEvents,
  programsSorted,
  lastTrained,
  programExercises,
  createProgram,
  updateProgram,
  deleteProgram,
  addProgramExercise,
  updateProgramExercise,
  removeProgramExercise,
  moveProgramExercise,
  startWorkoutFromProgram
} from "../store.js";
import { openExercisePicker } from "./picker.js";
import { navigate } from "../router.js";

export function programSummary(program) {
  const items = programExercises(program.id);
  const sets = items.reduce((total, item) => total + (item.target_sets || 0), 0);
  return { exercises: items.length, sets };
}

export async function startProgram(programId) {
  const workout = await startWorkoutFromProgram(programId);
  if (workout) navigate(`/workout/${workout.id}`);
}

export function openProgramCreator() {
  let name = "";
  openSheet((close) => [
    el("h2", { text: t("newProgram").replace("+ ", "") }),
    el("input", {
      type: "text",
      placeholder: t("programNamePlaceholder"),
      oninput: (event) => {
        name = event.target.value;
      },
      onkeydown: (event) => {
        if (event.key === "Enter") event.target.blur();
      }
    }),
    el("button", {
      class: "btn primary block",
      type: "button",
      text: t("create"),
      onclick: async () => {
        if (!name.trim()) return toast(t("nameRequired"));
        const program = await createProgram(name.trim());
        rememberActive(program.id);
        storeEvents.dispatchEvent(new CustomEvent("changed"));
        close();
      }
    })
  ]);
}

function field(label, control) {
  return el("label", { class: "field" }, [el("span", { class: "tiny", text: label }), control]);
}

function programRow(item) {
  const exercise = byId("exercises", item.exercise_id);
  if (!exercise) return null;
  return el("section", { class: "exercise-block" }, [
    el("div", { class: "exercise-head" }, [
      el("div", { class: "grow" }, [
        el("div", { class: "exercise-title", text: exercise.name }),
        el("div", { class: "tiny" }, [el("span", { class: "badge", text: muscleGroupName(exercise.muscle_group) })])
      ]),
      el("button", {
        class: "btn icon ghost",
        type: "button",
        text: "···",
        "aria-label": t("ariaExerciseOptions"),
        onclick: () => openProgramExerciseMenu(item, exercise)
      })
    ]),
    el("input", {
      type: "text",
      class: "setup-note",
      value: item.notes || "",
      onchange: (event) => updateProgramExercise(item.id, { notes: event.target.value.trim() || null })
    }),
    el("div", { class: "program-fields" }, [
      field(t("colSets"), stepper(item.target_sets, 1, 0, (value) => updateProgramExercise(item.id, { target_sets: value }))),
      field(t("colTargetReps"), stepper(item.target_reps, 1, 0, (value) => updateProgramExercise(item.id, { target_reps: value }))),
      field(t("colTargetWeight"), stepper(item.target_weight_kg, 2.5, 0, (value) => updateProgramExercise(item.id, { target_weight_kg: value }), { decimal: true })),
      field(t("colRest"), stepper(item.rest_seconds, 15, 0, (value) => updateProgramExercise(item.id, { rest_seconds: value })))
    ])
  ]);
}

function openProgramExerciseMenu(item, exercise) {
  openSheet((close) => [
    el("h2", { text: exercise.name }),
    el("div", { class: "row" }, [
      el("button", {
        class: "btn grow",
        type: "button",
        text: t("moveUp"),
        onclick: () => {
          moveProgramExercise(item.id, -1);
          close();
        }
      }),
      el("button", {
        class: "btn grow",
        type: "button",
        text: t("moveDown"),
        onclick: () => {
          moveProgramExercise(item.id, 1);
          close();
        }
      })
    ]),
    el("button", {
      class: "btn block danger",
      type: "button",
      text: t("remove"),
      onclick: () => {
        removeProgramExercise(item.id);
        close();
      }
    })
  ]);
}

const ACTIVE_KEY = "gymtracker.program";

function storedActive() {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function rememberActive(id) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}

export function activeProgram() {
  const all = programsSorted();
  if (all.length === 0) return null;
  const stored = storedActive();
  return all.find((program) => program.id === stored) || all[0];
}

function programTabs(active, onSelect) {
  const strip = el("div", { class: "prog-tabs", role: "tablist" });
  for (const program of programsSorted()) {
    strip.append(
      el(
        "button",
        {
          class: program.id === active.id ? "prog-tab current" : "prog-tab",
          type: "button",
          role: "tab",
          "aria-selected": program.id === active.id ? "true" : "false",
          onclick: () => onSelect(program.id)
        },
        [
          el("span", { class: "prog-tab-name", text: program.title }),
          el("span", { class: "prog-tab-when", text: relativeDay(lastTrained(program.id)) })
        ]
      )
    );
  }
  strip.append(
    el("button", {
      class: "prog-tab add",
      type: "button",
      text: "+",
      "aria-label": t("newProgram"),
      onclick: () => openProgramCreator()
    })
  );
  return strip;
}

export function renderPrograms(container, repaint) {
  const active = activeProgram();

  if (!active) {
    container.append(
      el("div", { class: "card" }, [
        el("button", {
          class: "btn primary block",
          type: "button",
          text: t("newProgram"),
          onclick: () => openProgramCreator()
        })
      ])
    );
    return;
  }

  container.append(
    programTabs(active, (id) => {
      rememberActive(id);
      repaint();
    })
  );

  const items = programExercises(active.id);
  const totals = programSummary(active);

  container.append(
    el("div", { class: "card tight" }, [
      el("div", { class: "row between" }, [
        el("input", {
          type: "text",
          class: "grow",
          value: active.title,
          placeholder: t("programNamePlaceholder"),
          onchange: (event) => updateProgram(active.id, { title: event.target.value.trim() || active.title })
        }),
        el("button", {
          class: "btn small ghost",
          type: "button",
          text: "···",
          "aria-label": t("programOptions"),
          onclick: () => openProgramMenu(active)
        })
      ]),
      el("div", {
        class: "tiny",
        text: [plural(totals.exercises, "exercise"), plural(totals.sets, "set")].join(" · ")
      }),
      el("button", {
        class: "btn primary block",
        type: "button",
        text: t("startNow"),
        disabled: items.length === 0,
        onclick: () => startProgram(active.id)
      })
    ])
  );

  if (items.length === 0) container.append(el("div", { class: "empty", text: t("programEmpty") }));

  for (const item of items) {
    const row = programRow(item);
    if (row) container.append(row);
  }

  container.append(
    el("button", {
      class: "btn block",
      type: "button",
      text: t("addExercise"),
      onclick: () => openExercisePicker((exerciseId) => addProgramExercise(active.id, exerciseId))
    })
  );
}

function openProgramMenu(program) {
  openSheet((close) => [
    el("h2", { text: program.title }),
    el("button", {
      class: "btn block danger",
      type: "button",
      text: t("deleteProgram"),
      onclick: async () => {
        close();
        const confirmed = await confirmSheet(t("deleteProgram"), t("deleteProgramBody", { name: program.title }), t("delete"));
        if (confirmed) await deleteProgram(program.id);
      }
    })
  ]);
}
