const STORAGE_KEY = "gymtracker.lang";
const LANGUAGES = ["en", "el"];

const STRINGS = {
  tabWorkout: ["Workout", "Προπόνηση"],
  tabSettings: ["Settings", "Ρυθμίσεις"],
  tabStats: ["Stats", "Στατιστικά"],

  statusSynced: ["Synced", "Συγχρονισμένο"],
  statusSyncing: ["Syncing", "Συγχρονισμός"],
  statusOffline: ["Offline", "Εκτός σύνδεσης"],
  statusRetry: ["Retrying", "Επανάληψη"],
  statusQueued: ["Queued", "Σε ουρά"],
  statusSignIn: ["Sign in", "Σύνδεση"],
  sessionExpired: ["Your Cloudflare Access session expired. Your sets are safe and queued.", "Η σύνδεση στο Cloudflare Access έληξε. Τα σετ σου είναι ασφαλή και σε ουρά."],
  reload: ["Reload", "Επαναφόρτωση"],
  storageBlocked: [
    "Another GymTracker window is open with an older version. Close every other tab and reload.",
    "Ένα άλλο παράθυρο GymTracker είναι ανοιχτό με παλιότερη έκδοση. Κλείσε τις άλλες καρτέλες και φόρτωσε ξανά."
  ],
  storageFailed: ["Local storage could not be opened.", "Δεν άνοιξε η τοπική αποθήκευση."],

  clearSearch: ["Clear search", "Καθαρισμός αναζήτησης"],
  cancel: ["Cancel", "Άκυρο"],
  delete: ["Delete", "Διαγραφή"],
  create: ["Create", "Δημιουργία"],
  remove: ["Remove", "Αφαίρεση"],
  all: ["All", "Όλες"],
  nameRequired: ["Name is required", "Το όνομα είναι υποχρεωτικό"],

  programs: ["Programs", "Προγράμματα"],
  newProgram: ["New program", "Νέο πρόγραμμα"],
  programNamePlaceholder: ["Name (e.g. Chest)", "Όνομα (π.χ. Στήθος)"],
  programEmpty: ["No exercises in this program yet.", "Καμία άσκηση σε αυτό το πρόγραμμα ακόμα."],
  programOptions: ["Program options", "Επιλογές προγράμματος"],
  deleteProgram: ["Delete program", "Διαγραφή προγράμματος"],
  deleteProgramBody: [
    "\u00ab{name}\u00bb will be removed. Finished workouts stay.",
    "Το \u00ab{name}\u00bb θα αφαιρεθεί. Οι ολοκληρωμένες προπονήσεις παραμένουν."
  ],
  startNow: ["Start now", "Έναρξη τώρα"],
  colSets: ["Sets", "Σετ"],
  colTargetReps: ["Reps", "Επαναλήψεις"],
  colTargetWeight: ["Kg", "Κιλά"],
  colRest: ["Rest (seconds)", "Διάλειμμα (δευτερόλεπτα)"],
  restAfterSet: ["Rest after set {n}", "Διάλειμμα μετά το σετ {n}"],
  noRest: ["No rest", "Χωρίς διάλειμμα"],
  restBeforeNext: ["Rest before the next exercise", "Διάλειμμα πριν την επόμενη άσκηση"],
  topSet: ["Top set", "Βαρύτερο σετ"],
  setupPlaceholder: ["Note for this exercise", "Σχόλιο για τη συγκεκριμένη άσκηση"],
  neverTrained: ["Never", "Ποτέ"],
  trainedToday: ["Today", "Σήμερα"],
  trainedYesterday: ["Yesterday", "Χθες"],
  trainedDaysAgo: ["{days} days ago", "Πριν από {days} μέρες"],
  createNamed: ["Create \u00ab{name}\u00bb", "Δημιουργία \u00ab{name}\u00bb"],
  workout: ["Workout", "Προπόνηση"],
  sessionNamePlaceholder: ["Session name (e.g. Chest)", "Όνομα προπόνησης (π.χ. Στήθος)"],
  sessionNotes: ["Session notes", "Σημειώσεις προπόνησης"],
  addExercise: ["Add exercise", "Προσθήκη άσκησης"],
  noExercisesYet: ["No exercises yet. Add the first one below.", "Καμία άσκηση ακόμα. Πρόσθεσε την πρώτη παρακάτω."],
  finishWorkout: ["Finish workout", "Ολοκλήρωση προπόνησης"],
  workoutFinished: ["Workout finished", "Η προπόνηση ολοκληρώθηκε"],
  finished: ["Finished", "Ολοκληρωμένη"],
  workoutOptions: ["Workout options", "Επιλογές προπόνησης"],
  reopenWorkout: ["Reopen workout", "Άνοιγμα ξανά"],
  deleteWorkout: ["Delete workout", "Διαγραφή προπόνησης"],
  deleteWorkoutBody: ["This removes the session and all of its sets.", "Αφαιρεί την προπόνηση και όλα τα σετ της."],
  noWorkingSets: ["no working sets yet", "κανένα κύριο σετ ακόμα"],
  lastSession: ["Last {date}: {sets}", "Τελευταία {date}: {sets}"],
  addSet: ["Set", "Σετ"],
  addWarmup: ["Warm-up", "Ζέσταμα"],
  warmupMark: ["W", "Ζ"],
  colSet: ["#", "#"],
  colKg: ["Kg", "Κιλά"],
  colReps: ["Reps", "Επαναλήψεις"],
  setOptions: ["Set options", "Επιλογές σετ"],
  markWorking: ["Mark as working set", "Ορισμός ως κύριο σετ"],
  markWarmup: ["Mark as warm-up", "Ορισμός ως ζέσταμα"],
  deleteSet: ["Delete set", "Διαγραφή σετ"],
  openExerciseHistory: ["Open exercise history", "Άνοιγμα ιστορικού άσκησης"],
  moveUp: ["Move up", "Μετακίνηση πάνω"],
  moveDown: ["Move down", "Μετακίνηση κάτω"],
  removeFromWorkout: ["Remove from workout", "Αφαίρεση από την προπόνηση"],
  removeExercise: ["Remove exercise", "Αφαίρεση άσκησης"],
  removeExerciseBody: ["Remove {name} and its sets from this workout?", "Να αφαιρεθεί η {name} και τα σετ της από αυτή την προπόνηση;"],
  searchExercises: ["Search exercises", "Αναζήτηση ασκήσεων"],
  noExerciseMatch: ["No exercise matches.", "Καμία άσκηση δεν ταιριάζει."],
  createNewExercise: ["Create new exercise", "Δημιουργία νέας άσκησης"],
  newExercise: ["New exercise", "Νέα άσκηση"],
  exerciseNamePlaceholder: ["Exercise name", "Όνομα άσκησης"],


  search: ["Search", "Αναζήτηση"],
  exerciseNotFound: ["Exercise not found.", "Η άσκηση δεν βρέθηκε."],
  heaviest: ["Heaviest (kg)", "Μέγιστα κιλά"],
  sessionsLabel: ["Sessions", "Προπονήσεις"],
  sessionsHeading: ["Sessions", "Προπονήσεις"],
  noLoggedSets: ["No logged sets for this exercise.", "Δεν υπάρχουν καταγεγραμμένα σετ για αυτή την άσκηση."],
  exerciseOptions: ["Exercise options", "Επιλογές άσκησης"],
  deleteExercise: ["Delete exercise", "Διαγραφή άσκησης"],
  deleteExerciseBody: [
    "Every set logged for it is deleted too.",
    "Διαγράφονται και όλα τα σετ που έχεις καταγράψει."
  ],

  statsTitle: ["Stats", "Στατιστικά"],
  workoutsThisWeek: ["Workouts this week", "Προπονήσεις αυτή την εβδομάδα"],
  workingSetsLabel: ["Working sets", "Κύρια σετ"],
  setsPerMuscle: ["Sets per muscle", "Σετ ανά μυϊκή ομάδα"],
  progressPerExercise: ["Progress per exercise", "Πρόοδος ανά άσκηση"],
  lastWeekWas: ["Last week: {sessions} · {sets}", "Προηγούμενη εβδομάδα: {sessions} · {sets}"],
  thisWeek: ["This week (previous)", "Αυτή (προηγούμενη)"],
  previousWeeks: ["Previous weeks", "Προηγούμενες εβδομάδες"],
  settingsTitle: ["Settings", "Ρυθμίσεις"],
  appearance: ["Appearance", "Εμφάνιση"],
  backup: ["Backup", "Αντίγραφο"],
  language: ["Language", "Γλώσσα"],
  theme: ["Theme", "Θέμα"],
  themeSystem: ["System", "Σύστημα"],
  themeLight: ["Light", "Φωτεινό"],
  themeDark: ["Dark", "Σκούρο"],
  themeBlack: ["Black", "Μαύρο"],
  exportBackup: ["Export backup (JSON)", "Εξαγωγή αντιγράφου (JSON)"],
  backupExported: ["Backup exported", "Το αντίγραφο κατέβηκε"],

  ariaDecrease: ["decrease", "μείωση"],
  ariaIncrease: ["increase", "αύξηση"],
  ariaCompleteSet: ["complete set", "ολοκλήρωση σετ"],
  ariaExerciseOptions: ["exercise options", "επιλογές άσκησης"],
  ariaWorkoutOptions: ["workout options", "επιλογές προπόνησης"],
  workoutDuration: ["Workout duration", "Διάρκεια προπόνησης"],
  workoutDate: ["Workout date", "Ημερομηνία προπόνησης"],

  timerSkip: ["Skip", "Παράλειψη"]
};

const PLURALS = {
  set: [["set", "sets"], ["σετ", "σετ"]],
  exercise: [["exercise", "exercises"], ["άσκηση", "ασκήσεις"]],
  workingSet: [["working set", "working sets"], ["κύριο σετ", "κύρια σετ"]],
  session: [["session", "sessions"], ["προπόνηση", "προπονήσεις"]]
};

const MUSCLE_GROUPS = {
  Chest: "Στήθος",
  Back: "Πλάτη",
  LowerBack: "Οσφυϊκοί",
  Shoulders: "Ώμοι",
  Traps: "Τραπεζοειδείς",
  Biceps: "Δικέφαλοι",
  Triceps: "Τρικέφαλοι",
  Forearms: "Πήχεις",
  Quads: "Τετρακέφαλα",
  Hamstrings: "Δικέφαλα μηριαία",
  Glutes: "Γλουτοί",
  Adductors: "Προσαγωγοί",
  Abductors: "Απαγωγοί",
  Calves: "Γάμπες",
  Abs: "Κοιλιακοί"
};

export const i18nEvents = new EventTarget();

function detect() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.includes(stored)) return stored;
  } catch {}
  return (navigator.language || "en").toLowerCase().startsWith("el") ? "el" : "en";
}

let current = detect();
let index = LANGUAGES.indexOf(current);

export const language = () => current;
export const languages = () => [...LANGUAGES];
export const locale = () => (current === "el" ? "el-GR" : "en-GB");

export function setLanguage(next) {
  if (!LANGUAGES.includes(next) || next === current) return;
  current = next;
  index = LANGUAGES.indexOf(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  document.documentElement.lang = next;
  i18nEvents.dispatchEvent(new CustomEvent("changed"));
}

export function applyLanguage() {
  document.documentElement.lang = current;
}

export function t(key, params) {
  const entry = STRINGS[key];
  if (!entry) return key;
  const value = entry[index] || entry[0];
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name])));
}

export function tn(count, key) {
  const entry = PLURALS[key];
  if (!entry) return `${count} ${key}`;
  const forms = entry[index] || entry[0];
  return `${count} ${count === 1 ? forms[0] : forms[1]}`;
}

const translateFrom = (map, value) => (current === "el" && map[value] ? map[value] : value);

export function relativeDay(iso) {
  if (!iso) return t("neverTrained");
  const day = 86400000;
  const from = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today - from) / day);
  if (days <= 0) return t("trainedToday");
  if (days === 1) return t("trainedYesterday");
  return t("trainedDaysAgo", { days });
}

export const muscleGroupName = (value) => translateFrom(MUSCLE_GROUPS, value);
