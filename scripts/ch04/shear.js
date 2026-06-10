/* 4.4 — why salt cleaves.
   2D top-down view of two rows of ions. Push the top row half a cell over;
   like charges line up, the layer flies apart with a faint shock + an
   explanatory label. */
import { setupCanvas, cssVar, stageWidth } from "../shared.js";

const COLS = 8;
const ROWS = 4;

export function initShear() {
  const stage = document.getElementById("shear-stage");
  const pushBtn = document.getElementById("shear-push");
  const resetBtn = document.getElementById("shear-reset");
  const readout = document.getElementById("shear-readout");
  if (!stage || !pushBtn) return;

  const W = stageWidth(stage, 720);
  const H = 260;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);

  const cell = Math.min(40, (W - 60) / COLS);
  const startX = (W - cell * (COLS - 1)) / 2;
  const startY = (H - cell * (ROWS - 1)) / 2 - 10;

  // ion charge: alternates with (i + j) parity. We'll shear the top two rows.
  let shift = 0; // px, applied to the top half (rows 0..1)
  let splitGap = 0; // vertical gap that opens when like charges face like charges
  let phase = "resting"; // resting | shearing | repelling

  const isCation = (i, j) => ((i + j) & 1) === 0;

  function drawIon(x, y, cation) {
    const r = cell * 0.32;
    const color = cation ? cssVar("--p-color") : cssVar("--s-color");
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.5);
    g.addColorStop(0, cation ? "rgba(251, 191, 36, 0.9)" : "rgba(45, 212, 237, 0.85)");
    g.addColorStop(1, cation ? "rgba(251, 191, 36, 0)" : "rgba(45, 212, 237, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = cssVar("--bg-deep");
    ctx.font = "700 11px " + cssVar("--mono");
    ctx.textAlign = "center";
    ctx.fillText(cation ? "+" : "−", x, y + 4);
    ctx.textAlign = "left";
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // draw bottom rows (rows 2..3) first
    for (let j = 2; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const x = startX + i * cell;
        const y = startY + j * cell;
        drawIon(x, y, isCation(i, j));
      }
    }

    // shear plane indicator (dashed line)
    const shearY = startY + 1.5 * cell + splitGap / 2;
    ctx.strokeStyle = cssVar("--rule-strong");
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(20, shearY); ctx.lineTo(W - 20, shearY);
    ctx.stroke();
    ctx.setLineDash([]);

    // top rows (rows 0..1), shifted by `shift`
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < COLS; i++) {
        const x = startX + i * cell + shift;
        const y = startY + j * cell - splitGap / 2;
        // wrap so the row stays the same size visually
        if (x > W - 10 || x < 10) continue;
        drawIon(x, y, isCation(i, j));
      }
    }

    // legend / caption depends on phase
    ctx.fillStyle = cssVar("--text-muted");
    ctx.font = "11.5px " + cssVar("--mono");
    ctx.textAlign = "center";
    if (phase === "repelling") {
      ctx.fillStyle = cssVar("--rose");
      ctx.fillText("like charges face like charges → cleavage", W / 2, 16);
    } else if (phase === "shearing") {
      ctx.fillText("shearing the top layer…", W / 2, 16);
    } else {
      ctx.fillText("opposite charges meet at every interface", W / 2, 16);
    }
    ctx.textAlign = "left";
  }

  function animate(target, splitTarget, dur, onDone) {
    const start = performance.now();
    const s0 = shift, g0 = splitGap;
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      shift = s0 + (target - s0) * e;
      splitGap = g0 + (splitTarget - g0) * e;
      draw();
      if (t < 1) requestAnimationFrame(tick);
      else onDone && onDone();
    }
    requestAnimationFrame(tick);
  }

  pushBtn.addEventListener("click", () => {
    phase = "shearing";
    readout.textContent = "shearing the top layer half a unit cell over…";
    animate(cell, 0, 600, () => {
      phase = "repelling";
      readout.innerHTML = "<span style='color: var(--rose)'>now every interface has like charges facing each other — the crystal cleaves</span>";
      // little repulsion bump
      animate(cell, 30, 350);
    });
  });

  resetBtn.addEventListener("click", () => {
    phase = "resting";
    readout.textContent = "resting crystal — opposite charges meet at every interface";
    animate(0, 0, 280);
  });

  draw();
}
