// ----- 多語系字串 -----
const i18n = {
  zh: {
    title: "肌力訓練倒數計時器",
    title_short: "Workout Timer",
    subtitle:
      "設定每組運動秒數、休息秒數與組數，按「開始」就能自動跑完整個循環。",
    label_work: "運動秒數 (秒)",
    label_rest: "休息秒數 (秒)",
    label_sets: "組數",
    hint_title: "使用說明 / Hint",
    hint_line1: "・時間到前 5 秒會每秒提示一聲。",
    hint_line2: "・按「結束」可隨時中止並重置計時。",
    hint_line3:
      "・此工具為單人訓練設計，若要多人共用可再拆成不同瀏覽器分頁。",
    btn_start: "開始",
    btn_stop: "結束",

    phase_idle: "待機中",
    phase_work: "運動",
    phase_rest: "休息",
    phase_done: "全部完成！辛苦了",

    sets_info: "組數：{current} / {total}",

    status_idle: "狀態：待機中",
    status_work: "狀態：第 {set} 組運動中",
    status_rest: "狀態：第 {set} 組休息中",
    status_done: "狀態：完成",

    total_time_zero: "總時間：約 0 秒",
    total_time_seconds: "總時間：約 {seconds} 秒",
    total_time_minutes: "總時間：約 {minutes} 分",
    total_time_minutes_seconds: "總時間：約 {minutes} 分 {seconds} 秒",

    theme_tooltip_dark: "切換為淺色主題",
    theme_tooltip_light: "切換為深色主題",
    lang_label: "語言",
  },
  en: {
    title: "Workout Timer",
    title_short: "Workout Timer",
    subtitle:
      "Set work seconds, rest seconds and number of sets, then press “Start” to run the whole cycle.",
    label_work: "Work seconds (sec)",
    label_rest: "Rest seconds (sec)",
    label_sets: "Sets",
    hint_title: "Hints / How to use",
    hint_line1: "・A short beep will play in each of the last 5 seconds.",
    hint_line2:
      "・Press “Stop” to cancel and reset the timer at any time.",
    hint_line3:
      "・Designed for single-person training; open multiple tabs for multiple users.",
    btn_start: "Start",
    btn_stop: "Stop",

    phase_idle: "Idle",
    phase_work: "Work",
    phase_rest: "Rest",
    phase_done: "All sets completed! Good job!",

    sets_info: "Sets: {current} / {total}",

    status_idle: "Status: Idle",
    status_work: "Status: Working – Set {set}",
    status_rest: "Status: Resting – Set {set}",
    status_done: "Status: Done",

    total_time_zero: "Total time: about 0 seconds",
    total_time_seconds: "Total time: about {seconds} seconds",
    total_time_minutes: "Total time: about {minutes} minutes",
    total_time_minutes_seconds:
      "Total time: about {minutes} min {seconds} sec",

    theme_tooltip_dark: "Switch to light theme",
    theme_tooltip_light: "Switch to dark theme",
    lang_label: "Language",
  },
};

let currentLang = localStorage.getItem("lang") || "zh";
let currentTheme = localStorage.getItem("theme") || "dark";

function t(key, vars) {
  const dict = i18n[currentLang] || i18n["zh"];
  let str = dict[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}

// ----- DOM 取得 -----
const progressCircle = document.getElementById("progress-ring");
const RADIUS = 95;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
if (progressCircle) {
  progressCircle.style.strokeDasharray =
    CIRCUMFERENCE + " " + CIRCUMFERENCE;
  progressCircle.style.strokeDashoffset = 0;
}

const timerValueEl = document.getElementById("timer-value");
const timerPhaseEl = document.getElementById("timer-phase");
const timerSetEl = document.getElementById("timer-set");
const statusLabelEl = document.getElementById("status-label");
const totalLabelEl = document.getElementById("total-label");

const workInput = document.getElementById("work-seconds");
const restInput = document.getElementById("rest-seconds");
const setsInput = document.getElementById("sets-count");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const langSelectEl = document.getElementById("lang-select");
const themeToggleBtn = document.getElementById("theme-toggle");

const hintToggleBtn = document.getElementById("hint-toggle");
const hintToggleIcon = document.getElementById("hint-toggle-icon");
const hintContent = document.getElementById("hint-content");

let hintCollapsed = false;

const rootEl = document.documentElement;

// ----- 計時狀態 -----
let timerId = null;
let phase = "idle"; // idle | work | rest | done
let currentSet = 0;
let remainingSec = 0;
let phaseTotalSec = 0;
let globalWorkSec = 0;
let globalRestSec = 0;
let globalSets = 0;

// ----- 工具函式 -----
function setProgress(percent) {
  if (!progressCircle) return;
  const p = Math.max(0, Math.min(1, percent || 0));
  const offset = CIRCUMFERENCE - p * CIRCUMFERENCE;
  progressCircle.style.strokeDashoffset = offset;
}

function formatTime(sec) {
  const s = Math.max(0, sec | 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

function updateTotalLabel() {
  if (!totalLabelEl) return;
  const w = parseInt(workInput?.value, 10) || 0;
  const r = parseInt(restInput?.value, 10) || 0;
  const n = parseInt(setsInput?.value, 10) || 0;
  let total = n * w + (n - 1) * r;
  if (!isFinite(total) || total < 0) total = 0;

  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  let text;
  if (total === 0) {
    text = t("total_time_zero");
  } else if (minutes === 0) {
    text = t("total_time_seconds", { seconds });
  } else if (seconds === 0) {
    text = t("total_time_minutes", { minutes });
  } else {
    text = t("total_time_minutes_seconds", { minutes, seconds });
  }
  totalLabelEl.textContent = text;
}

function resetState() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  phase = "idle";
  currentSet = 0;
  remainingSec = 0;
  phaseTotalSec = 0;
  setProgress(0);

  if (timerValueEl) timerValueEl.textContent = "00:00";
  if (timerPhaseEl) {
    timerPhaseEl.textContent = t("phase_idle");
    timerPhaseEl.className = "timer-phase phase-idle";
  }
  if (timerSetEl) {
    timerSetEl.textContent = t("sets_info", {
      current: 0,
      total: 0,
    });
  }
  if (statusLabelEl) {
    statusLabelEl.textContent = t("status_idle");
  }

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
}

// Web Audio 嗶聲
function playBeep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1200;
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.2,
      ctx.currentTime + 0.01
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + 0.18
    );
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {
    // 靜音略過
  }
}

function nextPhase() {
  if (phase === "work") {
    if (globalRestSec > 0) {
      // 運動 -> 休息
      phase = "rest";
      remainingSec = globalRestSec;
      phaseTotalSec = globalRestSec;
      if (timerPhaseEl) {
        timerPhaseEl.textContent = t("phase_rest");
        timerPhaseEl.className = "timer-phase phase-rest";
      }
      if (statusLabelEl) {
        statusLabelEl.textContent = t("status_rest", {
          set: currentSet,
        });
      }
      setProgress(1);
      return;
    } else {
      // 不休息 -> 判斷是否下一組
      if (currentSet < globalSets) {
        currentSet++;
        phase = "work";
        remainingSec = globalWorkSec;
        phaseTotalSec = globalWorkSec;
        if (timerPhaseEl) {
          timerPhaseEl.textContent = t("phase_work");
          timerPhaseEl.className = "timer-phase phase-work";
        }
        if (statusLabelEl) {
          statusLabelEl.textContent = t("status_work", {
            set: currentSet,
          });
        }
        if (timerSetEl) {
          timerSetEl.textContent = t("sets_info", {
            current: currentSet,
            total: globalSets,
          });
        }
        setProgress(1);
        return;
      } else {
        finishAll();
        return;
      }
    }
  } else if (phase === "rest") {
    if (currentSet < globalSets) {
      currentSet++;
      phase = "work";
      remainingSec = globalWorkSec;
      phaseTotalSec = globalWorkSec;
      if (timerPhaseEl) {
        timerPhaseEl.textContent = t("phase_work");
        timerPhaseEl.className = "timer-phase phase-work";
      }
      if (statusLabelEl) {
        statusLabelEl.textContent = t("status_work", {
          set: currentSet,
        });
      }
      if (timerSetEl) {
        timerSetEl.textContent = t("sets_info", {
          current: currentSet,
          total: globalSets,
        });
      }
      setProgress(1);
      return;
    } else {
      finishAll();
      return;
    }
  }
}

function finishAll() {
  phase = "done";
  remainingSec = 0;
  phaseTotalSec = 0;

  if (timerValueEl) timerValueEl.textContent = "完成";
  if (timerPhaseEl) {
    timerPhaseEl.textContent = t("phase_done");
    timerPhaseEl.className = "timer-phase phase-done";
  }
  if (statusLabelEl) statusLabelEl.textContent = t("status_done");
  if (timerSetEl) {
    timerSetEl.textContent = t("sets_info", {
      current: globalSets,
      total: globalSets,
    });
  }
  setProgress(0);
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  // 完成多嗶兩聲
  playBeep();
  setTimeout(playBeep, 250);
}

function tick() {
  if (remainingSec <= 0) {
    nextPhase();
    return;
  }

  remainingSec -= 1;

  if (timerValueEl) timerValueEl.textContent = formatTime(remainingSec);
  if (phaseTotalSec > 0) {
    setProgress(remainingSec / phaseTotalSec);
  }

  if (remainingSec > 0 && remainingSec <= 5) {
    playBeep();
  }

  if (remainingSec <= 0) {
    nextPhase();
  }
}

// ----- Hint 收合 -----
function setHintCollapsed(collapsed) {
  hintCollapsed = collapsed;
  if (!hintContent || !hintToggleIcon) return;
  if (collapsed) {
    hintContent.classList.add("collapsed");
    hintToggleIcon.textContent = "▼";
  } else {
    hintContent.classList.remove("collapsed");
    hintToggleIcon.textContent = "▲";
  }
}

// 手機橫式時預設收合，其他預設展開
function initHintByOrientation() {
  const isPhoneLandscape =
    window.innerWidth <= 900 && window.innerWidth > window.innerHeight;
  setHintCollapsed(isPhoneLandscape);
}

// ----- 多語系 / 主題套用 -----
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });

  updateTotalLabel();

  if (langSelectEl) {
    langSelectEl.title = t("lang_label");
  }
  if (themeToggleBtn) {
    themeToggleBtn.title =
      currentTheme === "dark"
        ? t("theme_tooltip_dark")
        : t("theme_tooltip_light");
  }
}

function applyTheme() {
  rootEl.setAttribute("data-theme", currentTheme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = currentTheme === "dark" ? "🌙" : "☀️";
    themeToggleBtn.title =
      currentTheme === "dark"
        ? t("theme_tooltip_dark")
        : t("theme_tooltip_light");
  }
}

// ----- 事件綁定 -----
if (workInput) workInput.addEventListener("input", updateTotalLabel);
if (restInput) restInput.addEventListener("input", updateTotalLabel);
if (setsInput) setsInput.addEventListener("input", updateTotalLabel);

if (startBtn) {
  startBtn.addEventListener("click", () => {
    if (timerId) return;

    const w = parseInt(workInput?.value, 10);
    const r = parseInt(restInput?.value, 10);
    const n = parseInt(setsInput?.value, 10);

    if (!Number.isFinite(w) || w <= 0) {
      alert(
        currentLang === "zh"
          ? "請輸入大於 0 的運動秒數"
          : "Please enter a work duration greater than 0 seconds"
      );
      return;
    }
    if (!Number.isFinite(r) || r < 0) {
      alert(
        currentLang === "zh"
          ? "休息秒數不可為負數"
          : "Rest duration cannot be negative"
      );
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      alert(
        currentLang === "zh"
          ? "請輸入大於 0 的組數"
          : "Please enter a number of sets greater than 0"
      );
      return;
    }

    globalWorkSec = w;
    globalRestSec = r;
    globalSets = n;

    phase = "work";
    currentSet = 1;
    remainingSec = globalWorkSec;
    phaseTotalSec = globalWorkSec;

    if (timerPhaseEl) {
      timerPhaseEl.textContent = t("phase_work");
      timerPhaseEl.className = "timer-phase phase-work";
    }
    if (timerSetEl) {
      timerSetEl.textContent = t("sets_info", {
        current: currentSet,
        total: globalSets,
      });
    }
    if (statusLabelEl) {
      statusLabelEl.textContent = t("status_work", {
        set: currentSet,
      });
    }
    if (timerValueEl) timerValueEl.textContent = formatTime(remainingSec);
    setProgress(1);

    startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    timerId = setInterval(tick, 1000);
  });
}

if (stopBtn) {
  stopBtn.addEventListener("click", () => {
    resetState();
  });
}

if (langSelectEl) {
  langSelectEl.value = currentLang;
  langSelectEl.addEventListener("change", () => {
    currentLang = langSelectEl.value || "zh";
    localStorage.setItem("lang", currentLang);
    applyTranslations();
    resetState();
    initHintByOrientation();
  });
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", currentTheme);
    applyTheme();
  });
}

if (hintToggleBtn) {
  hintToggleBtn.addEventListener("click", () => {
    setHintCollapsed(!hintCollapsed);
  });
}

// 視窗旋轉時，如果是手機，重新決定是否預設收合
window.addEventListener("orientationchange", () => {
  initHintByOrientation();
});

// ----- 初始化 -----
applyTheme();
applyTranslations();
updateTotalLabel();
resetState();
initHintByOrientation();
