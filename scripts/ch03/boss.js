/* Boss — "Read the map". 6 rounds, mixing comparison and locate types. */

import { loadData, SUBSHELL_COLORS } from "../shared.js";
import { createPTable, blockFill, blockColor, colorMix } from "./ptable.js";

const ROUNDS = 6;

function colorConfig(cfg) {
  return cfg.replace(/(\d+)([spdf])(\d+|\b)/g, (_, n, l, k) => {
    const c = SUBSHELL_COLORS[l] ? SUBSHELL_COLORS[l]() : "currentColor";
    return `<span style="color:${c}">${n}${l}${k}</span>`;
  });
}

function outerConfig(el) {
  const n = el.period;
  return (el.configSemantic || "")
    .match(/\d+[spdf]\d+/g)
    ?.filter((t) => {
      const m = t.match(/^(\d+)([spdf])\d+$/);
      return m && +m[1] === n && (m[2] === "s" || m[2] === "p");
    })
    .join(" ") || el.configSemantic;
}

// candidate pools (kept within data the reader has seen by ch3)
const COMPARE_POOL = [
  // [aZ, bZ]
  [11, 17], [3, 9], [19, 35], [12, 16], [4, 8],
  [3, 11], [11, 19], [9, 53], [8, 16], [6, 14],
  [11, 12], [17, 18], [19, 20], [3, 4], [29, 30],
];

const LOCATE_POOL = [
  // pick elements with clean outer configs
  6, 7, 8, 9, 14, 15, 16, 17, 32, 33, 34, 35, 50, 52,
  11, 19, 37, 4, 12, 20, 13, 31,
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function whyZeff(a, b, attr) {
  // a is winner, b is loser
  const samePeriod = a.period === b.period;
  const sameGroup = a.group === b.group;
  if (samePeriod) {
    return `same period, but ${a.symbol} sits further right — more protons, same shell, weak extra shielding. Higher Z<sub>eff</sub>, tighter grip.`;
  }
  if (sameGroup) {
    return `same group, but ${a.symbol} is higher up. Its valence electron sits in a smaller shell, closer to the nucleus. Higher Z<sub>eff</sub>, tighter grip.`;
  }
  return `${a.symbol} sits up-and-right of ${b.symbol} on the map. Both directions raise Z<sub>eff</sub>.`;
}

export async function initBoss() {
  const promptEl = document.getElementById("boss-prompt");
  const taskHintEl = document.getElementById("boss-task-hint");
  const optionsEl = document.getElementById("boss-options");
  const stageEl = document.getElementById("boss-stage");
  const readout = document.getElementById("boss-readout");
  const progress = document.getElementById("boss-progress");
  if (!promptEl || !optionsEl || !stageEl) return;

  const els = await loadData("elements");
  const main = els.filter((e) => e.z <= 86);
  const byZ = {};
  main.forEach((e) => (byZ[e.z] = e));

  // boss table (built once, hidden until locate rounds)
  const table = createPTable(stageEl, {});
  table.setElements(main);
  table.setMode((el) => ({
    fill: blockFill(el.block, 0.16),
    stroke: "var(--rule)",
    text: "var(--text-secondary)",
  }));

  let round = 0, score = 0, locked = false;

  const ROUND_TYPES = ["compare-ie1", "locate", "compare-radius", "compare-en", "locate", "compare-ie1"];

  function startRound() {
    locked = false;
    readout.textContent = "";
    optionsEl.innerHTML = "";
    stageEl.style.display = "none";

    const type = ROUND_TYPES[round];
    progress.textContent = `round ${round + 1} of ${ROUNDS} · score ${score}`;

    if (type === "locate") return setupLocate();
    if (type === "compare-radius") return setupCompare("radius");
    if (type === "compare-en") return setupCompare("en");
    return setupCompare("ie1");
  }

  // --- compare rounds ---

  function setupCompare(attr) {
    // attr ∈ "ie1" | "radius" | "en"
    let pair, a, b;
    for (let tries = 0; tries < 50; tries++) {
      pair = pick(COMPARE_POOL);
      a = byZ[pair[0]]; b = byZ[pair[1]];
      if (attr === "ie1" && a.ie1 != null && b.ie1 != null && a.ie1 !== b.ie1) break;
      if (attr === "radius" && a.radiusProxy && b.radiusProxy && a.radiusProxy !== b.radiusProxy) break;
      if (attr === "en" && a.en != null && b.en != null && a.en !== b.en) break;
    }

    const order = Math.random() < 0.5 ? [a, b] : [b, a];
    let prompt, sublabelFn, winnerCmp;
    if (attr === "ie1") {
      prompt = "Which has the <strong>higher first ionization energy</strong>?";
      sublabelFn = (el) => `IE₁ = ${el.ie1.toFixed(2)} eV`;
      winnerCmp = (x, y) => (x.ie1 > y.ie1 ? x : y);
    } else if (attr === "radius") {
      prompt = "Which is the <strong>bigger atom</strong>?";
      sublabelFn = (el) => `modeled r ≈ ${el.radiusProxy.toFixed(2)} Å`;
      winnerCmp = (x, y) => (x.radiusProxy > y.radiusProxy ? x : y);
    } else {
      prompt = "Which is more <strong>electronegative</strong>?";
      sublabelFn = (el) => (el.en != null ? `χ = ${el.en}` : "χ = —");
      winnerCmp = (x, y) => (x.en > y.en ? x : y);
    }

    const winner = winnerCmp(a, b);
    promptEl.innerHTML = prompt;
    taskHintEl.innerHTML = "click your answer";
    optionsEl.innerHTML = "";

    order.forEach((el) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.innerHTML = `${el.symbol}<span class="sub">${el.name}</span>`;
      btn.addEventListener("click", () => resolveCompare(btn, el, winner, a, b, attr, sublabelFn));
      optionsEl.appendChild(btn);
    });
  }

  function resolveCompare(btn, picked, winner, a, b, attr, sublabelFn) {
    if (locked) return;
    locked = true;
    const correct = picked.z === winner.z;
    btn.classList.add(correct ? "correct" : "wrong");
    if (!correct) {
      optionsEl.querySelectorAll(".quiz-option").forEach((x) => {
        if (x.firstChild.textContent.trim() === winner.symbol) x.classList.add("correct");
      });
    }
    if (correct) score++;
    const loser = winner.z === a.z ? b : a;
    readout.innerHTML = `
      <strong>${winner.symbol}</strong> wins · ${sublabelFn(winner)} vs ${sublabelFn(loser)}<br>
      <span style="color:var(--text-muted);">why: ${whyZeff(winner, loser, attr)}</span>`;
    round++;
    setTimeout(() => round < ROUNDS ? startRound() : finish(), 2000);
  }

  // --- locate rounds ---

  function setupLocate() {
    const z = pick(LOCATE_POOL);
    const el = byZ[z];
    const outer = outerConfig(el);
    promptEl.innerHTML = `An element's outer configuration is <span class="boss-config-target">${colorConfig(outer)}</span>.`;
    taskHintEl.innerHTML = "click its cell on the table below";
    stageEl.style.display = "";
    optionsEl.innerHTML = "";

    // hide tooltip extras for fairness — but show the outer config on hover
    table.setTooltipExtra(() => null);
    table.setClickable(true, (clicked) => resolveLocate(clicked, el));
  }

  function resolveLocate(clicked, answer) {
    if (locked) return;
    locked = true;
    table.setClickable(false, null);
    const correct = clicked.z === answer.z;
    if (correct) score++;
    table.flash(clicked.z);
    if (!correct) table.flash(answer.z);

    const aOuter = outerConfig(answer);
    readout.innerHTML = correct
      ? `yes — ${answer.symbol} (${answer.name}), Z=${answer.z}, outer ${colorConfig(aOuter)}.`
      : `that was ${clicked.symbol}. The answer is <strong>${answer.symbol}</strong> (${answer.name}, Z=${answer.z}), outer ${colorConfig(aOuter)}.`;

    round++;
    setTimeout(() => round < ROUNDS ? startRound() : finish(), 2400);
  }

  // --- end ---

  function finish() {
    stageEl.style.display = "none";
    promptEl.textContent = "";
    taskHintEl.textContent = "";
    optionsEl.innerHTML = "";
    const msg =
      score === ROUNDS ? "perfect — you read the map." :
      score >= 4 ? "solid: Zeff is your friend." :
      "review 3.4 and try again.";
    readout.innerHTML = `<strong>${score} / ${ROUNDS}</strong> — ${msg}`;
    progress.textContent = "";

    const again = document.createElement("button");
    again.className = "btn primary";
    again.textContent = "↻ play again";
    again.addEventListener("click", () => {
      round = 0; score = 0;
      startRound();
    });
    optionsEl.appendChild(again);
  }

  startRound();
}
