import { buildQuery, sanitiseToken, cipherEncode } from "./utils.js";

const els = {
  requireResponses: document.getElementById("requireResponses"),
  includeBack: document.getElementById("includeBack"),
  includeInfrequency: document.getElementById("includeInfrequency"),
  qpp: document.getElementById("qpp"),
  includeInstructions: document.getElementById("includeInstructions"),
  trialName: document.getElementById("trialName"),
  condition: document.getElementById("condition"),
  participantCode: document.getElementById("participantCode"),
  seed: document.getElementById("seed"),
  cipherLink: document.getElementById("cipherLink"),
  onComplete: document.getElementById("onComplete"),
  redirectUrl: document.getElementById("redirectUrl"),
  linkBox: document.getElementById("linkBox"),
  copyBtn: document.getElementById("copyBtn"),
  openBtn: document.getElementById("openBtn"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),
  redirectRow: document.getElementById("redirectRow"),
};

const DEFAULTS = {
  requireResponses: "true",
  includeBack: "false",
  includeInfrequency: "true",
  qpp: "5",
  includeInstructions: "false",
  trialName: "",
  condition: "",
  participantCode: "",
  seed: "",
  cipherLink: "true",
  onComplete: "none",
  redirectUrl: "",
};

function updateRedirectVisibility() {
  const show = els.onComplete.value === "redirect";
  els.redirectRow.style.display = show ? "block" : "none";
}

function getBaseDirUrl() {
  // Produces URL ending in /demo_webpages/ even if index.html is explicit.
  const u = new URL(window.location.href);
  const path = u.pathname;
  if (path.endsWith("/")) return u.origin + path;
  const parts = path.split("/");
  parts.pop();
  return u.origin + parts.join("/") + "/";
}

function setStatus(msg) {
  els.status.textContent = msg || "";
}

function readInputs() {
  const requireResponses = els.requireResponses.value;
  const includeBack = els.includeBack.value;
  const includeInfrequency = els.includeInfrequency.value;
  const qpp = els.qpp.value;
  const includeInstructions = els.includeInstructions.value;
  const cipherLink = els.cipherLink.value;
  const onComplete = els.onComplete.value;

  const trialName = sanitiseToken(els.trialName.value);
  const condition = sanitiseToken(els.condition.value);
  const participantCode = sanitiseToken(els.participantCode.value);

  if (trialName === null) return { error: "Invalid trial name." };
  if (condition === null) return { error: "Invalid condition." };
  if (participantCode === null) return { error: "Invalid participant code." };

  const seedRaw = els.seed.value.trim();
  let seed = "";
  if (seedRaw !== "") {
    const n = Number(seedRaw);
    if (!Number.isInteger(n)) return { error: "Seed must be an integer." };
    seed = String(n);
  }

  const redirectUrl = els.redirectUrl.value.trim();
  if (onComplete === "redirect" && redirectUrl === "") {
    return { error: "Redirect link is required when on complete action is 'go to link'." };
  }

  // Minimal validation: accept any absolute/relative URL for redirect.
  // If ciphering is enabled, it will be included inside the cipher payload.
  if (redirectUrl !== "") {
    try {
      new URL(redirectUrl); // absolute only
    } catch {
      return { error: "Redirect link must be an absolute URL." };
    }
  }

  // qpp bounds
  let qppNum = Number(qpp);
  if (!Number.isFinite(qppNum)) qppNum = 5;
  qppNum = Math.max(1, Math.min(50, Math.trunc(qppNum)));

  return {
    requireResponses,
    includeBack,
    includeInfrequency,
    qpp: String(qppNum),
    includeInstructions,
    trialName,
    condition,
    participantCode,
    seed,
    cipherLink,
    onComplete,
    redirectUrl,
  };
}

function buildLink() {
  updateRedirectVisibility();
  const base = getBaseDirUrl();
  const cfg = readInputs();
  if (cfg.error) {
    setStatus(cfg.error);
    els.linkBox.value = "";
    els.openBtn.disabled = true;
    els.copyBtn.disabled = true;
    return;
  }
  setStatus("");

  const target = cfg.includeInstructions === "true" ? "instructions.html" : "questionnaire.html";
  const rawParams = {
    rr: cfg.requireResponses,
    back: cfg.includeBack,
    inf: cfg.includeInfrequency,
    qpp: cfg.qpp,
    instr: cfg.includeInstructions,
    trial: cfg.trialName,
    cond: cfg.condition,
    pid: cfg.participantCode,
    seed: cfg.seed,
    done: cfg.onComplete,
    rurl: cfg.redirectUrl,
  };

  let url = base + target;

  if (cfg.cipherLink === "true") {
    const q = buildQuery(rawParams); // e.g. ?rr=true&...
    const payload = q.startsWith("?") ? q.slice(1) : q; // no leading ?
    const ctext = cipherEncode(payload);
    url += buildQuery({ c: "1", p: ctext });
  } else {
    url += buildQuery({ c: "0", ...rawParams });
  }

  els.linkBox.value = url;
  els.openBtn.disabled = false;
  els.copyBtn.disabled = false;
}

function reset() {
  els.requireResponses.value = DEFAULTS.requireResponses;
  els.includeBack.value = DEFAULTS.includeBack;
  els.includeInfrequency.value = DEFAULTS.includeInfrequency;
  els.qpp.value = DEFAULTS.qpp;
  els.includeInstructions.value = DEFAULTS.includeInstructions;
  els.trialName.value = DEFAULTS.trialName;
  els.condition.value = DEFAULTS.condition;
  els.participantCode.value = DEFAULTS.participantCode;
  els.seed.value = DEFAULTS.seed;
  els.cipherLink.value = DEFAULTS.cipherLink;
  els.onComplete.value = DEFAULTS.onComplete;
  els.redirectUrl.value = DEFAULTS.redirectUrl;
  buildLink();
}

for (const k of Object.keys(els)) {
  const el = els[k];
  if (!el) continue;
  if (["copyBtn", "openBtn", "resetBtn", "linkBox", "status"].includes(k)) continue;
  el.addEventListener("input", buildLink);
  el.addEventListener("change", buildLink);
}

els.copyBtn.addEventListener("click", async () => {
  const text = els.linkBox.value.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied.");
  } catch {
    setStatus("Copy failed.");
  }
});

els.openBtn.addEventListener("click", () => {
  const text = els.linkBox.value.trim();
  if (!text) return;
  window.open(text, "_blank", "noopener,noreferrer");
});

els.resetBtn.addEventListener("click", reset);

updateRedirectVisibility();
buildLink();