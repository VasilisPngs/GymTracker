import { el, icon, append, clear, formatDate, formatDay, formatDuration, formatNumber, plural, stepper, openSheet, confirmSheet, moveRow, toast } from "../dom.js";
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
  replaceWorkoutExercise,
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

let clock = null;

export function isRunning(workout) {
  return !workout.finished_at && (workout.started_at || 0) >= now() - RESUME_WINDOW_MS;
}

export function openWorkout() {
  return workoutsSorted().find(isRunning) || null;
}

function lastActivity(workout) {
  let last = 0;
  for (const link of workoutExercises(workout.id)) {
    for (const set of setsOf(link.id)) if (set.completed_at > last) last = set.completed_at;
  }
  return last || workout.started_at || now();
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
      onclick: () => {
        const completing = !set.completed_at;
        updateSet(set.id, { completed_at: completing ? now() : null });
        if (completing && !set.is_warmup) startRest(rest);
      }
    }, icon("check"))
  ]);
}

function restRow(seconds, title, onCommit, extra) {
  return el(
    "button",
    {
      class: extra ? `rest-row ${extra}` : "rest-row",
      type: "button",
      "aria-label": title,
      onclick: () =>
        openSheet(() => [
          el("h2", { text: title }),
          el("label", { class: "field" }, [el("span", { class: "tiny", text: t("colRest") }), stepper(seconds, 15, 0, onCommit)])
        ])
    },
    el(
      "span",
      { class: "rest-track" },
      el("span", { class: "rest-pill" }, [
        icon(seconds ? "timer" : "plus"),
        el("span", { class: "num", text: seconds ? formatDuration(seconds) : t("addRest") })
      ])
    )
  );
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
      el("div", { class: "row" }, [
        el("button", {
          class: "btn small ghost",
          type: "button",
          onclick: () => openExercisePicker((exerciseId) => replaceWorkoutExercise(link.id, exerciseId), t("replaceExercise"))
        }, [icon("swap"), t("replace")]),
        el("button", {
          class: "btn small ghost",
          type: "button",
          "aria-label": t("ariaExerciseOptions"),
          onclick: () => openExerciseMenu(workout, link, exercise)
        }, icon("more"))
      ])
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
    const today = workoutExercises(workout.id)
      .filter((row) => row.exercise_id === exercise.id)
      .flatMap((row) => workingSets(row.id));
    const done = summarizeSets(today).volume;
    const before = summarizeSets(previous.sets.slice(0, Math.max(today.length, 1))).volume;
    const delta = before > 0 ? ((done - before) / before) * 100 : 0;
    const trend = done > 0 && before > 0;
    block.append(
      el("div", { class: "hint" }, [
        el("span", {}, [
          t("lastSession", { date: formatDate(previous.workout.performed_on), sets: describeSets(previous.sets) }),
          trend ? " · " : null,
          trend ? icon(delta >= 0 ? "up" : "down") : null,
          trend ? ` ${formatNumber(Math.abs(delta), 0)}%` : null
        ])
      ])
    );
  }

  if (sets.length > 0) {
    block.append(
      el("div", { class: "set-grid header" }, [
        el("span", { text: t("colSet") }),
        el("span", { text: t("colKg") }),
        el("span", { text: t("colReps") }),
        el("span", { text: "" })
      ])
    );
  }

  let index = 0;
  const lastWorking = working[working.length - 1];
  for (const set of sets.filter((set) => set.is_warmup).concat(working)) {
    const last = set === lastWorking;
    block.append(setRow(set, set.is_warmup ? index : index++, last ? link.rest_after_seconds : set.rest_seconds));
    if (!set.is_warmup && !last) {
      block.append(restRow(set.rest_seconds, t("restAfterSet", { n: index }), (value) => updateSet(set.id, { rest_seconds: value })));
    }
  }

  block.append(
    el("div", { class: "exercise-foot" }, [
      el("button", {
        class: "btn small grow",
        type: "button",
        onclick: () => addSet(link.id)
      }, [icon("plus"), t("addSet")]),
      el("button", {
        class: "btn small",
        type: "button",
        onclick: () => addSet(link.id, { is_warmup: 1 })
      }, [icon("plus"), t("addWarmup")])
    ])
  );

  return block;
}

function openExerciseMenu(workout, link, exercise) {
  openSheet((close) => [
    el("h2", { text: exercise.name }),
    el("button", {
      class: "btn block",
      type: "button",
      text: t("openExerciseHistory"),
      onclick: () => {
        close();
        navigate(`/exercise/${exercise.id}`);
      }
    }),
    moveRow(
      workoutExercises(workout.id).findIndex((row) => row.id === link.id),
      workoutExercises(workout.id).length,
      [t("moveUp"), t("moveDown")],
      (direction) => {
        moveWorkoutExercise(link.id, direction);
        close();
      }
    ),
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

function workoutClock(workout) {
  clearInterval(clock);
  clock = null;
  const running = isRunning(workout);
  if (!workout.started_at || (!workout.finished_at && !running)) return null;
  const elapsed = () => formatDuration(((workout.finished_at || now()) - workout.started_at) / 1000);
  const node = el("span", {
    class: running ? "workout-clock running num" : "workout-clock num",
    title: t("workoutDuration"),
    "aria-label": t("workoutDuration"),
    text: elapsed()
  });
  if (running) {
    clock = setInterval(() => {
      if (node.isConnected) node.textContent = elapsed();
      else {
        clearInterval(clock);
        clock = null;
      }
    }, 1000);
  }
  return node;
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

  keepAwake(isRunning(workout));
  const totals = workoutTotals(workout);
  const links = workoutExercises(workout.id);

  const bar = el("div", { class: "list-bar" });
  container.append(bar);

  bar.append(
    el("div", { class: "card tight" }, [
      el("div", { class: "row between" }, [
        el("div", { class: "row" }, [
          el("label", { class: "date-field" }, [
            el("span", { class: "date-text", text: formatDay(workout.performed_on) }),
            icon("calendar"),
            el("input", {
              type: "date",
              class: "date-input",
              "aria-label": t("workoutDate"),
              value: workout.performed_on,
              onclick: (event) => {
                if (matchMedia("(pointer: coarse)").matches) return;
                try {
                  event.target.showPicker();
                } catch {}
              },
              onchange: (event) => updateWorkout(workout.id, { performed_on: event.target.value || workout.performed_on })
            })
          ]),
          workoutClock(workout)
        ]),
        el("button", {
          class: "btn small ghost",
          type: "button",
          "aria-label": t("ariaWorkoutOptions"),
          onclick: () => openWorkoutMenu(workout)
        }, icon("more"))
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

  const blocks = links.map((link) => [link, exerciseBlock(workout, link)]).filter(([, block]) => block);
  blocks.forEach(([link, block], position) => {
    container.append(block);
    if (position < blocks.length - 1) {
      container.append(
        restRow(link.rest_after_seconds, t("restBeforeNext"), (value) => updateWorkoutExercise(link.id, { rest_after_seconds: value }), "between")
      );
    }
  });

  container.append(
    el("button", {
      class: "btn primary block",
      type: "button",
      onclick: () => openExercisePicker((exerciseId) => addExerciseToWorkout(workout.id, exerciseId))
    }, [icon("plus"), t("addExercise")])
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
          const running = isRunning(workout);
          await updateWorkout(workout.id, { finished_at: running ? now() : lastActivity(workout) });
          toast(t("workoutFinished"));
          if (!running) return;
          stopRest();
          keepAwake(false);
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
          const running = isRunning(workout);
          await deleteWorkout(workout.id);
          if (running) stopRest();
          navigate(running ? "/" : "/history");
        }
      }
    })
  ]);
}
