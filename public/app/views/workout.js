import { el, append, clear, formatDate, formatNumber, plural, stepper, openSheet, confirmSheet, toast } from "../dom.js";
import { t, muscleGroupName } from "../i18n.js";
import {
  byId,
  now,
  updateWorkout,
  deleteWorkout,
  workoutsSorted,
  workoutExercises,
  updateWorkoutExercise,
  setsOf,
  workingSets,
  summarizeSets,
  addExerciseToWorkout,
  removeWorkoutExercise,
  moveWorkoutExercise,
  addSet,
  updateSet,
  deleteSet,
  lastPerformance,
  describeSets
} from "../store.js";
import { startRest, stopRest, keepAwake } from "../timer.js";
import { openExercisePicker } from "./picker.js";
import { renderPrograms } from "./programs.js";
import { navigate } from "../router.js";

const RESUME_WINDOW_MS = 12 * 60 * 60 * 1000;

function openWorkout() {
  const cutoff = now() - RESUME_WINDOW_MS;
  return workoutsSorted().find((workout) => !workout.finished_at && (workout.started_at || 0) >= cutoff) || null;
}

function setRow(set, index, rest) {
  const classes = ["set-grid"];
  if (set.completed_at) classes.push("done");
  if (set.is_warmup) classes.push("warmup");
  return el("div", { class: classes.join(" ") }, [
    el("button", {
      class: "set-index",
      type: "button",
      text: set.is_warmup ? t("warmupMark") : String(index + 1),
      title: t("setOptions"),
      onclick: () => openSetMenu(set)
    }),
    stepper(set.weight_kg, 2.5, 0, (value) => updateSet(set.id, { weight_kg: value }), { decimal: true }),
    stepper(set.reps, 1, 0, (value) => updateSet(set.id, { reps: value })),
    el("button", {
      class: "check",
      type: "button",
      "aria-pressed": set.completed_at ? "true" : "false",
      "aria-label": t("ariaCompleteSet"),
      text: "✓",
      onclick: () => {
        const completing = !set.completed_at;
        updateSet(set.id, { completed_at: completing ? now() : null });
        if (completing && !set.is_warmup) startRest(rest);
      }
    })
  ]);
}

function openSetMenu(set) {
  openSheet((close) => [
    el("h2", { text: t("setOptions") }),
    el("button", {
      class: "btn block",
      type: "button",
      text: set.is_warmup ? t("markWorking") : t("markWarmup"),
      onclick: () => {
        updateSet(set.id, { is_warmup: set.is_warmup ? 0 : 1 });
        close();
      }
    }),
    el("button", {
      class: "btn block danger",
      type: "button",
      text: t("deleteSet"),
      onclick: () => {
        deleteSet(set.id);
        close();
      }
    })
  ]);
}

function exerciseBlock(workout, link) {
  const exercise = byId("exercises", link.exercise_id);
  if (!exercise) return null;
  const sets = setsOf(link.id);
  const working = sets.filter((set) => !set.is_warmup);
  const summary = summarizeSets(working.filter((set) => set.completed_at && set.reps > 0));
  const previous = lastPerformance(exercise.id, workout.id);

  const block = el("section", { class: "exercise-block" }, [
    el("div", { class: "exercise-head" }, [
      el("div", { class: "grow" }, [
        el("div", { class: "exercise-title", text: exercise.name }),
        el("div", { class: "tiny" }, [
          el("span", { class: "badge", text: muscleGroupName(exercise.muscle_group) }),
          summary.count > 0 ? ` ${plural(summary.count, "set")}` : ` ${t("noWorkingSets")}`
        ])
      ]),
      el("button", {
        class: "btn small ghost",
        type: "button",
        "aria-label": t("ariaExerciseOptions"),
        text: "···",
        onclick: () => openExerciseMenu(workout, link, exercise)
      })
    ])
  ]);

  block.append(
    el("input", {
      type: "text",
      class: "setup-note",
      placeholder: t("setupPlaceholder"),
      value: link.notes || "",
      onchange: (event) => updateWorkoutExercise(link.id, { notes: event.target.value.trim() || null })
    })
  );

  if (previous) {
    const delta = previous.volume > 0 ? ((summary.volume - previous.volume) / previous.volume) * 100 : 0;
    const trend = summary.volume > 0 && previous.volume > 0 ? ` · ${delta >= 0 ? "▲" : "▼"} ${formatNumber(Math.abs(delta), 0)}%` : "";
    block.append(
      el("div", { class: "hint" }, [
        `${t("lastSession", { date: formatDate(previous.workout.performed_on), sets: describeSets(previous.sets) })}${trend}`
      ])
    );
  }

  block.append(
    el("div", { class: "set-grid header" }, [
      el("span", { text: t("colSet") }),
      el("span", { text: t("colKg") }),
      el("span", { text: t("colReps") }),
      el("span", { text: "" })
    ])
  );

  let index = 0;
  for (const set of sets.filter((set) => set.is_warmup).concat(working)) {
    block.append(setRow(set, set.is_warmup ? index : index++, link.rest_seconds));
  }

  block.append(
    el("div", { class: "exercise-foot" }, [
      el("button", {
        class: "btn small grow",
        type: "button",
        text: t("addSet"),
        onclick: () => addSet(link.id)
      }),
      el("button", {
        class: "btn small",
        type: "button",
        text: t("addWarmup"),
        onclick: () => addSet(link.id, { is_warmup: 1 })
      })
    ])
  );

  return block;
}

function openExerciseMenu(workout, link, exercise) {
  openSheet((close) => [
    el("h2", { text: exercise.name }),
    el("label", { class: "field" }, [
      el("span", { class: "tiny", text: t("colRest") }),
      stepper(link.rest_seconds, 15, 0, (value) => updateWorkoutExercise(link.id, { rest_seconds: value }))
    ]),
    el("button", {
      class: "btn block",
      type: "button",
      text: t("openExerciseHistory"),
      onclick: () => {
        close();
        navigate(`/exercise/${exercise.id}`);
      }
    }),
    el("div", { class: "row" }, [
      el("button", {
        class: "btn grow",
        type: "button",
        text: t("moveUp"),
        onclick: () => {
          moveWorkoutExercise(link.id, -1);
          close();
        }
      }),
      el("button", {
        class: "btn grow",
        type: "button",
        text: t("moveDown"),
        onclick: () => {
          moveWorkoutExercise(link.id, 1);
          close();
        }
      })
    ]),
    el("button", {
      class: "btn block danger",
      type: "button",
      text: t("removeFromWorkout"),
      onclick: async () => {
        close();
        const confirmed = await confirmSheet(t("removeExercise"), t("removeExerciseBody", { name: exercise.name }), t("remove"));
        if (confirmed) removeWorkoutExercise(link.id);
      }
    })
  ]);
}

function workoutTotals(workout) {
  let sets = 0;
  for (const link of workoutExercises(workout.id)) sets += workingSets(link.id).length;
  return { sets };
}

export function renderWorkout(container, params) {
  const workout = params.id ? byId("workouts", params.id) : openWorkout();
  if (!workout) {
    keepAwake(false);
    renderPrograms(container, () => renderWorkout(clear(container) || container, params));
    return;
  }

  keepAwake(!workout.finished_at);
  const totals = workoutTotals(workout);
  const links = workoutExercises(workout.id);

  const bar = el("div", { class: "list-bar" });
  container.append(bar);

  bar.append(
    el("div", { class: "card tight" }, [
      el("div", { class: "row between" }, [
        el("input", {
          type: "date",
          class: "date-title",
          value: workout.performed_on,
          onchange: (event) => updateWorkout(workout.id, { performed_on: event.target.value || workout.performed_on })
        }),
        el("button", {
          class: "btn small ghost",
          type: "button",
          text: "···",
          "aria-label": t("ariaWorkoutOptions"),
          onclick: () => openWorkoutMenu(workout)
        })
      ]),
      el("input", {
        type: "text",
        placeholder: t("sessionNamePlaceholder"),
        value: workout.title || "",
        onchange: (event) => updateWorkout(workout.id, { title: event.target.value.trim() || null })
      }),
      el("div", {
        class: "tiny",
        text: [
          plural(links.length, "exercise"),
          plural(totals.sets, "workingSet"),
          workout.finished_at ? t("finished") : null
        ]
          .filter(Boolean)
          .join(" · ")
      })
    ])
  );

  if (links.length === 0) {
    container.append(el("div", { class: "empty", text: t("noExercisesYet") }));
  }

  for (const link of links) {
    const block = exerciseBlock(workout, link);
    if (block) container.append(block);
  }

  container.append(
    el("button", {
      class: "btn primary block",
      type: "button",
      text: t("addExercise"),
      onclick: () => openExercisePicker((exerciseId) => addExerciseToWorkout(workout.id, exerciseId))
    })
  );

  container.append(
    el("textarea", {
      placeholder: t("sessionNotes"),
      value: workout.notes || "",
      onchange: (event) => updateWorkout(workout.id, { notes: event.target.value.trim() || null })
    })
  );

  if (!workout.finished_at) {
    container.append(
      el("button", {
        class: "btn block",
        type: "button",
        text: t("finishWorkout"),
        onclick: async () => {
          await updateWorkout(workout.id, { finished_at: now() });
          stopRest();
          keepAwake(false);
          toast(t("workoutFinished"));
          navigate("/");
        }
      })
    );
  }
}

function openWorkoutMenu(workout) {
  openSheet((close) => [
    el("h2", { text: t("workoutOptions") }),
    workout.finished_at
      ? el("button", {
          class: "btn block",
          type: "button",
          text: t("reopenWorkout"),
          onclick: () => {
            updateWorkout(workout.id, { finished_at: null });
            close();
          }
        })
      : null,
    el("button", {
      class: "btn block danger",
      type: "button",
      text: t("deleteWorkout"),
      onclick: async () => {
        close();
        const confirmed = await confirmSheet(t("deleteWorkout"), t("deleteWorkoutBody"), t("delete"));
        if (confirmed) {
          await deleteWorkout(workout.id);
          if (!workout.finished_at) stopRest();
          navigate("/");
        }
      }
    })
  ]);
}
