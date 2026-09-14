import { el, plural, stepper, openSheet, confirmSheet, toast } from "../dom.js";
import { t, muscleGroupName, exerciseName, weekdayNames } from "../i18n.js";
import {
  byId,
  programsSorted,
  programExercises,
  createProgram,
  updateProgram,
  setProgramWeekday,
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

export function programLabel(program) {
  const day = program.weekday === null || program.weekday === undefined ? null : weekdayNames()[program.weekday];
  return day ? `${program.title} · ${day}` : program.title;
}

export async function startProgram(programId) {
  const workout = await startWorkoutFromProgram(programId);
  if (workout) navigate(`/workout/${workout.id}`);
}

export function openProgramCreator() {
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
        close();
        navigate(`/program/${program.id}`);
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
        el("div", { class: "exercise-title", text: exerciseName(exercise.name) }),
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
    el("h2", { text: exerciseName(exercise.name) }),
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

export function renderProgram(container, params) {
  const program = byId("programs", params.id);
  if (!program) {
    container.append(el("div", { class: "empty", text: t("programMissing") }));
    return;
  }

  const items = programExercises(program.id);
  const totals = programSummary(program);
  const days = weekdayNames();

  container.append(
    el("div", { class: "card tight" }, [
      el("div", { class: "row between" }, [
        el("button", { class: "btn small ghost", type: "button", text: t("back"), onclick: () => navigate("/") }),
        el("button", {
          class: "btn small ghost",
          type: "button",
          text: "···",
          "aria-label": t("programOptions"),
          onclick: () => openProgramMenu(program)
        })
      ]),
      el("input", {
        type: "text",
        value: program.title,
        placeholder: t("programNamePlaceholder"),
        onchange: (event) => updateProgram(program.id, { title: event.target.value.trim() || program.title })
      }),
      el(
        "select",
        {
          "aria-label": t("programDay"),
          onchange: (event) => setProgramWeekday(program.id, event.target.value === "" ? null : Number(event.target.value))
        },
        [
          el("option", { value: "", text: t("anyDay"), selected: program.weekday === null || program.weekday === undefined }),
          ...days.map((name, index) => el("option", { value: String(index), text: name, selected: program.weekday === index }))
        ]
      ),
      el("div", {
        class: "tiny",
        text: [plural(totals.exercises, "exercise"), plural(totals.sets, "set")].join(" · ")
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
      onclick: () => openExercisePicker((exerciseId) => addProgramExercise(program.id, exerciseId))
    })
  );

  container.append(
    el("button", {
      class: "btn primary block",
      type: "button",
      text: t("startNow"),
      disabled: items.length === 0,
      onclick: () => startProgram(program.id)
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
        if (confirmed) {
          await deleteProgram(program.id);
          navigate("/");
        }
      }
    })
  ]);
}

export function programList() {
  const programs = programsSorted();
  if (programs.length === 0) return null;
  const list = el("div", { class: "list" });
  for (const program of programs) {
    const totals = programSummary(program);
    list.append(
      el("div", { class: "list-item" }, [
        el("a", { class: "grow", href: `/program/${program.id}`, "data-link": "", style: "text-decoration:none;color:inherit" }, [
          el("div", { text: programLabel(program) }),
          el("div", { class: "tiny", text: [plural(totals.exercises, "exercise"), plural(totals.sets, "set")].join(" · ") })
        ]),
        el("button", {
          class: "btn small primary",
          type: "button",
          text: t("startSession"),
          disabled: totals.exercises === 0,
          onclick: () => startProgram(program.id)
        })
      ])
    );
  }
  return list;
}
