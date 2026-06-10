/* 5.x — Boss: The Architect.
   Three molecules in sequence (NH3, CO2, N2), 3 checks max per molecule,
   glow disabled until the user presses check. Score + replay. */

import { createBuilder } from "./builder/controller.js";

const ROUND_IDS = ["NH3", "CO2", "N2"];
const MAX_CHECKS = 3;

export async function initBoss() {
  const svg = document.getElementById("boss-svg");
  if (!svg) return;

  const titleEl = document.getElementById("boss-title");
  const subEl = document.getElementById("boss-sub");
  const placedEl = document.getElementById("boss-placed");
  const totalEl = document.getElementById("boss-total");
  const checksEl = document.getElementById("boss-checks");
  const statusEl = document.getElementById("boss-status");
  const checkBtn = document.getElementById("boss-check");
  const resetBtn = document.getElementById("boss-reset");
  const progressEl = document.getElementById("boss-progress");

  // round state
  const round = {
    index: 0,
    checksUsed: 0,
    solved: [false, false, false],
    finished: false,
  };

  // ready flag: ignore onAttemptChange events fired by the initial load,
  // before the builder reference is bound and the boss is wired up.
  let ready = false;
  let builder;

  builder = await createBuilder({
    svg,
    dom: {
      title: titleEl,
      sub: subEl,
      placed: placedEl,
      total: totalEl,
      // skip per-atom list and ladder in boss
      atomList: null,
      status: null,
      hint: null,
      reset: null,
      ladder: null,
    },
    moleculeIds: ROUND_IDS,
    initialId: ROUND_IDS[0],
    glowMode: "none",
    allowAtomicWin: false,
    onAttemptChange: () => {
      if (!ready) return;
      // any change after a peek reverts to no-glow exam state
      builder.setGlowMode("none");
      // status hint
      setStatus(`changed — press check (${MAX_CHECKS - round.checksUsed} left).`, "");
    },
  });
  ready = true;

  function setStatus(msg, cls = "") {
    statusEl.textContent = msg;
    statusEl.className = "builder-status" + (cls ? " " + cls : "");
  }

  function updateChrome() {
    subEl.textContent = `Round ${round.index + 1} of ${ROUND_IDS.length}`;
    checksEl.textContent = String(MAX_CHECKS - round.checksUsed);
    const dots = round.solved.map((s, i) => {
      const cur = i === round.index ? "▶ " : "  ";
      const sym = s ? "✓" : (i < round.index ? "✗" : "•");
      return `${cur}${sym} ${ROUND_IDS[i]}`;
    }).join("   ");
    progressEl.textContent = dots;
  }

  function startRound(idx) {
    round.index = idx;
    round.checksUsed = 0;
    // the builder's pool was constructed from ROUND_IDS, so its indices align.
    builder.loadMolecule(idx);
    builder.setGlowMode("none");
    setStatus("build it, then press check.", "");
    updateChrome();
  }

  function handleCheck() {
    if (round.finished) return;
    if (round.solved[round.index]) return;
    round.checksUsed++;
    const result = builder.evaluateNow();
    // briefly reveal glow so the player can see where they stand
    builder.setGlowMode("live");
    if (result.won) {
      round.solved[round.index] = true;
      setStatus(`correct — ${builder.currentMolecule().fact}`, "win");
      updateChrome();
      setTimeout(advance, 1800);
    } else if (round.checksUsed >= MAX_CHECKS) {
      setStatus(`out of checks for ${builder.currentMolecule().name}. moving on.`, "fail");
      updateChrome();
      setTimeout(advance, 1800);
    } else {
      const issueMsg = result.issues[0]
        ? `not quite — try again. ${MAX_CHECKS - round.checksUsed} check${MAX_CHECKS - round.checksUsed === 1 ? "" : "s"} left.`
        : `not quite. ${MAX_CHECKS - round.checksUsed} left.`;
      setStatus(issueMsg, "fail");
      updateChrome();
    }
  }

  function advance() {
    if (round.index + 1 >= ROUND_IDS.length) return finish();
    startRound(round.index + 1);
  }

  function finish() {
    round.finished = true;
    const score = round.solved.filter(Boolean).length;
    const msg =
      score === ROUND_IDS.length ? "perfect — you're the Architect." :
      score === 2 ? "two of three. close." :
      score === 1 ? "one of three. revisit the builder." :
      "none through. the dots win this time.";
    setStatus(`${score} / ${ROUND_IDS.length} — ${msg}`, score === ROUND_IDS.length ? "win" : "");
    updateChrome();
    // swap check button for replay
    checkBtn.textContent = "↻ play again";
    checkBtn.onclick = replay;
  }

  function replay() {
    round.index = 0;
    round.checksUsed = 0;
    round.solved = [false, false, false];
    round.finished = false;
    checkBtn.textContent = "check";
    checkBtn.onclick = handleCheck;
    startRound(0);
  }

  checkBtn.addEventListener("click", handleCheck);
  resetBtn.addEventListener("click", () => {
    if (round.finished) return;
    // reset the current molecule attempt (preserves which round we're on, and the check count)
    const cur = builder.currentMolecule();
    builder.loadMolecule(builder.pool.findIndex((m) => m.id === cur.id));
    builder.setGlowMode("none");
    setStatus("cleared current molecule.", "");
  });

  // start
  startRound(0);
}
