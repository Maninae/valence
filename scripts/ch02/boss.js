/* 2.7 — boss level: "build the atom". 5 rounds (S, V, Fe, Cr, Cu).
   Pick the ground-state config among 4 candidates. Wrong answers are
   plausible: violate aufbau, Hund-pairing in a different order, or the
   "naive" aufbau answer for Cr/Cu. */

import { loadData, cssVar, SUBSHELL_COLORS } from "../shared.js";

const ROUNDS = [
  {
    sym: "S", z: 16,
    correct: "1s² 2s² 2p⁶ 3s² 3p⁴",
    options: [
      "1s² 2s² 2p⁶ 3s² 3p⁴",         // correct
      "1s² 2s² 2p⁶ 3s² 3p³ 4s¹",     // bad: skipped to 4s before 3p done
      "1s² 2s² 2p⁶ 3s¹ 3p⁵",         // bad: should fill 3s before 3p
      "1s² 2s² 2p⁶ 3p⁶",             // bad: skipped 3s
    ],
    explain: "Sulfur (Z=16): straightforward aufbau. The 16th electron is the fourth in 3p; Hund spread three first, then started pairing.",
  },
  {
    sym: "V", z: 23,
    correct: "[Ar] 3d³ 4s²",
    options: [
      "[Ar] 3d³ 4s²",                // correct
      "[Ar] 3d⁵",                    // bad: skipped 4s entirely
      "[Ar] 4s² 3d² 4p¹",            // bad: jumped to 4p before 3d done
      "[Ar] 3d⁵ 4s⁰",                // bad: half-filled-d shortcut where V isn't an exception
    ],
    explain: "Vanadium (Z=23): both 4s seats and three 3d seats. 4s filled first because at Z<21 it was the cheaper rung; the 3d electrons obey Hund (three unpaired).",
  },
  {
    sym: "Fe", z: 26,
    correct: "[Ar] 3d⁶ 4s²",
    options: [
      "[Ar] 3d⁶ 4s²",                // correct
      "[Ar] 3d⁸",                    // bad: would require empty 4s, no good reason
      "[Ar] 3d⁵ 4s² 4p¹",            // bad: opened 4p before finishing 3d
      "[Ar] 3d⁵ 4s³",                // bad: violates Pauli (3 electrons in 4s)
    ],
    explain: "Iron (Z=26): 4s² filled at Z<21 when it was the lowest open rung. The remaining 6 electrons fill 3d — one paired (Hund: spread to all 5, then start pairing).",
  },
  {
    sym: "Cr", z: 24,
    correct: "[Ar] 3d⁵ 4s¹",
    options: [
      "[Ar] 3d⁵ 4s¹",                // correct: the exception
      "[Ar] 3d⁴ 4s²",                // bad: the "naive" chart answer
      "[Ar] 3d⁶",                    // bad: skipped 4s entirely
      "[Ar] 3d⁵ 4s² 4p⁻¹",           // bad: negative count is nonsense
    ],
    explain: "Chromium (Z=24): the chart predicts 3d⁴ 4s². But 4s and 3d are so close that promoting one 4s electron to 3d gives a half-filled d (Hund-favored, low repulsion). Total energy wins.",
  },
  {
    sym: "Cu", z: 29,
    correct: "[Ar] 3d¹⁰ 4s¹",
    options: [
      "[Ar] 3d¹⁰ 4s¹",               // correct: the exception
      "[Ar] 3d⁹ 4s²",                // bad: the "naive" chart answer
      "[Ar] 3d¹⁰ 4p¹",               // bad: 4s is lower than 4p
      "[Ar] 3d⁸ 4s² 4p¹",            // bad: skipped finishing 3d
    ],
    explain: "Copper (Z=29): the chart predicts 3d⁹ 4s². But a filled d shell is so favorable that one 4s electron drops into 3d. Same logic as Cr, even stronger.",
  },
];

function colorize(cfg) {
  // wrap each (n)(sub)(superscript) token in a colored span
  return cfg.split(/\s+/).map((tok) => {
    const m = tok.match(/^(\[[A-Z][a-z]?\])$/);
    if (m) return `<span style="color:${cssVar("--text-muted")}">${tok}</span>`;
    const m2 = tok.match(/^(\d+)([spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/);
    if (m2) {
      const c = SUBSHELL_COLORS[m2[2]]();
      return `<span style="color:${c}">${tok}</span>`;
    }
    return tok;
  }).join(" ");
}

export function initBoss() {
  const stage = document.getElementById("boss-stage");
  const optsEl = document.getElementById("boss-options");
  const readout = document.getElementById("boss-readout");
  const progress = document.getElementById("boss-progress");
  if (!stage || !optsEl) return;

  // Big element symbol display
  stage.style.minHeight = "180px";
  stage.style.display = "flex";
  stage.style.alignItems = "center";
  stage.style.justifyContent = "center";
  stage.innerHTML = "";

  const card = document.createElement("div");
  card.style.cssText = `
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 20px 32px; border: 1px solid var(--rule-strong);
    border-radius: 14px; background: var(--bg-elevated);
    min-width: 200px; text-align: center;
  `;
  const symEl = document.createElement("div");
  symEl.style.cssText = `font-family: var(--display); font-size: 56px; font-weight: 700; color: var(--text-primary); line-height: 1;`;
  const zEl = document.createElement("div");
  zEl.style.cssText = `font-family: var(--mono); font-size: 13px; color: var(--text-muted); letter-spacing: 0.1em;`;
  const promptEl = document.createElement("div");
  promptEl.style.cssText = `font-family: var(--sans); font-size: 14px; color: var(--text-secondary); margin-top: 4px;`;
  promptEl.textContent = "ground-state configuration?";
  card.appendChild(symEl);
  card.appendChild(zEl);
  card.appendChild(promptEl);
  stage.appendChild(card);

  let round = 0;
  let score = 0;
  let locked = false;

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setup() {
    locked = false;
    const r = ROUNDS[round];
    symEl.textContent = r.sym;
    zEl.textContent = `Z = ${r.z}`;
    optsEl.innerHTML = "";
    const opts = shuffle(r.options);
    for (const opt of opts) {
      const b = document.createElement("button");
      b.className = "quiz-option";
      b.innerHTML = colorize(opt);
      b.dataset.value = opt;
      b.addEventListener("click", () => answer(b, opt));
      optsEl.appendChild(b);
    }
    readout.textContent = "";
    progress.textContent = `round ${round + 1} of ${ROUNDS.length} · score ${score}`;
  }

  function answer(btn, value) {
    if (locked) return;
    locked = true;
    const r = ROUNDS[round];
    const correct = value === r.correct;
    if (correct) score++;
    btn.classList.add(correct ? "correct" : "wrong");
    if (!correct) {
      optsEl.querySelectorAll(".quiz-option").forEach((b) => {
        if (b.dataset.value === r.correct) b.classList.add("correct");
      });
    }
    readout.innerHTML = `${correct ? "yes" : "the answer is " + colorize(r.correct)} — ${r.explain}`;
    progress.textContent = `round ${round + 1} of ${ROUNDS.length} · score ${score}`;
    round++;
    setTimeout(() => (round < ROUNDS.length ? setup() : finish()), 2400);
  }

  function finish() {
    optsEl.innerHTML = "";
    const msg =
      score === ROUNDS.length ? "perfect. you have the filling order, and you saw past Cr and Cu." :
      score >= 4 ? "strong — the rules are yours, and you spotted at least one exception." :
      score >= 3 ? "solid. revisit 2.4 for the curves, and 2.6 for why Cr and Cu cheat." :
      "the exceptions won this round. replay after rereading 2.6.";
    readout.textContent = `${score} / ${ROUNDS.length} — ${msg}`;
    progress.textContent = "";
    const again = document.createElement("button");
    again.className = "btn primary";
    again.textContent = "↻ play again";
    again.addEventListener("click", () => {
      round = 0;
      score = 0;
      setup();
    });
    optsEl.appendChild(again);
  }

  setup();
}
