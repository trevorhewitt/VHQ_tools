import { parseQuery, buildQuery, cipherDecode, cipherEncode } from "./utils.js";

const pageContainer = document.getElementById("pageContainer");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");

// Preserve and forward all incoming params to questionnaire.html
function parseIncomingParams() {
  const q = parseQuery(window.location.search);
  const c = q.c ?? "0";

  if (c === "1") {
    const payload = q.p ?? "";
    const decoded = cipherDecode(payload); // "rr=true&..."
    const inner = new URLSearchParams(decoded);
    const obj = {};
    for (const [k, v] of inner.entries()) obj[k] = v;

    // Keep cipher mode for forward navigation (re-encode decoded payload)
    obj.c = "1";
    obj.p = cipherEncode(decoded);
    return obj;
  }

  return q;
}

const incoming = parseIncomingParams();

// Local state for example-question selections (not required)
const exampleResponses = new Map(); // key -> 1..5

function createP(text) {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
}

function createExampleQuestion({ key, statement, arrowMode }) {
  // arrowMode: "yes" -> point to 5; "no" -> point to 1; "mid" -> point to 2,3,4; "none" -> no arrows
  const box = document.createElement("div");
  box.className = "exampleBox";

  const lab = document.createElement("div");
  lab.className = "exampleLabel";
  lab.textContent = `EXAMPLE QUESTION: ${statement}`;
  box.appendChild(lab);

  // Arrows aligned to 5 buttons (no spacers)
  if (arrowMode !== "none") {
    const arrowRow = document.createElement("div");
    arrowRow.className = "arrowRow";

    const arrows = ["", "", "", "", ""];
    if (arrowMode === "yes") arrows[4] = "↓";
    if (arrowMode === "no") arrows[0] = "↓";
    if (arrowMode === "mid") { arrows[1] = "↓"; arrows[2] = "↓"; arrows[3] = "↓"; }

    for (let i = 0; i < 5; i++) {
      const cell = document.createElement("div");
      cell.className = "arrowCell";
      cell.textContent = arrows[i];
      arrowRow.appendChild(cell);
    }

    box.appendChild(arrowRow);
  }

  // Likert as 5 equal button rectangles (uses shared CSS: likertButtons/likertBtn)
  const likert = document.createElement("div");
  likert.className = "likertButtons";

  const current = exampleResponses.get(key);

  for (let v = 1; v <= 5; v++) {
    const choice = document.createElement("label");
    choice.className = "likertBtn";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `ex_${key}`;
    radio.value = String(v);
    radio.checked = current === v;
    radio.addEventListener("change", () => exampleResponses.set(key, v));

    const t = document.createElement("span");
    if (v === 1) t.textContent = "1, no, not at all";
    else if (v === 5) t.textContent = "5, yes, very much so";
    else t.textContent = String(v);

    choice.appendChild(radio);
    choice.appendChild(t);
    likert.appendChild(choice);
  }

  box.appendChild(likert);
  return box;
}

// Pages (each page is rendered as austere content)
const PAGES = [
  // Page 0
  () => {
    const frag = document.createDocumentFragment();
    frag.appendChild(createP("Please read through these instructions carefully."));
    frag.appendChild(createP("In this questionnaire, you will be prompted to answer a series of questions about what you saw, which is called your “visual experience”."));
    return frag;
  },

  // Page 1
  () => {
    const frag = document.createDocumentFragment();
    frag.appendChild(createP("There will be 21 randomly ordered questions which you can answer on a scale from 1 to 5 where 1 means “no, not at all” and 5 means “yes, very much so”."));
    frag.appendChild(createP("Here is an example question:"));
    frag.appendChild(createExampleQuestion({
      key: "faces_yes",
      statement: "I saw smiling faces.",
      arrowMode: "yes",
    }));
    frag.appendChild(createP("You would answer 5 “yes, very much so\" if you saw something like one of these images during your visual experience, which do have smiling faces:"));

    const imgrow = document.createElement("div");
    imgrow.className = "imgrow";
    imgrow.innerHTML = `
      <img width="200" height="201" style="width:200px;height:201px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_gqGTMx8NBvEv4dm" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_diJSAsUcMX4pqS5" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_s5y0gafYA2r6p2I" alt="">
    `;
    frag.appendChild(imgrow);

    return frag;
  },

  // Page 2
  () => {
    const frag = document.createDocumentFragment();
    frag.appendChild(createP("Sometimes, the questions will not describe your experience at all, or even seem totally irrelevant to what you saw. In this case, you should answer 1 “no, not at all”"));
    frag.appendChild(createExampleQuestion({
      key: "faces_no",
      statement: "I saw smiling faces.",
      arrowMode: "no",
    }));
    frag.appendChild(createP("For example:"));

    const imgrow = document.createElement("div");
    imgrow.className = "imgrow";
    imgrow.innerHTML = `
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_kYPpllbbkLWjPcg" alt="">
      <img style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_UYUE4TRBrgePgeR" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_lSWBKkAgX2uCq1y" alt="">
    `;
    frag.appendChild(imgrow);

    return frag;
  },

  // Page 3
  () => {
    const frag = document.createDocumentFragment();
    frag.appendChild(createP("Other times, the questions will partially describe what you saw, but not perfectly. In this case, you should answer somewhere in between, such as 2, 3 or 4."));
    frag.appendChild(createExampleQuestion({
      key: "faces_mid",
      statement: "I saw smiling faces.",
      arrowMode: "mid",
    }));
    frag.appendChild(createP("For example:"));

    const imgrow = document.createElement("div");
    imgrow.className = "imgrow";
    imgrow.innerHTML = `
      <img width="200" height="199" style="width:200px;height:199px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_rtUU4PdmEB7KqFX" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_z8IyB2DmoG0iacc" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_SBbATyQ3Ci8lScP" alt="">
    `;
    frag.appendChild(imgrow);

    return frag;
  },

  // Page 4
  () => {
    const frag = document.createDocumentFragment();
    frag.appendChild(createP("Some questions will ask you if you saw something from a list of possibilities."));
    frag.appendChild(createExampleQuestion({
      key: "colours_list",
      statement: "I saw the colours red, green, or purple.",
      arrowMode: "none",
    }));
    frag.appendChild(createP("For these questions, you should answer “yes” if you saw any of these items, even if it was only some or one of them."));

    const imgrow1 = document.createElement("div");
    imgrow1.className = "imgrow";
    imgrow1.innerHTML = `
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_lSTKwkaUVDSm40a" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_vFBWRgtDgaGQ3hK" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_X9fZyAsCaMkauyx" alt="">
    `;
    frag.appendChild(imgrow1);

    frag.appendChild(createP("You would answer “no” if you saw none of these elements."));

    const imgrow2 = document.createElement("div");
    imgrow2.className = "imgrow";
    imgrow2.innerHTML = `
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_AkQahwsYxuHJe42" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_AnheVOnAdfqXMjX" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_ZfgsGRPhf1AItKV" alt="">
    `;
    frag.appendChild(imgrow2);

    return frag;
  },

  // Page 5
  () => {
    const frag = document.createDocumentFragment();
    frag.appendChild(createP("Finally, make sure to answer about what you literally saw, not how you might interpret what you saw."));
    frag.appendChild(createP("If you saw this image, you might be inclined to say that you saw a house with a face on it:"));

    const imgrow1 = document.createElement("div");
    imgrow1.className = "imgrow";
    imgrow1.innerHTML = `
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_LzF6K5BJMqrBsyA" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_5WWohA4jaKaItTz" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_gNriaS1egPgK6Ya" alt="">
    `;
    frag.appendChild(imgrow1);

    frag.appendChild(createP("However, in that context you should simply say you saw a house, as there are no actual faces in that image! Here is what a house with a face on it would mean:"));

    const imgrow2 = document.createElement("div");
    imgrow2.className = "imgrow";
    imgrow2.innerHTML = `
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_xtaMuXVl5jD5uEn" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_TRu1yYFcxHgk4Y7" alt="">
      <img width="200" height="200" style="width:200px;height:200px;" src="https://universityofsussex.eu.qualtrics.com/CP/Graphic.php?IM=IM_hvZv2HYmunTYCyN" alt="">
    `;
    frag.appendChild(imgrow2);

    frag.appendChild(createP("Overall, it's very important that you try to answer based on what you saw."));
    const p = document.createElement("p");
    p.innerHTML = `Do<em><strong> not </strong></em>answer questions based on what was in your imagination. <br><br> Click next to begin the questionnaire.`;
    frag.appendChild(p);

    return frag;
  },
];

let pageIndex = 0;

function render() {
  pageContainer.innerHTML = "";
  pageContainer.appendChild(PAGES[pageIndex]());

  backBtn.disabled = pageIndex === 0;
  nextBtn.textContent = (pageIndex === PAGES.length - 1) ? "Next" : "Next";
}

backBtn.addEventListener("click", () => {
  if (pageIndex === 0) return;
  pageIndex--;
  render();
});

nextBtn.addEventListener("click", () => {
  if (pageIndex < PAGES.length - 1) {
    pageIndex++;
    render();
    return;
  }

  // Final page: forward to questionnaire with preserved params.
  const u = new URL("questionnaire.html", window.location.href);
  u.search = buildQuery(incoming);
  window.location.href = u.toString();
});

render();