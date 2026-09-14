import { el, clear, openSheet, toast } from "../dom.js";
import { t, muscleGroupName } from "../i18n.js";
import { MUSCLE_GROUPS, exercisesByRecent, createExercise } from "../store.js";

export function openExercisePicker(onPick) {
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
          el("span", { text: exercise.name }),
          el("span", { class: "badge", text: muscleGroupName(exercise.muscle_group) })
        ])
      );
    }
  };

  let closeSheet = null;
  const createFromQuery = () => {
    if (closeSheet) closeSheet();
    openExerciseCreator(query.trim(), (exercise) => onPick(exercise.id));
  };
  const pick = async (exerciseId) => {
    await onPick(exerciseId);
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
        openExerciseCreator(query, (exercise) => onPick(exercise.id));
      }
    })
  ]);
}

function openExerciseCreator(initialName, onCreated) {
  let name = initialName || "";
  let group = MUSCLE_GROUPS[0];
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
    el("button", {
      class: "btn primary block",
      type: "button",
      text: t("create"),
      onclick: async () => {
        if (!name.trim()) return toast(t("nameRequired"));
        const exercise = await createExercise(name.trim(), group, null);
        close();
        if (onCreated) onCreated(exercise);
      }
    })
  ]);
}
