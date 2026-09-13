import { el, append, clear, formatDate, formatNumber, formatVolume, plural, openSheet, confirmSheet, toast } from "../dom.js";
import {
  MUSCLE_GROUPS,
  SPLIT_DAYS,
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
    el("button", { type: "button", text: "−", "aria-label": "decrease", onclick: () => bump(-step) }),
    input,
    el("button", { type: "button", text: "+", "aria-label": "increase", onclick: () => bump(step) })
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
      title: "Set options",
      style: "background:none;border:0;cursor:pointer",
      onclick: () => openSetMenu(set)
    }),
    stepper(set.weight_kg, 2.5, 0, (value) => updateSet(set.id, { weight_kg: value }), { decimal: true }),
    stepper(set.reps, 1, 0, (value) => updateSet(set.id, { reps: value })),
    el(
      "select",
      {
        "aria-label": "reps in reserve",
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
      "aria-label": "complete set",
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
    el("h2", { text: `Set options` }),
    el("button", {
      class: "btn block",
      type: "button",
      text: set.is_warmup ? "Mark as working set" : "Mark as warm-up",
      onclick: () => {
        updateSet(set.id, { is_warmup: set.is_warmup ? 0 : 1 });
        close();
      }
    }),
    el("button", {
      class: "btn block danger",
      type: "button",
      text: "Delete set",
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
        el("div", { class: "exercise-title", text: exercise.name }),
        el("div", { class: "tiny" }, [
          el("span", { class: "badge", text: exercise.muscle_group }),
          summary.count > 0 ? ` ${plural(summary.count, "set")} · ${formatVolume(summary.volume)} kg` : " no working sets yet"
        ])
      ]),
      el("button", {
        class: "btn icon ghost",
        type: "button",
        "aria-label": "exercise options",
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
        `Last ${formatDate(previous.workout.performed_on)}: ${describeSets(previous.sets)}${trend}`
      ])
    );
  }

  block.append(
    el("div", { class: "set-grid header" }, [
      el("span", { text: "#" }),
      el("span", { text: "kg" }),
      el("span", { text: "reps" }),
      el("span", { text: "rir" }),
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
        text: "+ Set",
        onclick: () => addSet(link.id)
      }),
      el("button", {
        class: "btn small",
        type: "button",
        text: "+ Warm-up",
        onclick: () => addSet(link.id, { is_warmup: 1, rir: null })
      })
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
      text: "Open exercise history",
      onclick: () => {
        close();
        navigate(`/exercise/${exercise.id}`);
      }
    }),
    el("div", { class: "row" }, [
      el("button", {
        class: "btn grow",
        type: "button",
        text: "Move up",
        onclick: () => {
          moveWorkoutExercise(link.id, -1);
          close();
        }
      }),
      el("button", {
        class: "btn grow",
        type: "button",
        text: "Move down",
        onclick: () => {
          moveWorkoutExercise(link.id, 1);
          close();
        }
      })
    ]),
    el("button", {
      class: "btn block danger",
      type: "button",
      text: "Remove from workout",
      onclick: async () => {
        close();
        const confirmed = await confirmSheet("Remove exercise", `Remove ${exercise.name} and its sets from this workout?`, "Remove");
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
    const matches = exercisesSorted().filter((exercise) => {
      const matchesGroup = !group || exercise.muscle_group === group;
      const matchesQuery = !query || exercise.name.toLowerCase().includes(query.toLowerCase());
      return matchesGroup && matchesQuery;
    });
    if (matches.length === 0) {
      listNode.append(el("div", { class: "empty", text: "No exercise matches." }));
    }
    for (const exercise of matches.slice(0, 40)) {
      listNode.append(
        el("button", { class: "list-item", type: "button", onclick: () => pick(exercise.id) }, [
          el("span", { text: exercise.name }),
          el("span", { class: "badge", text: exercise.muscle_group })
        ])
      );
    }
  };

  let closeSheet = null;
  const pick = async (exerciseId) => {
    await addExerciseToWorkout(workout.id, exerciseId);
    if (closeSheet) closeSheet();
  };

  paint();

  closeSheet = openSheet(() => [
    el("h2", { text: "Add exercise" }),
    el("input", {
      type: "search",
      placeholder: "Search exercises",
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
    listNode,
    el("button", {
      class: "btn block",
      type: "button",
      text: "Create new exercise",
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
    el("h2", { text: "New exercise" }),
    el("input", {
      type: "text",
      placeholder: "Exercise name",
      value: name,
      oninput: (event) => {
        name = event.target.value;
      }
    }),
    el(
      "select",
      { onchange: (event) => (group = event.target.value) },
      MUSCLE_GROUPS.map((item) => el("option", { value: item, text: item }))
    ),
    el(
      "select",
      { onchange: (event) => (equipment = event.target.value) },
      ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "Other"].map((item) => el("option", { value: item, text: item }))
    ),
    el("button", {
      class: "btn primary block",
      type: "button",
      text: "Create",
      onclick: async () => {
        if (!name.trim()) return toast("Name is required");
        const exercise = await createExercise(name.trim(), group, equipment);
        close();
        if (onCreated) onCreated(exercise);
      }
    })
  ]);
}

function startCard(container) {
  container.append(
    el("div", { class: "card" }, [
      el("h1", { text: "Ready to train" }),
      el("p", { class: "muted", text: "Pick today's split day and start logging. Everything works offline." }),
      el(
        "div",
        { class: "chips" },
        SPLIT_DAYS.map((day) =>
          el("button", {
            class: "chip",
            type: "button",
            text: day,
            onclick: async () => {
              const workout = await createWorkout(todayISO(), day);
              navigate(`/workout/${workout.id}`);
            }
          })
        )
      ),
      el("button", {
        class: "btn primary block",
        type: "button",
        text: "Start empty workout",
        onclick: async () => {
          const workout = await createWorkout(todayISO(), null);
          navigate(`/workout/${workout.id}`);
        }
      })
    ])
  );

  const recent = workoutsSorted().slice(0, 5);
  if (recent.length > 0) {
    container.append(el("h2", { text: "Recent" }));
    const list = el("div", { class: "list" });
    for (const workout of recent) {
      const totals = workoutTotals(workout);
      list.append(
        el("a", { class: "list-item", href: `/workout/${workout.id}`, "data-link": "" }, [
          el("span", {}, [
            el("div", { text: workout.title || "Workout" }),
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
          "aria-label": "workout options",
          onclick: () => openWorkoutMenu(workout)
        })
      ]),
      el("input", {
        type: "text",
        placeholder: "Session name (e.g. Chest)",
        value: workout.title || "",
        onchange: (event) => updateWorkout(workout.id, { title: event.target.value.trim() || null })
      }),
      el("div", {
        class: "tiny",
        text: [
          plural(links.length, "exercise"),
          plural(totals.sets, "working set"),
          `${formatVolume(totals.volume)} kg volume`,
          workout.finished_at ? "finished" : null
        ]
          .filter(Boolean)
          .join(" · ")
      })
    ])
  );

  if (links.length === 0) {
    container.append(el("div", { class: "empty", text: "No exercises yet. Add the first one below." }));
  }

  for (const link of links) {
    const block = exerciseBlock(workout, link);
    if (block) container.append(block);
  }

  container.append(
    el("button", {
      class: "btn primary block",
      type: "button",
      text: "+ Add exercise",
      onclick: () => openExercisePicker(workout)
    })
  );

  container.append(
    el("textarea", {
      placeholder: "Session notes",
      value: workout.notes || "",
      onchange: (event) => updateWorkout(workout.id, { notes: event.target.value.trim() || null })
    })
  );

  if (!workout.finished_at) {
    container.append(
      el("button", {
        class: "btn block",
        type: "button",
        text: "Finish workout",
        onclick: () => {
          updateWorkout(workout.id, { finished_at: now() });
          keepAwake(false);
          toast("Workout finished");
        }
      })
    );
  }
}

function openWorkoutMenu(workout) {
  openSheet((close) => [
    el("h2", { text: "Workout options" }),
    el(
      "div",
      { class: "chips" },
      SPLIT_DAYS.map((day) =>
        el("button", {
          class: "chip",
          type: "button",
          text: day,
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
          text: "Reopen workout",
          onclick: () => {
            updateWorkout(workout.id, { finished_at: null });
            close();
          }
        })
      : null,
    el("button", {
      class: "btn block danger",
      type: "button",
      text: "Delete workout",
      onclick: async () => {
        close();
        const confirmed = await confirmSheet("Delete workout", "This removes the session and all of its sets.", "Delete");
        if (confirmed) {
          await deleteWorkout(workout.id);
          navigate("/history");
        }
      }
    })
  ]);
}
