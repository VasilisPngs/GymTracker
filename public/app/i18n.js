const STORAGE_KEY = "gymtracker.lang";
const LANGUAGES = ["en", "el"];

const STRINGS = {
  tabTrain: ["Train", "Προπόνηση"],
  tabHistory: ["History", "Ιστορικό"],
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
  noPrograms: ["No programs yet.", "Κανένα πρόγραμμα ακόμα."],
  newProgram: ["+ New program", "+ Νέο πρόγραμμα"],
  programNamePlaceholder: ["Program name (e.g. Push A)", "Όνομα προγράμματος (π.χ. Push A)"],
  programDay: ["Day", "Μέρα"],
  anyDay: ["Any day", "Οποιαδήποτε μέρα"],
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
  volumeSuffix: ["kg volume", "kg όγκος"],
  noWorkingSets: ["no working sets yet", "κανένα κύριο σετ ακόμα"],
  lastSession: ["Last {date}: {sets}", "Τελευταία {date}: {sets}"],
  addSet: ["+ Set", "+ Σετ"],
  addWarmup: ["+ Warm-up", "+ Ζέσταμα"],
  colSet: ["#", "#"],
  colKg: ["kg", "kg"],
  colReps: ["reps", "επαν."],
  colRir: ["rir", "rir"],
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

  historyTitle: ["History", "Ιστορικό"],
  newShort: ["+ New", "+ Νέα"],
  noSessions: ["No sessions logged yet.", "Δεν έχει καταγραφεί καμία προπόνηση."],
  newWorkout: ["New workout", "Νέα προπόνηση"],

  search: ["Search", "Αναζήτηση"],
  exerciseNotFound: ["Exercise not found.", "Η άσκηση δεν βρέθηκε."],
  bestE1rm: ["best e1RM kg", "καλύτερο e1RM kg"],
  heaviest: ["heaviest kg", "μέγιστα kg"],
  bestSession: ["best session kg", "καλύτερη προπόνηση kg"],
  sessionsLabel: ["sessions", "προπονήσεις"],
  estimated1rm: ["Estimated 1RM", "Εκτιμώμενο 1RM"],
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
  workoutsThisWeek: ["workouts this week", "προπονήσεις αυτή την εβδομάδα"],
  workingSetsLabel: ["working sets", "κύρια σετ"],
  weekStreak: ["week streak", "συνεχόμενες εβδομάδες"],
  weeklyVolume: ["Weekly volume", "Εβδομαδιαίος όγκος"],
  lastEightWeeks: ["last 8 weeks", "τελευταίες 8 εβδομάδες"],
  setsPerMuscle: ["Sets per muscle", "Σετ ανά μυϊκή ομάδα"],
  thisWeek: ["this week", "αυτή την εβδομάδα"],
  barFullAt: ["Bar is full at {count} hard sets per week.", "Η μπάρα γεμίζει στα {count} κύρια σετ την εβδομάδα."],
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
  ariaRir: ["reps in reserve", "επαναλήψεις σε απόθεμα"],
  ariaCompleteSet: ["complete set", "ολοκλήρωση σετ"],
  ariaExerciseOptions: ["exercise options", "επιλογές άσκησης"],
  ariaWorkoutOptions: ["workout options", "επιλογές προπόνησης"],

  timerGo: ["Go", "Πάμε"],
  timerSkip: ["Skip", "Παράλειψη"],
  timerDismiss: ["Dismiss", "Κλείσιμο"]
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
  Shoulders: "Ώμοι",
  Biceps: "Δικέφαλοι",
  Triceps: "Τρικέφαλοι",
  Legs: "Πόδια",
  Calves: "Γάμπες",
  Core: "Κορμός"
};

const SESSION_PRESETS = {
  Chest: "Στήθος",
  Back: "Πλάτη",
  Shoulders: "Ώμοι",
  Arms: "Χέρια",
  Legs: "Πόδια"
};

const EQUIPMENT = {
  Barbell: "Μπάρα",
  Dumbbell: "Αλτήρες",
  Machine: "Μηχάνημα",
  Cable: "Τροχαλία",
  Bodyweight: "Σωματικό βάρος",
  Other: "Άλλο"
};

const EXERCISES = {
  "Barbell Bench Press": "Πιέσεις στήθους με μπάρα",
  "Incline Barbell Bench Press": "Πιέσεις στήθους σε κεκλιμένο με μπάρα",
  "Incline Dumbbell Press": "Πιέσεις σε κεκλιμένο με αλτήρες",
  "Flat Dumbbell Press": "Πιέσεις στήθους με αλτήρες",
  "Chest Press Machine": "Πιέσεις στήθους σε μηχάνημα",
  "Cable Fly": "Ανοίγματα στην τροχαλία",
  "Pec Deck": "Πεταλούδα",
  "Weighted Dip": "Βυθίσεις με βάρος",
  "Pull Up": "Έλξεις σε μονόζυγο",
  "Lat Pulldown": "Έλξεις τροχαλίας στο στήθος",
  "Barbell Row": "Κωπηλατική με μπάρα",
  "Dumbbell Row": "Κωπηλατική με αλτήρα",
  "Seated Cable Row": "Κωπηλατική σε τροχαλία καθιστός",
  "Chest Supported Row": "Κωπηλατική με στήριξη στήθους",
  "Straight Arm Pulldown": "Έλξεις τροχαλίας με τεντωμένα χέρια",
  Deadlift: "Άρσεις θανάτου",
  "Overhead Press": "Πιέσεις ώμων με μπάρα",
  "Seated Dumbbell Press": "Πιέσεις ώμων με αλτήρες καθιστός",
  "Lateral Raise": "Πλάγιες άρσεις",
  "Cable Lateral Raise": "Πλάγιες άρσεις στην τροχαλία",
  "Reverse Pec Deck": "Ανάστροφη πεταλούδα",
  "Face Pull": "Έλξεις προς το πρόσωπο",
  "Barbell Curl": "Κάμψεις δικεφάλων με μπάρα",
  "Incline Dumbbell Curl": "Κάμψεις δικεφάλων σε κεκλιμένο",
  "Hammer Curl": "Κάμψεις σφυριού",
  "Cable Curl": "Κάμψεις δικεφάλων στην τροχαλία",
  "Preacher Curl": "Κάμψεις δικεφάλων στο πουπίτρο",
  "Close Grip Bench Press": "Πιέσεις πάγκου με κλειστή λαβή",
  "Triceps Pushdown": "Εκτάσεις τρικεφάλων στην τροχαλία",
  "Overhead Cable Extension": "Εκτάσεις τρικεφάλων πάνω από το κεφάλι",
  "Skull Crusher": "Εκτάσεις τρικεφάλων ξαπλωτός",
  "Barbell Back Squat": "Καθίσματα με μπάρα",
  "Hack Squat": "Καθίσματα σε hack",
  "Leg Press": "Πιέσεις ποδιών",
  "Romanian Deadlift": "Ρουμανικές άρσεις θανάτου",
  "Bulgarian Split Squat": "Βουλγαρικά μονοποδικά καθίσματα",
  "Leg Extension": "Εκτάσεις τετρακεφάλων",
  "Seated Leg Curl": "Κάμψεις μηριαίων καθιστός",
  "Lying Leg Curl": "Κάμψεις μηριαίων πρηνής",
  "Hip Thrust": "Ωθήσεις λεκάνης",
  "Standing Calf Raise": "Άρσεις γάμπας όρθιος",
  "Seated Calf Raise": "Άρσεις γάμπας καθιστός",
  "Hanging Leg Raise": "Άρσεις ποδιών σε κρέμαση",
  "Cable Crunch": "Κοιλιακοί στην τροχαλία",
  Plank: "Σανίδα"
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

export function weekdayNames() {
  const format = new Intl.DateTimeFormat(locale(), { weekday: "long" });
  return Array.from({ length: 7 }, (item, index) => format.format(new Date(2024, 0, 1 + index)));
}

export const muscleGroupName = (value) => translateFrom(MUSCLE_GROUPS, value);
export const presetName = (value) => translateFrom(SESSION_PRESETS, value);
export const equipmentName = (value) => translateFrom(EQUIPMENT, value);
export const exerciseName = (value) => translateFrom(EXERCISES, value);
