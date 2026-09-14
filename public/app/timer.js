import { el, clear, formatDuration } from "./dom.js";
import { t } from "./i18n.js";

let deadline = null;
let ticker = null;
let audioContext = null;
let wakeLock = null;
let wakeWanted = false;

function beep() {
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.55);
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.16);
    oscillator.connect(gain);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.6);
  } catch {}
  if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
}

function warmAudio() {
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
  } catch {}
}

function paint() {
  const bar = document.getElementById("timer-bar");
  if (!bar) return;
  if (deadline === null) {
    bar.hidden = true;
    clear(bar);
    return;
  }
  const remaining = (deadline - Date.now()) / 1000;
  if (remaining <= 0) {
    beep();
    stopRest();
    return;
  }
  bar.hidden = false;
  clear(bar);
  bar.append(
    el("span", { class: "timer-value num", text: formatDuration(remaining) }),
    el("button", { class: "btn small ghost", type: "button", text: "-30", onclick: () => adjust(-30) }),
    el("button", { class: "btn small ghost", type: "button", text: "+30", onclick: () => adjust(30) }),
    el("button", { class: "btn small primary", type: "button", text: t("timerSkip"), onclick: stopRest })
  );
}

function adjust(delta) {
  if (deadline === null) return;
  deadline = Math.max(Date.now(), deadline + delta * 1000);
  paint();
}

export function startRest(seconds) {
  if (!seconds || seconds <= 0) return;
  warmAudio();
  deadline = Date.now() + seconds * 1000;
  clearInterval(ticker);
  ticker = setInterval(paint, 250);
  paint();
}

export function stopRest() {
  deadline = null;
  clearInterval(ticker);
  ticker = null;
  paint();
}

export async function keepAwake(enabled) {
  wakeWanted = enabled;
  if (!("wakeLock" in navigator)) return;
  if (enabled && !wakeLock && document.visibilityState === "visible") {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    } catch {}
  }
  if (!enabled && wakeLock) {
    try {
      await wakeLock.release();
    } catch {}
    wakeLock = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (wakeWanted) keepAwake(true);
    paint();
  }
});
