/* Boss — "Call the bond". 6 rounds. Show a pair, hide EN values until
   the user picks a class, reveal ΔEN on the continuum bar. */
import { setupCanvas, cssVar, stageWidth, loadData } from "../shared.js";
import { drawContinuumBar, classifyBond, classifyKey, DELTA_MAX } from "./continuum-bar.js";

const ROUNDS = [
  { a: "C", b: "H" },     // even
  { a: "O", b: "H" },     // polar
  { a: "K", b: "F" },     // ionic
  { a: "N", b: "N" },     // even (Δ=0; but N–N not in elements? it is)
  { a: "Mg", b: "Cl" },   // ionic
  { a: "H", b: "F" },     // polar (very) — borderline
];

const OPTS = [
  { key: "even", label: "nearly even sharing" },
  { key: "polar", label: "polar" },
  { key: "ionic", label: "ionic" },
];

export async function initBoss() {
  const stage = document.getElementById("boss-stage");
  const optsEl = document.getElementById("boss-options");
  const readout = document.getElementById("boss-readout");
  const progress = document.getElementById("boss-progress");
  if (!stage || !optsEl) return;

  const elements = await loadData("elements");
  const byMap = Object.fromEntries(elements.map((e) => [e.symbol, e]));

  // build expanded pool — shuffle rounds for replay variety
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const W = stageWidth(stage, 860);
  const H = 220;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);

  let rounds = shuffle(ROUNDS);
  let i = 0;
  let score = 0;
  let revealed = false;

  function drawScene(reveal) {
    ctx.clearRect(0, 0, W, H);
    const r = rounds[i];
    const eA = byMap[r.a];
    const eB = byMap[r.b];
    const dEN = Math.abs(eA.en - eB.en);

    // top: two element symbols, EN values hidden until reveal
    const cy = 60;
    const sep = Math.min(220, W * 0.34);
    const xA = W / 2 - sep / 2;
    const xB = W / 2 + sep / 2;

    // connecting line
    ctx.strokeStyle = cssVar("--rule-strong");
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(xA + 22, cy); ctx.lineTo(xB - 22, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const [x, sym, en] of [[xA, r.a, eA.en], [xB, r.b, eB.en]]) {
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, 22);
      g.addColorStop(0, "rgba(251, 113, 133, 0.85)");
      g.addColorStop(1, "rgba(251, 113, 133, 0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, cy, 14, 0, 7); ctx.fill();

      ctx.fillStyle = cssVar("--text-primary");
      ctx.font = "700 24px " + cssVar("--display");
      ctx.textAlign = "center";
      ctx.fillText(sym, x, cy + 8);

      ctx.fillStyle = reveal ? cssVar("--text-secondary") : cssVar("--text-muted");
      ctx.font = "12px " + cssVar("--mono");
      ctx.fillText(reveal ? `χ = ${en.toFixed(2)}` : "χ = ?", x, cy + 36);
      ctx.textAlign = "left";
    }

    // bottom: continuum bar (always drawn; marker only when revealed)
    const markers = reveal
      ? [{ d: Math.min(DELTA_MAX, dEN), label: `Δχ = ${dEN.toFixed(2)}`, highlight: true }]
      : [];
    drawContinuumBar(ctx, 30, 130, W - 60, 26, { markers });
  }

  function showOptions() {
    optsEl.innerHTML = "";
    optsEl.style.gridTemplateColumns = "1fr 1fr 1fr";
    OPTS.forEach((o) => {
      const b = document.createElement("button");
      b.className = "quiz-option";
      b.textContent = o.label;
      b.addEventListener("click", () => answerWith(b, o.key));
      optsEl.appendChild(b);
    });
  }

  function answerWith(btn, key) {
    if (revealed) return;
    revealed = true;
    const r = rounds[i];
    const eA = byMap[r.a]; const eB = byMap[r.b];
    const dEN = Math.abs(eA.en - eB.en);
    const correctKey = classifyKey(dEN);
    const correct = key === correctKey;
    if (correct) score++;
    btn.classList.add(correct ? "correct" : "wrong");
    if (!correct) {
      [...optsEl.querySelectorAll(".quiz-option")].forEach((b) => {
        if (b.textContent === OPTS.find((o) => o.key === correctKey).label) {
          b.classList.add("correct");
        }
      });
    }
    drawScene(true);
    const verdict = classifyBond(dEN);
    readout.innerHTML = correct
      ? `<span style="color: var(--green)">yes — ${r.a}–${r.b} sits at Δχ = ${dEN.toFixed(2)} (${verdict})</span>`
      : `<span style="color: var(--rose)">it's ${verdict} — Δχ = ${dEN.toFixed(2)}</span>`;
    progress.textContent = `round ${i + 1} of ${rounds.length} · score ${score}`;
    setTimeout(() => {
      i++;
      if (i < rounds.length) {
        revealed = false;
        pick();
      } else {
        finish();
      }
    }, 1700);
  }

  function pick() {
    drawScene(false);
    readout.textContent = "name the bond: nearly even sharing, polar, or ionic?";
    progress.textContent = `round ${i + 1} of ${rounds.length} · score ${score}`;
    showOptions();
  }

  function finish() {
    optsEl.innerHTML = "";
    const total = rounds.length;
    const msg =
      score === total ? "perfect — the dial is yours."
      : score >= 4 ? "solid — you read the dial."
      : "the dial wins this round. revisit 4.3 and try again.";
    readout.innerHTML = `<strong>${score} / ${total}</strong> — ${msg}`;
    progress.textContent = "";
    const again = document.createElement("button");
    again.className = "btn primary";
    again.textContent = "↻ play again";
    again.addEventListener("click", () => {
      rounds = shuffle(ROUNDS);
      i = 0; score = 0; revealed = false;
      pick();
    });
    optsEl.style.gridTemplateColumns = "1fr";
    optsEl.appendChild(again);
  }

  pick();
}
