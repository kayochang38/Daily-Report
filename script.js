/** ============================
 * Daily / Hourly Report front script
 * - スプレッドシートURL/ID保存
 * - 自動サーチ & 新規作成 & ヘッダ自動生成（GAS側）
 * - 日報 / 時報の2タブ
 * - HP / MP / 気分パレット / 一言メモ（時報）
 * - 日付自動セット（変更可）
 * - ローカルドラフト保存 & 3:00クリーンアップ
 * ============================ */

// ------- DOM取得 -------
const sheetUrlInput   = document.getElementById("sheetUrl");
const tabButtons  = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

// 日報
const dailyDateEl     = document.getElementById("dailyDate");
const dailyProductEl  = document.getElementById("dailyProduct");
const dailyProgressEl = document.getElementById("dailyProgress");
const dailyNextEl     = document.getElementById("dailyNext");
const dailyNotesEl    = document.getElementById("dailyNotes");
const dailySaveBtn    = document.getElementById("dailySaveBtn");

// ★ 日付変更でシートの内容ロード
dailyDateEl.addEventListener("change", handleDailyDateChange);

// 時報
const hpRange   = document.getElementById("hpRange");
const mpRange   = document.getElementById("mpRange");
const hpValueEl = document.getElementById("hpValue");
const mpValueEl = document.getElementById("mpValue");
const moodButtons = document.querySelectorAll(".mood:not(#toggleAdjust)");
const selectedColorInput = document.getElementById("selectedColor");
const hourlyMemoEl    = document.getElementById("hourlyMemo");
const hourlySaveBtn   = document.getElementById("hourlySaveBtn");
const msg = document.getElementById("message");

// ------- 定数 -------
const GAS_URL = "https://www.laboratomie.com/php/daily_report_relay.php";

const LS_SHEET_URL_KEY  = "dr_sheet_url_v2";
const LS_DAILY_DRAFT    = "dr_daily_draft_v2";
const LS_LAST_CLEAR_KEY = "dr_last_clear_v2";
const LS_HOURLY_DRAFT   = "dr_hourly_draft_v2";
const LS_HOURLY_COLOR   = "dr_hourly_color_v2";

let baseColor = null;

/* ============================
   ユーティリティ
============================ */
function debounce(fn, wait = 400) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const v = Math.round(Math.max(0, Math.min(255, x)));
        const h = v.toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("")
  );
}

// URLからスプレッドシートIDらしき部分を抜き出し
function extractSpreadsheetId(key) {
  if (!key) return "";
  const trimmed = key.trim();

  const m1 = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m1) return m1[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;

  if (trimmed.includes("google.com")) {
    const parts = trimmed.split("/");
    return parts.pop().split("?")[0].split("#")[0];
  }

  return trimmed;
}

// relay.php 経由でGASにPOST
async function callApi(payload) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "payload=" + encodeURIComponent(JSON.stringify(payload)),
  });

  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return null; }
}

async function handleDailyDateChange() {
  const sheetId = extractSpreadsheetId(sheetUrlInput.value.trim());
  const date    = dailyDateEl.value;

  // まず入力欄をクリア
  dailyProductEl.value  = "";
  dailyProgressEl.value = "";
  dailyNextEl.value     = "";
  dailyNotesEl.value    = "";

  // シートURL or 日付がなければここで終了
  if (!sheetId || !date) {
    // ローカルドラフトも更新しておく
    saveDailyDraft();
    return;
  }

  const payload = {
    action: "getDailyByDate",
    spreadsheetKey: sheetId,
    date: date
  };

  msg.textContent = "読み込み中…";

  try {
    const res = await callApi(payload);

    if (res && res.status === "ok" && res.found && res.data) {
      const d = res.data;
      if (d.product  != null) dailyProductEl.value  = d.product;
      if (d.progress != null) dailyProgressEl.value = d.progress;
      if (d.next     != null) dailyNextEl.value     = d.next;
      if (d.notes    != null) dailyNotesEl.value    = d.notes;
      msg.textContent = "日報を読み込みました。";
    } else {
      // 見つからなかったときは空のまま
      msg.textContent = "この日の日報はまだありません。";
    }

    // 反映した内容でドラフト更新
    saveDailyDraft();

  } catch (err) {
    console.error(err);
    msg.textContent = "⚠️ 日報の読み込みに失敗しました。";
    alert("日報の読み込みに失敗しました。\n" + err.message);
  }
}

/* ============================
   タブ切り替え
============================ */
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    tabContents.forEach((content) => {
      if (content.id === `tab-${target}`) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });
  });
});

/* ============================
   HP / MP 表示
============================ */
function updateRangeDisplay() {
  hpValueEl.textContent = hpRange.value;
  mpValueEl.textContent = mpRange.value;
}
hpRange.addEventListener("input", updateRangeDisplay);
mpRange.addEventListener("input", updateRangeDisplay);

/* ============================
   ローカルドラフト保存
============================ */
const saveDailyDraft = debounce(() => {
  const draft = {
    date: dailyDateEl.value || "",
    product: dailyProductEl.value || "",
    progress: dailyProgressEl.value || "",
    next: dailyNextEl.value || "",
    notes: dailyNotesEl.value || "",
  };
  localStorage.setItem(LS_DAILY_DRAFT, JSON.stringify(draft));
}, 350);

[dailyDateEl, dailyProductEl, dailyProgressEl, dailyNextEl, dailyNotesEl].forEach(
  (el) => el.addEventListener("input", saveDailyDraft)
);

function loadDrafts() {
  // ===== 日報 =====
  try {
    const savedDaily = JSON.parse(localStorage.getItem(LS_DAILY_DRAFT) || "{}");
    if (savedDaily.date) dailyDateEl.value = savedDaily.date;
    if (savedDaily.product) dailyProductEl.value = savedDaily.product;
    if (savedDaily.progress) dailyProgressEl.value = savedDaily.progress;
    if (savedDaily.next) dailyNextEl.value = savedDaily.next;
    if (savedDaily.notes) dailyNotesEl.value = savedDaily.notes;
  } catch (e) {}

  updateRangeDisplay();

  // ===== 時報（すべて初期化）=====
  selectedColorInput.value = "";
  baseColor = null;

  moodButtons.forEach((b) => b.classList.remove("selected"));

  brightnessEl.value = "1";
  saturationEl.value = "1";
  warmthEl.value = "0";

  adjuster.classList.remove("open");
}


// 日報/時報ともにクリア
function clearAllDrafts() {
  // 日報
  dailyProductEl.value = "";
  dailyProgressEl.value = "";
  dailyNextEl.value = "";
  dailyNotesEl.value = "";
  localStorage.removeItem(LS_DAILY_DRAFT);

  // 日付はその日のまま残しておく（振り返りのため）

  // 時報
  hourlyMemoEl.value = "";
  localStorage.removeItem(LS_HOURLY_DRAFT);
  localStorage.removeItem(LS_HOURLY_COLOR);

  // HP/MPは真ん中に戻す
  hpRange.value = "5";
  mpRange.value = "5";
  updateRangeDisplay();

  // Mood UIリセット
  selectedColorInput.value = "";
  baseColor = null;
  moodButtons.forEach((b) => {
    b.classList.remove("selected");
    if (b.dataset.color) b.style.backgroundColor = b.dataset.color;
  });
}

/* ============================
   3:00 クリーンアップ
============================ */
function today3am() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0, 0);
}
function next3amFrom(now = new Date()) {
  const t = today3am();
  return now < t ? t : new Date(t.getTime() + 24 * 60 * 60 * 1000);
}
function maybeClearAt3AM_onLoad() {
  const last = parseInt(localStorage.getItem(LS_LAST_CLEAR_KEY) || "0", 10) || 0;
  const now = new Date();
  const cut = today3am().getTime();
  if (now.getTime() >= cut && last < cut) {
    clearAllDrafts();
    localStorage.setItem(LS_LAST_CLEAR_KEY, String(now.getTime()));
  }
}
function scheduleNextClearTimer() {
  const now = new Date();
  const next = next3amFrom(now);
  const ms = next.getTime() - now.getTime();
  setTimeout(() => {
    clearAllDrafts();
    localStorage.setItem(LS_LAST_CLEAR_KEY, String(Date.now()));
    scheduleNextClearTimer();
  }, ms);
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") maybeClearAt3AM_onLoad();
});

/* ============================
   スプレッドシートURL復元 & 初期化
============================ */
function setTodayDateIfEmpty() {
  if (!dailyDateEl.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dailyDateEl.value = `${yyyy}-${mm}-${dd}`;
  }
}

window.addEventListener("load", () => {
  const savedUrl = localStorage.getItem(LS_SHEET_URL_KEY);
  if (savedUrl) sheetUrlInput.value = savedUrl;

  setTodayDateIfEmpty();
  loadDrafts();
  maybeClearAt3AM_onLoad();
  scheduleNextClearTimer();
});

/* ============================
   日報の保存
============================ */
dailySaveBtn.addEventListener("click", async () => {
  const sheetId = extractSpreadsheetId(sheetUrlInput.value.trim());

  if (!sheetId) {
    alert("先にスプレッドシートを設定してください。");
    return;
  }

  localStorage.setItem(LS_SHEET_URL_KEY, sheetUrlInput.value.trim());

  const payload = {
    action: "appendDaily",
    spreadsheetKey: sheetId,
    data: {
        date: dailyDateEl.value || "",
        product: dailyProductEl.value || "",
        progress: dailyProgressEl.value || "",
        next: dailyNextEl.value || "",
        notes: dailyNotesEl.value || "",
    }
  };

  msg.textContent = "送信中…";

  try {
    await callApi(payload);
    msg.textContent = "✅ 日報をスプレッドシートに保存しました。（入力内容は保持されています）";

    // ローカルドラフトも更新
    saveDailyDraft();
  } catch (e) {
    console.error(e);
    msg.textContent = "⚠️ 日報の送信に失敗しました。";
  }
});

/* ============================
   時報の保存
============================ */
hourlySaveBtn.addEventListener("click", async () => {
  // URL → シートID 抽出
  const sheetId = extractSpreadsheetId(sheetUrlInput.value.trim());

  if (!sheetId) {
    alert("先にスプレッドシートを設定してください。");
    return;
  }

  localStorage.setItem(LS_SHEET_URL_KEY, sheetUrlInput.value.trim());

  // 時報データ
  const data = {
    hp: Number(hpRange.value),
    mp: Number(mpRange.value),
    color: selectedColorInput.value || "",
    memo: hourlyMemoEl.value || "",
  };

  const payload = {
    action: "appendHourly",
    spreadsheetKey: sheetId,
    data
  };

  msg.textContent = "送信中…";

  try {
    const res = await callApi(payload);

    // GAS 側が { status: "ok" } を返してくる前提
    if (!res || res.status !== "ok") {
      throw new Error(res && res.message ? res.message : "unknown error");
    }

    msg.textContent = "✅ 時報をスプレッドシートに保存しました。";

    // Hourly のドラフトは保持しない（念のため削除）
    localStorage.removeItem(LS_HOURLY_DRAFT);

    // リセット：HP/MP、メモ、気分色、選択状態
    hpRange.value = "5";
    mpRange.value = "5";
    hourlyMemoEl.value = "";
    selectedColorInput.value = "";
    baseColor = null;
    moodButtons.forEach((b) => b.classList.remove("selected"));
    adjuster.classList.remove("open");   // ★ 調整バーを自動で閉じる

    updateRangeDisplay();
  } catch (err) {
    console.error(err);
    msg.textContent = "⚠️ 時報の送信に失敗しました。";
    alert("保存に失敗しました。\n" + err.message);
  }
});

const brightnessEl = document.getElementById("brightness");
const saturationEl = document.getElementById("saturation");
const warmthEl     = document.getElementById("warmth");

/* ============================
   気分パレット（時報）
============================ */

/* ============================
   ⚙（調整バー）開閉イベント
============================ */
const toggleAdjustBtn = document.getElementById("toggleAdjust");
const adjuster        = document.getElementById("adjuster");

toggleAdjustBtn.addEventListener("click", () => {
  adjuster.classList.toggle("open");

  if (adjuster.classList.contains("open")) {
    // 現在選択中の色を編集対象にセット
    baseColor = selectedColorInput.value || null;

    // スライダー初期化
    brightnessEl.value = "1";
    saturationEl.value = "1";
    warmthEl.value     = "0";

    if (baseColor) {
      updateAdjustedColor();
    }
  }
});

moodButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const color = btn.dataset.color || "";

    // 全ボタンの選択解除 ＆ 元の色に戻す
    moodButtons.forEach((b) => {
      b.classList.remove("selected");
      b.style.backgroundColor = b.dataset.color;
    });

    // 無着色でなければ選択
    if (color !== "") {
      btn.classList.add("selected");
    }

    // → ⚙クリック時に編集される色
    selectedColorInput.value = color;
    baseColor = color || null;

    // ⚙は閉じない（理想仕様）
  });
});

/* ============================
   色調整ロジック
============================ */
function adjustColor(baseHex) {
  if (!baseHex) return baseHex;

  let [r, g, b] = hexToRgb(baseHex);

  const bright = parseFloat(brightnessEl.value);
  const sat    = parseFloat(saturationEl.value);
  const warm   = parseInt(warmthEl.value, 10);

  // 明度
  r *= bright; g *= bright; b *= bright;

  // 彩度
  const avg = (r + g + b) / 3;
  r = avg + (r - avg) * sat;
  g = avg + (g - avg) * sat;
  b = avg + (b - avg) * sat;

  // 暖色/寒色
  r += warm;
  b -= warm;

  return rgbToHex(r, g, b);
}


/* ============================
   調整 → パレットに反映
============================ */
function updateAdjustedColor() {
  if (!baseColor) return;

  const adj = adjustColor(baseColor);

  selectedColorInput.value = adj;

  moodButtons.forEach((b) => {
    if (b.classList.contains("selected")) {
      b.style.backgroundColor = adj;
    }
  });
}

brightnessEl.addEventListener("input", updateAdjustedColor);
saturationEl.addEventListener("input", updateAdjustedColor);
warmthEl.addEventListener("input", updateAdjustedColor);
