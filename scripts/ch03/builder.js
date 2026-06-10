/* 3.1 — Build the table from the filling order.
   Walks Z = 1..86, lighting each cell with its block color.
   Readout shows symbol + colored configSemantic. */

import { loadData, SUBSHELL_COLORS } from "../shared.js";
import { createPTable, blockFill, blockColor, colorMix } from "./ptable.js";

const MAX_Z = 86;
const STEP_MS = 200;

export async function initBuilder() {
  const stage = document.getElementById("builder-stage");
  const playBtn = document.getElementById("builder-play");
  const stepBtn = document.getElementById("builder-step");
  const resetBtn = document.getElementById("builder-reset");
  const scrub = document.getElementById("builder-scrub");
  const readout = document.getElementById("builder-readout");
  if (!stage || !playBtn) return;

  const els = await loadData("elements");
  const main = els.filter((e) => e.z <= MAX_Z);
  const byZ = {};
  main.forEach((e) => (byZ[e.z] = e));

  const table = createPTable(stage, {});
  table.setElements(main);

  let cur = 0;        // last revealed Z
  let timer = null;

  function modeFn(el) {
    if (el.z > cur) {
      return { fill: "var(--bg-deep)", text: "var(--text-muted)", stroke: "var(--rule)" };
    }
    return {
      fill: blockFill(el.block, 0.32),
      stroke: colorMix(blockColor(el.block), 0.7),
      text: blockColor(el.block),
      glowColor: blockColor(el.block),
    };
  }
  table.setMode(modeFn);
  table.setTooltipExtra((el) => {
    if (el.z > cur && cur < MAX_Z) return "(not placed yet)";
    return null;
  });

  function colorConfig(cfg) {
    // colors each subshell token (e.g., 4s2, 3d10) inline
    return cfg.replace(/(\d+)([spdf])(\d+|\b)/g, (_, n, l, k) => {
      const c = SUBSHELL_COLORS[l] ? SUBSHELL_COLORS[l]() : "currentColor";
      return `<span style="color:${c}">${n}${l}${k}</span>`;
    });
  }

  function updateReadout() {
    if (cur === 0) {
      readout.textContent = "press play to begin";
      return;
    }
    const el = byZ[cur];
    if (!el) return;
    const annotation =
      cur === 1 ? " — first electron, first row" :
      cur === 5 ? " — first p block element (2p starts)" :
      cur === 19 ? " — period 4 opens with 4s, not 3d" :
      cur === 21 ? " — 3d finally fills. A whole decade drops into the middle." :
      cur === 31 ? " — 4p resumes after the d block detour" :
      cur === 57 ? " — 4f opens (lanthanides, the floating strip)" :
      cur === MAX_Z ? " — radon. The table is complete (through period 6)." :
      "";
    readout.innerHTML = `
      <span class="symbig" style="color:${blockColor(el.block)};">Z=${el.z} · ${el.symbol}</span>
      <span style="color:var(--text-muted);">${el.name}</span><br>
      <span>${colorConfig(el.configSemantic)}</span><span style="color:var(--text-muted);">${annotation}</span>`;
  }

  function setCur(z) {
    cur = Math.max(0, Math.min(MAX_Z, z | 0));
    scrub.value = String(cur);
    table.redraw();
    updateReadout();
  }

  function flashCurrent() {
    if (cur > 0) table.flash(cur);
  }

  function tick() {
    if (cur >= MAX_Z) {
      stopPlay();
      return;
    }
    setCur(cur + 1);
    flashCurrent();
  }

  function startPlay() {
    if (timer) return;
    if (cur >= MAX_Z) setCur(0);
    playBtn.textContent = "⏸ pause";
    playBtn.classList.add("primary");
    timer = setInterval(tick, STEP_MS);
  }
  function stopPlay() {
    if (timer) clearInterval(timer);
    timer = null;
    playBtn.textContent = "▶ play";
  }

  playBtn.addEventListener("click", () => {
    if (timer) stopPlay();
    else startPlay();
  });
  stepBtn.addEventListener("click", () => {
    stopPlay();
    if (cur < MAX_Z) {
      setCur(cur + 1);
      flashCurrent();
    }
  });
  resetBtn.addEventListener("click", () => {
    stopPlay();
    setCur(0);
  });
  scrub.addEventListener("input", () => {
    stopPlay();
    setCur(+scrub.value);
  });

  // start at zero
  setCur(0);
}
