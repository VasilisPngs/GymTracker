import { el, append, clear, formatDate, formatNumber, formatVolume, plural, openSheet, confirmSheet, toast } from "../dom.js";
import { t, muscleGroupName, presetName, equipmentName, exerciseName } from "../i18n.js";
import {
  MUSCLE_GROUPS,
  SESSION_PRESETS,
  byId,
  todayISO,
  now,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  workoutsSorted,
  workoutExercises,
  setsOf,
  workingSets,
  summarizeSets,
  addExerciseToWorkout,
  removeWorkoutExercise,
  moveWorkoutExercise,
  addSet,
  updateSet,
  deleteSet,
  exercisesSorted,
  exercisesByRecent,
  createExercise,
  lastPerformance,
  describeSets,
  epley
} from "../store.js";
import { startRest, keepAwake } from "../timer.js";
import { navigate } from "../router.js";

function todaysWorkout() {
  const today = todayISO();
  return workoutsSorted().find((workout) => workout.performed_on === today) || null;
}

function stepper(value, step, min, onCommit, options = {}) {
  const input = el("input", {
    type: "text",
    inputMode: options.decimal ? "decimal" : "numeric",
    value: value === null || value === undefined ? "" : String(value),
    onchange: (event) => {
      const raw = event.target.value.replace(",", ".").trim();
      if (raw === "") return onCommit(null);
      const parsed = Number(raw);
      onCommit(Number.isFinite(parsed) ? Math.max(min, parsed) : null);
    },
    onfocus: (event) => event.target.select()
  });
  const bump = (delta) => {
    const current = Number(input.value.replace(",", ".")) || 0;
    const next = Math.max(min, Math.round((current + delta) * 100) / 100);
    input.value = String(next);
    onCommit(next);
  };
  return el("div", { class: "stepper" }, [
    el("button", { type: "button", text: "−", "aria-label": t("ariaDecrease"), onclick: () => bump(-step) }),
    input,
    el("button", { type: "button", text: "+", "aria-label": t("ariaIncrease"), onclick: () => bump(step) })
  ]);
}

function setRow(set, index) {
  const classes = ["set-grid"];
  if (set.completed_at) classes.push("done");
  if (set.is_warmup) classes.push("warmup");
  return el("div", { class: classes.join(" ") }, [
    el("button", {
      class: "set-index",
      type: "button",
      text: set.is_warmup ? "W" : String(index + 1),
      title: t("setOptions"),
      style: "background:none;border:0;cursor:pointer",
      onclick: () => openSetMenu(set)
    }),
    stepper(set.weight_kg, 2.5, 0, (value) => updateSet(set.id, { weight_kg: value }), { decimal: true }),
    stepper(set.reps, 1, 0, (value) => updateSet(set.id, { reps: value })),
    el(
      "select",
      {
        "aria-label": t("ariaRir"),
        style: "padding:9px 6px;text-align:center",
        onchange: (event) => updateSet(set.id, { rir: event.target.value === "" ? null : Number(event.target.value) })
      },
      ["", "0", "1", "2", "3", "4", "5"].map((option) =>
        el("option", { value: option, text: option === "" ? "RIR" : option, selected: String(set.rir ?? "") === option })
      )
    ),
    el("button", {
      class: "check",
      type: "button",
      "aria-pressed": set.completed_at ? "true" : "false",
      "aria-label": t("ariaCompleteSet"),
      text: "✓",
      onclick: () => {
        const completing = !set.completed_at;
        updateSet(set.id, { completed_at: completing ? now() : null });
        if (completing && !set.is_warmup) startRest();
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
  const summary = summarizeSets(working.filter((set) => set.reps > 0));
  const previous = lastPerformance(exercise.id, workout.id);

  const block = el("section", { class: "exercise-block" }, [
    el("div", { class: "exercise-head" }, [
      el("div", { class: "grow" }, [
        el("div", { class: "exercise-title", text: exerciseName(exercise.name) }),
        el("div", { class: "tiny" }, [
          el("span", { class: "badge", text: muscleGroupName(exercise.muscle_group) }),
          summary.count > 0 ? ` ${plural(summary.count, "set")} · ${formatVolume(summary.volume)} kg` : ` ${t("noWorkingSets")}`
        ])
      ]),
      el("button", {
        class: "btn icon ghost",
        type: "button",
        "aria-label": t("ariaExerciseOptions"),
        text: "···",
        onclick: () => openExerciseMenu(workout, link, exercise)
      })
    ])
  ]);

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
      el("span", { text: t("colRir") }),
      el("span", { text: "" })
    ])
  );

  let index = 0;
  for (const set of sets) {
    block.append(setRow(set, set.is_warmup ? index : index++));
  }

  block.append(
    el("div", { style: "padding:10px 14px 14px;display:flex;gap:8px" }, [
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
        onclick: () => addSet(link.id, { is_warmup: 1, rir: null })
      })
    ])
  );

  return block;
}

function openExerciseMenu(workout, link, exercise) {
  openSheet((close) => [
    el("h2", { text: exerciseName(exercise.name) }),
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
        const confirmed = await confirmSheet(t("removeExercise"), t("removeExerciseBody", { name: exerciseName(exercise.name) }), t("remove"));
        if (confirmed) removeWorkoutExercise(link.id);
      }
    })
  ]);
}

function openExercisePicker(workout) {
  let query = "";
  let group = "";
  const listNode = el("div", { class: "list" });

  const paint = () => {
    clear(listNode);
    const needle = query.trim().toLowerCase();
    const matches = exercisesByRecent().filter((exercise) => {
      const matchesGroup = !group || exercise.muscle_group === group;
      const matchesQuery = !needle || exercise.name.toLowerCase().includes(needle);
      return matchesGroup && matchesQuery;
    });
    if (needle && !matches.some((exercise) => exercise.name.toLowerCase() === needle)) {
      listNode.append(
        el("button", { class: "list-item", type: "button", onclick: () => createFromQuery() }, [
          el("span", { class: "grow", text: t("createNamed", { name: query.trim() }) }),
          el("span", { class: "badge", text: "+" })
        ])
      );
    }
    if (matches.length === 0 && !needle) {
      listNode.append(el("div", { class: "empty", text: t("noExerciseMatch") }));
    }
    for (const exercise of matches.slice(0, 40)) {
      listNode.append(
        el("button", { class: "list-item", type: "button", onclick: () => pick(exercise.id) }, [
          el("span", { text: exerciseName(exercise.name) }),
          el("span", { class: "badge", text: muscleGroupName(exercise.muscle_group) })
        ])
      );
    }
  };

  let closeSheet = null;
  const createFromQuery = () => {
    if (closeSheet) closeSheet();
    openExerciseCreator(query.trim(), (exercise) => addExerciseToWorkout(workout.id, exercise.id));
  };
  const pick = async (exerciseId) => {
    await addExerciseToWorkout(workout.id, exerciseId);
    if (closeSheet) closeSheet();
  };

  paint();

  closeSheet = openSheet(() => [
    el("h2", { text: t("addExercise").replace("+ ", "") }),
    el("input", {
      type: "search",
      placeholder: t("searchExercises"),
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
    listNode,
    el("button", {
      class: "btn block",
      type: "button",
      text: t("createNewExercise"),
      onclick: () => {
        if (closeSheet) closeSheet();
        openExerciseCreator(query, (exercise) => addExerciseToWorkout(workout.id, exercise.id));
      }
    })
  ]);
}

export function openExerciseCreator(initialName, onCreated) {
  let name = initialName || "";
  let group = MUSCLE_GROUPS[0];
  let equipment = "Barbell";
  openSheet((close) => [
    el("h2", { text: t("newExercise") }),
    el("input", {
      type: "text",
      placeholder: t("exerciseNamePlaceholder"),
      value: name,
      oninput: (event) => {
        name = event.target.value;
      }
    }),
    el(
      "select",
      { onchange: (event) => (group = event.target.value) },
      MUSCLE_GROUPS.map((item) => el("option", { value: item, text: muscleGroupName(item) }))
    ),
    el(
      "select",
      { onchange: (event) => (equipment = event.target.value) },
      ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "Other"].map((item) => el("option", { value: item, text: equipmentName(item) }))
    ),
    el("button", {
      class: "btn primary block",
      type: "button",
      text: t("create"),
      onclick: async () => {
        if (!name.trim()) return toast(t("nameRequired"));
        const exercise = await createExercise(name.trim(), group, equipment);
        close();
        if (onCreated) onCreated(exercise);
      }
    })
  ]);
}

function startCard(container) {
  let draft = "";
  const start = async (name) => {
    const workout = await createWorkout(todayISO(), name && name.trim() ? name.trim() : null);
    navigate(`/workout/${workout.id}`);
  };
  const input = el("input", {
    type: "text",
    placeholder: t("sessionNamePlaceholder"),
    oninput: (event) => {
      draft = event.target.value;
    },
    onkeydown: (event) => {
      if (event.key === "Enter") start(draft);
    }
  });

  container.append(
    el("div", { class: "card" }, [
      el("h1", { text: t("readyToTrain") }),
      el("p", { class: "muted", text: t("readyBody") }),
      input,
      el("div", { class: "tiny", text: t("quickNames") }),
      el(
        "div",
        { class: "chips" },
        SESSION_PRESETS.map((preset) =>
          el("button", {
            class: "chip",
            type: "button",
            text: presetName(preset),
            onclick: () => start(preset)
          })
        )
      ),
      el("button", {
        class: "btn primary block",
        type: "button",
        text: t("startSession"),
        onclick: () => start(draft)
      })
    ])
  );

  const recent = workoutsSorted().slice(0, 5);
  if (recent.length > 0) {
    container.append(el("h2", { text: t("recent") }));
    const list = el("div", { class: "list" });
    for (const workout of recent) {
      const totals = workoutTotals(workout);
      list.append(
        el("a", { class: "list-item", href: `/workout/${workout.id}`, "data-link": "" }, [
          el("span", {}, [
            el("div", { text: workout.title ? presetName(workout.title) : t("workout") }),
            el("div", { class: "tiny", text: formatDate(workout.performed_on) })
          ]),
          el("span", { class: "tiny num", text: `${plural(totals.sets, "set")} · ${formatVolume(totals.volume)} kg` })
        ])
      );
    }
    container.append(list);
  }
}

export function workoutTotals(workout) {
  let sets = 0;
  let volume = 0;
  let best = 0;
  for (const link of workoutExercises(workout.id)) {
    const working = workingSets(link.id);
    const summary = summarizeSets(working);
    sets += working.length;
    volume += summary.volume;
    if (summary.best) best = Math.max(best, epley(summary.best.weight_kg, summary.best.reps));
  }
  return { sets, volume, best };
}

export function renderWorkout(container, params) {
  const workout = params.id ? byId("workouts", params.id) : todaysWorkout();
  if (!workout) {
    keepAwake(false);
    startCard(container);
    return;
  }

  keepAwake(true);
  const totals = workoutTotals(workout);
  const links = workoutExercises(workout.id);

  container.append(
    el("div", { class: "card tight" }, [
      el("div", { class: "row between" }, [
        el("input", {
          type: "date",
          value: workout.performed_on,
          style: "width:auto;background:transparent;border:0;padding:0;font-weight:600",
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
          `${formatVolume(totals.volume)} ${t("volumeSuffix")}`,
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
      onclick: () => openExercisePicker(workout)
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
        onclick: () => {
          updateWorkout(workout.id, { finished_at: now() });
          keepAwake(false);
          toast(t("workoutFinished"));
        }
      })
    );
  }
}

function openWorkoutMenu(workout) {
  openSheet((close) => [
    el("h2", { text: t("workoutOptions") }),
    el(
      "div",
      { class: "chips" },
      SESSION_PRESETS.map((day) =>
        el("button", {
          class: "chip",
          type: "button",
          text: presetName(day),
          onclick: () => {
            updateWorkout(workout.id, { title: day });
            close();
          }
        })
      )
    ),
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
          navigate("/history");
        }
      }
    })
  ]);
}
