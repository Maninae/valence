/* 1.6 — boss level: identify the mystery orbital from its cloud. */
import { createOrbitalCloud } from "../orbital-cloud.js";

const POOL = [
  { n: 1, l: 0, m: 0 }, { n: 2, l: 0, m: 0 }, { n: 2, l: 1, m: 0 },
  { n: 3, l: 0, m: 0 }, { n: 3, l: 1, m: 0 }, { n: 3, l: 2, m: 0 },
  { n: 3, l: 2, m: -2 }, { n: 4, l: 0, m: 0 }, { n: 4, l: 1, m: 0 },
  { n: 4, l: 3, m: 0 },
];
const ROUNDS = 5;

const label = (o) => `${o.n}${"spdf"[o.l]}`;

export function initBoss() {
  const stage = document.getElementById("boss-stage");
  const optsEl = document.getElementById("boss-options");
  const readout = document.getElementById("boss-readout");
  const progress = document.getElementById("boss-progress");
  if (!stage || !optsEl) return;

  const cloud = createOrbitalCloud(stage, {
    n: 3, l: 2, m: 0, points: 13000, autoRotate: true, interactive: true,
  });

  let round = 0, score = 0, answer = null, locked = false;

  function pick() {
    answer = POOL[Math.floor(Math.random() * POOL.length)];
    cloud.setOrbital(answer.n, answer.l, answer.m);

    // 4 options with distinct labels, including the answer
    const labels = new Set([label(answer)]);
    while (labels.size < 4) {
      labels.add(label(POOL[Math.floor(Math.random() * POOL.length)]));
    }
    const shuffled = [...labels].sort(() => Math.random() - 0.5);

    optsEl.innerHTML = "";
    shuffled.forEach((name) => {
      const b = document.createElement("button");
      b.className = "quiz-option";
      b.textContent = name;
      b.addEventListener("click", () => answerWith(b, name));
      optsEl.appendChild(b);
    });
    readout.textContent = "hint: count radial nodes for n, read the shape (and its color family) for the letter";
    progress.textContent = `round ${round + 1} of ${ROUNDS} · score ${score}`;
    locked = false;
  }

  function answerWith(btn, name) {
    if (locked) return;
    locked = true;
    const correct = name === label(answer);
    if (correct) score++;
    btn.classList.add(correct ? "correct" : "wrong");
    if (!correct) {
      optsEl.querySelectorAll(".quiz-option").forEach((b) => {
        if (b.textContent === label(answer)) b.classList.add("correct");
      });
    }
    readout.textContent = correct
      ? `yes — that's ${label(answer)}`
      : `it was ${label(answer)} (n=${answer.n}, ℓ=${answer.l})`;
    round++;
    setTimeout(() => (round < ROUNDS ? pick() : finish()), 1600);
  }

  function finish() {
    optsEl.innerHTML = "";
    const msg =
      score === ROUNDS ? "perfect. you can read electron clouds." :
      score >= 3 ? "solid — the shapes are yours." :
      "the clouds win this time. revisit 1.4 and try again.";
    readout.textContent = `${score} / ${ROUNDS} — ${msg}`;
    progress.textContent = "";
    const again = document.createElement("button");
    again.className = "btn primary";
    again.textContent = "↻ play again";
    again.addEventListener("click", () => {
      round = 0; score = 0;
      pick();
    });
    optsEl.appendChild(again);
  }

  pick();
}
