import { el, formatDate, formatVolume, plural, openSheet } from "../dom.js";
import { SPLIT_DAYS, workoutsSorted, createWorkout, todayISO } from "../store.js";
import { workoutTotals } from "./workout.js";
import { navigate } from "../router.js";

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

function openCreator() {
  let date = todayISO();
  let title = "";
  openSheet((close) => [
    el("h2", { text: "New workout" }),
    el("input", {
      type: "date",
      value: date,
      onchange: (event) => {
        date = event.target.value || date;
      }
    }),
    el(
      "div",
      { class: "chips" },
      SPLIT_DAYS.map((day) =>
        el("button", {
          class: "chip",
          type: "button",
          text: day,
          onclick: (event) => {
            title = day;
            for (const chip of event.target.parentElement.children) chip.setAttribute("aria-pressed", "false");
            event.target.setAttribute("aria-pressed", "true");
          }
        })
      )
    ),
    el("button", {
      class: "btn primary block",
      type: "button",
      text: "Create",
      onclick: async () => {
        const workout = await createWorkout(date, title || null);
        close();
        navigate(`/workout/${workout.id}`);
      }
    })
  ]);
}

export function renderHistory(container) {
  const workouts = workoutsSorted();

  container.append(
    el("div", { class: "row between" }, [
      el("h1", { text: "History" }),
      el("button", { class: "btn small primary", type: "button", text: "+ New", onclick: openCreator })
    ])
  );

  if (workouts.length === 0) {
    container.append(el("div", { class: "empty", text: "No sessions logged yet." }));
    return;
  }

  let currentMonth = "";
  let list = null;
  for (const workout of workouts) {
    const month = monthFormat.format(new Date(`${workout.performed_on}T00:00:00`));
    if (month !== currentMonth) {
      currentMonth = month;
      container.append(el("h2", { text: month, style: "margin-top:6px" }));
      list = el("div", { class: "list" });
      container.append(list);
    }
    const totals = workoutTotals(workout);
    list.append(
      el("a", { class: "list-item", href: `/workout/${workout.id}`, "data-link": "" }, [
        el("span", { class: "grow" }, [
          el("div", { text: workout.title || "Workout" }),
          el("div", { class: "tiny", text: formatDate(workout.performed_on, true) })
        ]),
        el("span", { class: "tiny num", style: "text-align:right" }, [
          el("div", { text: plural(totals.sets, "set") }),
          el("div", { text: `${formatVolume(totals.volume)} kg` })
        ])
      ])
    );
  }
}
