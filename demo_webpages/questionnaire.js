import {
  parseQuery, toBool, toInt, clampInt,
  parseTSV, mulberry32, shuffleInPlace,
  cipherDecode, downloadTextFile
} from "./utils.js";

const app = document.getElementById("app");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");

// Hide page header (keeps HTML unchanged)
(function hideHeader() {
  const h1 = document.querySelector("h1");
  if (h1) h1.style.display = "none";
})();

// Exit warning (removed once data is saved)
function beforeUnloadHandler(e) {
  e.preventDefault();
  e.returnValue = "Are you sure you would like to exit the webpage?";
}
window.addEventListener("beforeunload", beforeUnloadHandler);

// ---- Params ----
function decodeParams() {
  const q = parseQuery(window.location.search);
  const c = q.c ?? "0";

  if (c === "1") {
    const payload = q.p ?? "";
    const decoded = cipherDecode(payload); // "rr=true&..."
    const inner = new URLSearchParams(decoded);
    const obj = {};
    for (const [k, v] of inner.entries()) obj[k] = v;
    obj._cipher = true;
    obj._cipherPayload = decoded;
    return obj;
  }

  q._cipher = false;
  q._cipherPayload = null;
  return q;
}

const params = decodeParams();

const cfg = {
  requireResponses: toBool(params.rr, true),
  includeBack: toBool(params.back, false),
  includeInfrequency: toBool(params.inf, true),
  qpp: clampInt(toInt(params.qpp, 5), 1, 50, 5),
  trial: (params.trial ?? "").trim(),
  condition: (params.cond ?? "").trim(),
  participantCode: (params.pid ?? "").trim(),
  seed: toInt(params.seed, null),
  onComplete: (params.done ?? "none").trim(), // none | close | redirect
  redirectUrl: (params.rurl ?? "").trim(),
  ciphered: !!params._cipher,
};

function ensureSeed() {
  if (Number.isInteger(cfg.seed)) return cfg.seed;
  const s = Math.floor(Math.random() * 2147483647) + 1;
  cfg.seed = s;
  return s;
}

// ---- State ----
const responseStart = new Date();
let questions = [];               // shuffled question objects
let pageIndex = 0;                // current page
const responses = new Map();      // questionId -> 1..5
let pendingMissing = new Set();   // questionIds missing on attempted next

// ---- Load TSV ----
async function loadQuestionKey() {
  const res = await fetch("./vhq_question_key.tsv", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load question key.");
  const text = await res.text();
  const rows = parseTSV(text);

  const items = rows.map(r => ({
    question: toInt(r.question, null),
    dimension: toInt(r.dimension, null),
    reversed: toInt(r.reversed, 0) === 1,
    expected: (r.expected ?? "").trim(),
    name: (r.name ?? "").trim(),
    text: (r.text ?? "").trim(),
  })).filter(q => Number.isInteger(q.question) && Number.isInteger(q.dimension));

  let filtered = items;
  if (!cfg.includeInfrequency) filtered = items.filter(q => q.dimension !== 7);

  const seed = ensureSeed();
  const rng = mulberry32(seed);
  filtered = filtered.slice();
  shuffleInPlace(filtered, rng);

  return filtered;
}

// ---- UI helpers ----
function setOverlay(show, text) {
  overlay.setAttribute("aria-hidden", show ? "false" : "true");
  if (text) overlayText.innerHTML = `<strong>${text}</strong>`;
}

function currentPageQuestions() {
  const start = pageIndex * cfg.qpp;
  const end = Math.min(questions.length, start + cfg.qpp);
  return questions.slice(start, end);
}

function totalPages() {
  return Math.ceil(questions.length / cfg.qpp);
}

function isAnswered(qid) {
  const v = responses.get(qid);
  return v >= 1 && v <= 5;
}

function isRequiredQuestion(q) {
  if (!cfg.requireResponses) return false;
  // Special case: Q21 must be left blank; never require it.
  if (q.question === 21) return false;
  return true;
}

function getMissingOnPage(pageQs) {
  if (!cfg.requireResponses) return [];
  const missing = [];
  for (const q of pageQs) {
    if (!isRequiredQuestion(q)) continue;
    if (!isAnswered(q.question)) missing.push(q.question);
  }
  return missing;
}

// ---- Render ----
function render() {
  const pageQs = currentPageQuestions();
  app.innerHTML = "";

  // Page indicator (minimal)
  const header = document.createElement("div");
  header.className = "row";
  const p = document.createElement("div");
  p.textContent = `Page ${pageIndex + 1} of ${totalPages()}`;
  header.appendChild(p);
  app.appendChild(header);

  // Questions
  for (const q of pageQs) {
    const block = document.createElement("div");
    block.className = "question";
    block.dataset.qid = String(q.question);

    // Per-question validation message (only shown if missing)
    const err = document.createElement("div");
    err.className = "small";
    err.dataset.errFor = String(q.question);
    err.style.margin = "0 0 6px 0";
    err.style.fontWeight = "600";
    err.style.color = "red";
    err.style.display = pendingMissing.has(q.question) ? "block" : "none";
    err.textContent = "Please answer this question:";
    block.appendChild(err);

    const st = document.createElement("div");
    st.className = "statement";
    st.textContent = q.text; // no question number displayed
    block.appendChild(st);

    // Likert as 5 equal button rectangles
    const likert = document.createElement("div");
    likert.className = "likertButtons";

    const current = responses.get(q.question);

    for (let v = 1; v <= 5; v++) {
      const lab = document.createElement("label");
      lab.className = "likertBtn";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q_${q.question}`; // internal only
      radio.value = String(v);
      radio.checked = (current === v);

      radio.addEventListener("change", () => {
        responses.set(q.question, v);

        // If this question was marked missing, clear the flag immediately.
        if (pendingMissing.has(q.question)) {
          pendingMissing.delete(q.question);
          const errEl = block.querySelector(`[data-err-for="${q.question}"]`);
          if (errEl) errEl.style.display = "none";
        }
      });

      const txt = document.createElement("span");
      if (v === 1) txt.textContent = "1, no, not at all";
      else if (v === 5) txt.textContent = "5, yes, very much so";
      else txt.textContent = String(v);

      lab.appendChild(radio);
      lab.appendChild(txt);
      likert.appendChild(lab);
    }

    block.appendChild(likert);
    app.appendChild(block);
  }

  // Navigation
  const nav = document.createElement("div");
  nav.className = "row";
  nav.style.marginTop = "14px";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "Back";
  backBtn.disabled = !cfg.includeBack || pageIndex === 0;
  backBtn.addEventListener("click", () => {
    if (pageIndex > 0) {
      pendingMissing = new Set(); // clear flags when moving pages
      pageIndex--;
      render();
    }
  });

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  const lastPage = (pageIndex === totalPages() - 1);
  nextBtn.textContent = lastPage ? "Finish" : "Next";

  nextBtn.addEventListener("click", async () => {
    // Validate this page only
    const missing = getMissingOnPage(pageQs);
    pendingMissing = new Set(missing);

    // Update current page UI without moving away
    if (missing.length > 0) {
      // Show red labels above missing items
      for (const qid of missing) {
        const errEl = app.querySelector(`[data-err-for="${qid}"]`);
        if (errEl) errEl.style.display = "block";
      }
      // Also hide any previously shown errors that are no longer missing
      for (const q of pageQs) {
        if (!missing.includes(q.question)) {
          const errEl = app.querySelector(`[data-err-for="${q.question}"]`);
          if (errEl) errEl.style.display = "none";
        }
      }

      // Scroll to first missing question (helps when qpp is large)
      const firstMissing = missing[0];
      const block = app.querySelector(`[data-qid="${firstMissing}"]`);
      if (block) block.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    pendingMissing = new Set();

    if (!lastPage) {
      pageIndex++;
      render();
      return;
    }

    await finish();
  });

  if (cfg.includeBack) nav.appendChild(backBtn);
  nav.appendChild(nextBtn);
  app.appendChild(nav);
}

// ---- Scoring + TSV ----
function computeDimensionAverages() {
  // Reverse-code for scoring only; raw responses saved as-is.
  // Exclude infrequency dimension (dimension == 7) from dimension means.
  const byName = new Map(); // name -> {sum, n}

  for (const q of questions) {
    if (q.dimension === 7) continue;
    const raw = responses.get(q.question);
    if (!(raw >= 1 && raw <= 5)) continue;

    const scored = q.reversed ? (6 - raw) : raw;
    const key = q.name || `dimension_${q.dimension}`;

    if (!byName.has(key)) byName.set(key, { sum: 0, n: 0 });
    const acc = byName.get(key);
    acc.sum += scored;
    acc.n += 1;
  }

  const out = new Map();
  for (const [k, acc] of byName.entries()) {
    out.set(k, acc.n > 0 ? (acc.sum / acc.n) : "");
  }
  return out;
}

function computeInfrequencyPass() {
  // Infrequency items: dimension==7 OR expected non-empty.
  // Special case: Q21 correct only if blank / missing.
  const infQs = questions.filter(q => q.dimension === 7 || (q.expected && q.expected !== ""));
  if (infQs.length === 0) return "";

  let pass = true;

  for (const q of infQs) {
    const raw = responses.get(q.question);

    if (q.question === 21) {
      const ok = !(raw >= 1 && raw <= 5);
      pass = pass && ok;
      continue;
    }

    const exp = (q.expected ?? "").trim();
    if (exp === "") continue;

    const expN = Number(exp);
    const ok = (raw >= 1 && raw <= 5) && Number.isFinite(expN) && raw === expN;
    pass = pass && ok;
  }

  return pass ? "true" : "false";
}

function tsvEscape(s) {
  return String(s ?? "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

function formatISO(d) {
  return d.toISOString();
}

function buildOutputTSV() {
  const responseEnd = new Date();
  const totalMs = responseEnd - responseStart;

  const dimMeans = computeDimensionAverages();
  const infPass = computeInfrequencyPass();

  const dimNames = Array.from(dimMeans.keys()).sort((a, b) => a.localeCompare(b));
  const qIds = Array.from(new Set(questions.map(q => q.question))).sort((a, b) => a - b);

  const headers = [
    "participant_code",
    "condition",
    "link",
    "response_start_time",
    "response_end_time",
    "response_total_time_ms",
    ...dimNames.map(n => `dim_${n}`),
    "passed_infrequency",
    ...qIds.map(id => `Q${id}`),
  ];

  const row = [
    tsvEscape(cfg.participantCode),
    tsvEscape(cfg.condition),
    tsvEscape(window.location.href),
    tsvEscape(formatISO(responseStart)),
    tsvEscape(formatISO(responseEnd)),
    String(totalMs),
    ...dimNames.map(n => {
      const v = dimMeans.get(n);
      return (typeof v === "number") ? String(v) : "";
    }),
    String(infPass),
    ...qIds.map(id => {
      const v = responses.get(id);
      return (v >= 1 && v <= 5) ? String(v) : "";
    }),
  ];

  return headers.join("\t") + "\n" + row.join("\t") + "\n";
}

// ---- Completion ----
async function finish() {
  setOverlay(true, "Saving...");

  const tsv = buildOutputTSV();

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const pid = cfg.participantCode ? cfg.participantCode : "participant";
  const cond = cfg.condition ? cfg.condition : "condition";
  const filename = `vhq_${pid}_${cond}_${ts}.tsv`;

  await downloadTextFile(filename, tsv);

  // Data is saved; remove exit warning for end screen and any subsequent navigation.
  window.removeEventListener("beforeunload", beforeUnloadHandler);

  setOverlay(true, "Completed.");

  if (cfg.onComplete === "close") {
    try { window.close(); } catch {}
    setOverlay(false);
    showCompleted();
    return;
  }

  if (cfg.onComplete === "redirect" && cfg.redirectUrl) {
    try {
      const u = new URL(cfg.redirectUrl);
      window.location.href = u.toString();
      return;
    } catch {
      setOverlay(false);
      showCompleted();
      return;
    }
  }

  setOverlay(false);
  showCompleted();
}

function showCompleted() {
  window.removeEventListener("beforeunload", beforeUnloadHandler);
  app.innerHTML = "";

  const box = document.createElement("div");
  box.className = "notice";
  box.textContent = "Questionnaire completed.";
  app.appendChild(box);
}

// ---- Init ----
(async function init() {
  try {
    questions = await loadQuestionKey();
    render();
  } catch {
    app.textContent = "Failed to load questionnaire.";
  }
})();