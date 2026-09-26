import { el, icon, plural, stepper, openSheet, confirmSheet, moveRow, toast } from "../dom.js";
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
  moveProgram,
  addProgramExercise,
  updateProgramExercise,
  removeProgramExercise,
  replaceProgramExercise,
  moveProgramExercise,
  startWorkoutFromProgram
} from "../store.js";
import { openExercisePicker } from "./picker.js";
import { navigate } from "../router.js";

function programSummary(program) {
  const items = programExercises(program.id);
  const sets = items.reduce((total, item) => total + (item.target_sets || 0), 0);
  return { exercises: items.length, sets };
}

async function startProgram(programId) {
  const workout = await startWorkoutFromProgram(programId);
  if (workout) navigate(`/workout/${workout.id}`);
}

function openProgramCreator() {
  let name = "";
  openSheet((close) => [
    el("h2", { text: t("newProgram") }),
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
      el("div", { class: "row" }, [
        el("button", {
          class: "btn small ghost",
          type: "button",
          onclick: () => openExercisePicker((exerciseId) => replaceProgramExercise(item.id, exerciseId), t("replaceExercise"))
        }, [icon("swap"), t("replace")]),
        el("button", {
          class: "btn small ghost",
          type: "button",
          "aria-label": t("ariaExerciseOptions"),
          onclick: () => openProgramExerciseMenu(item, exercise)
        }, icon("more"))
      ])
    ]),
    el("input", {
      type: "text",
      class: "setup-note",
      placeholder: t("setupPlaceholder"),
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
    moveRow(
      programExercises(item.program_id).findIndex((row) => row.id === item.id),
      programExercises(item.program_id).length,
      [t("moveUp"), t("moveDown")],
      (direction) => {
        moveProgramExercise(item.id, direction);
        close();
      }
    ),
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

function activeProgram() {
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
      "aria-label": t("newProgram"),
      onclick: () => openProgramCreator()
    }, icon("plus"))
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
          onclick: () => openProgramCreator()
        }, [icon("plus"), t("newProgram")])
      ])
    );
    return;
  }

  const bar = el("div", { class: "list-bar" });
  container.append(bar);

  bar.append(
    programTabs(active, (id) => {
      rememberActive(id);
      repaint();
    })
  );

  const items = programExercises(active.id);
  const totals = programSummary(active);

  bar.append(
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
          class: "btn ghost",
          type: "button",
          "aria-label": t("programOptions"),
          onclick: () => openProgramMenu(active)
        }, icon("more"))
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
      onclick: () => openExercisePicker((exerciseId) => addProgramExercise(active.id, exerciseId))
    }, [icon("plus"), t("addExercise")])
  );
}

function openProgramMenu(program) {
  const programs = programsSorted();
  openSheet((close) => [
    el("h2", { text: program.title }),
    moveRow(
      programs.findIndex((row) => row.id === program.id),
      programs.length,
      [t("moveEarlier"), t("moveLater")],
      (direction) => {
        moveProgram(program.id, direction);
        close();
      }
    ),
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
