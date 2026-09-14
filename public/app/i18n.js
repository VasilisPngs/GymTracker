const STORAGE_KEY = "gymtracker.lang";
const LANGUAGES = ["en", "el"];

const STRINGS = {
  tabTrain: ["Train", "Προπόνηση"],
  tabSettings: ["Settings", "Ρυθμίσεις"],
  tabStats: ["Stats", "Στατιστικά"],

  statusSynced: ["Synced", "Συγχρονισμένο"],
  statusSyncing: ["Syncing", "Συγχρονισμός"],
  statusOffline: ["Offline", "Εκτός σύνδεσης"],
  statusRetry: ["Retry", "Επανάληψη"],
  statusQueued: ["Queued", "Σε ουρά"],
  statusSignIn: ["Sign in", "Σύνδεση"],
  sessionExpired: ["Access session expired. Your sets are safe and queued.", "Η συνεδρία Access έληξε. Τα σετ σου είναι ασφαλή και σε ουρά."],
  newVersion: ["New version ready", "Νέα έκδοση έτοιμη"],
  reload: ["Reload", "Επαναφόρτωση"],
  storageBlocked: [
    "Another GymTracker window is open with an older version. Close every other tab and reload.",
    "Ένα άλλο παράθυρο GymTracker είναι ανοιχτό με παλιότερη έκδοση. Κλείσε τις άλλες καρτέλες και φόρτωσε ξανά."
  ],
  storageFailed: ["Local storage could not be opened.", "Η τοπική αποθήκευση δεν άνοιξε."],

  cancel: ["Cancel", "Άκυρο"],
  delete: ["Delete", "Διαγραφή"],
  create: ["Create", "Δημιουργία"],
  remove: ["Remove", "Αφαίρεση"],
  all: ["All", "Όλες"],
  nameRequired: ["Name is required", "Το όνομα είναι υποχρεωτικό"],

  programs: ["Programs", "Προγράμματα"],
  newProgram: ["+ New program", "+ Νέο πρόγραμμα"],
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
  colRest: ["Rest (s)", "Διάλειμμα (δλ)"],
  topSet: ["Top set", "Βαρύτερο σετ"],
  setupPlaceholder: ["Note for this exercise", "Σχόλιο για τη συγκεκριμένη άσκηση"],
  neverTrained: ["Not trained yet", "Καμία ακόμα"],
  trainedToday: ["Today", "Σήμερα"],
  trainedYesterday: ["Yesterday", "Χθες"],
  trainedDaysAgo: ["{days} days ago", "Πριν {days} μέρες"],
  createNamed: ["Create \u00ab{name}\u00bb", "Δημιουργία \u00ab{name}\u00bb"],
  recent: ["Recent", "Πρόσφατα"],
  workout: ["Workout", "Προπόνηση"],
  sessionNamePlaceholder: ["Session name (e.g. Chest)", "Όνομα προπόνησης (π.χ. Στήθος)"],
  sessionNotes: ["Session notes", "Σημειώσεις προπόνησης"],
  addExercise: ["+ Add exercise", "+ Πρόσθεσε άσκηση"],
  noExercisesYet: ["No exercises yet. Add the first one below.", "Καμία άσκηση ακόμα. Πρόσθεσε την πρώτη παρακάτω."],
  finishWorkout: ["Finish workout", "Ολοκλήρωση προπόνησης"],
  workoutFinished: ["Workout finished", "Η προπόνηση ολοκληρώθηκε"],
  finished: ["finished", "ολοκληρωμένη"],
  workoutOptions: ["Workout options", "Επιλογές προπόνησης"],
  reopenWorkout: ["Reopen workout", "Άνοιγμα ξανά"],
  deleteWorkout: ["Delete workout", "Διαγραφή προπόνησης"],
  deleteWorkoutBody: ["This removes the session and all of its sets.", "Αφαιρεί την προπόνηση και όλα τα σετ της."],
  noWorkingSets: ["no working sets yet", "κανένα κύριο σετ ακόμα"],
  lastSession: ["Last {date}: {sets}", "Τελευταία {date}: {sets}"],
  addSet: ["+ Set", "+ Σετ"],
  addWarmup: ["+ Warm-up", "+ Ζέσταμα"],
  colSet: ["#", "#"],
  colKg: ["kg", "kg"],
  colReps: ["reps", "επαν."],
  setOptions: ["Set options", "Επιλογές σετ"],
  markWorking: ["Mark as working set", "Όρισε ως κύριο σετ"],
  markWarmup: ["Mark as warm-up", "Όρισε ως ζέσταμα"],
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
  heaviest: ["Heaviest kg", "Μέγιστα kg"],
  sessionsLabel: ["Sessions", "Προπονήσεις"],
  sessionsHeading: ["Sessions", "Προπονήσεις"],
  noLoggedSets: ["No logged sets for this exercise.", "Δεν υπάρχουν καταγεγραμμένα σετ για αυτή την άσκηση."],
  exerciseOptions: ["Exercise options", "Επιλογές άσκησης"],
  archive: ["Archive", "Αρχειοθέτηση"],
  unarchive: ["Unarchive", "Επαναφορά από αρχείο"],
  deleteExercise: ["Delete exercise", "Διαγραφή άσκησης"],
  deleteExerciseBody: [
    "Logged sets stay in past workouts but the exercise disappears from the catalog.",
    "Τα καταγεγραμμένα σετ μένουν στις παλιές προπονήσεις, αλλά η άσκηση φεύγει από τον κατάλογο."
  ],

  statsTitle: ["Stats", "Στατιστικά"],
  workoutsThisWeek: ["Workouts this week", "Προπονήσεις αυτή την εβδομάδα"],
  workingSetsLabel: ["Working sets", "Κύρια σετ"],
  setsPerMuscle: ["Sets per muscle", "Σετ ανά μυϊκή ομάδα"],
  progressPerExercise: ["Progress per exercise", "Πρόοδος ανά άσκηση"],
  lastWeekWas: ["Last week: {sessions} · {sets}", "Προηγούμενη εβδομάδα: {sessions} · {sets}"],
  thisWeek: ["This week", "Αυτή την εβδομάδα"],
  previousWeeks: ["Previous weeks", "Προηγούμενες εβδομάδες"],
  settingsTitle: ["Settings", "Ρυθμίσεις"],
  backup: ["Backup", "Αντίγραφο"],
  language: ["Language", "Γλώσσα"],
  theme: ["Theme", "Θέμα"],
  themeSystem: ["System", "Σύστημα"],
  themeLight: ["Light", "Φωτεινό"],
  themeDark: ["Dark", "Σκοτεινό"],
  themeBlack: ["Black", "Μαύρο"],
  exportBackup: ["Export backup (JSON)", "Εξαγωγή αντιγράφου (JSON)"],
  backupExported: ["Backup exported", "Το αντίγραφο εξήχθη"],

  ariaDecrease: ["decrease", "μείωση"],
  ariaIncrease: ["increase", "αύξηση"],
  ariaCompleteSet: ["complete set", "ολοκλήρωση σετ"],
  ariaExerciseOptions: ["exercise options", "επιλογές άσκησης"],
  ariaWorkoutOptions: ["workout options", "επιλογές προπόνησης"],

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
  LowerBack: "Ραχιαίοι",
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
