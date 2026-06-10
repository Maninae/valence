/* 2.5 — ionize a transition metal. Two stacked rows of orbital boxes:
   4s (top, higher energy in the NEUTRAL atom's view at that Z) and 3d (below).
   When the user removes 2 electrons, the 4s electrons fade and drift out.
   Reinforces "highest-energy electrons leave first → they leave from 4s,
   not 3d, in the neutral metal." */

import { loadData, setupCanvas, cssVar, SUBSHELL_COLORS } from "../shared.js";

const TARGETS = {
  Ti: { z: 22, fourS: 2, threeD: 2, ionLabel: "[Ar] 3d²" },
  Fe: { z: 26, fourS: 2, threeD: 6, ionLabel: "[Ar] 3d⁶" },
  Zn: { z: 30, fourS: 2, threeD: 10, ionLabel: "[Ar] 3d¹⁰" },
};

const sup = (n) => String(n).split("").map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d] || d).join("");

export async function initIonFormation() {
  const stage = document.getElementById("ion-stage");
  const pick = document.getElementById("ion-pick");
  const goBtn = document.getElementById("ion-go");
  const resetBtn = document.getElementById("ion-reset");
  const readout = document.getElementById("ion-readout");
  if (!stage || !pick) return;

  const W = Math.min(720, stage.clientWidth || 720);
  const H = 240;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);

  let sym = "Ti";
  let removeProgress = 0; // 0..1, animated fade
  let removed = false;

  const sCol = SUBSHELL_COLORS.s();
  const dCol = SUBSHELL_COLORS.d();

  function layout() {
    const t = TARGETS[sym];
    // box positions: 4s row near top, 3d row below
    const BOX_W = 34, BOX_H = 34, GAP = 8;
    const dCount = 5;
    const sCount = 1;
    // center each row independently
    const dRowW = dCount * BOX_W + (dCount - 1) * GAP;
    const sRowW = sCount * BOX_W;
    const cx = W / 2;
    const dStartX = cx - dRowW / 2;
    const sStartX = cx - sRowW / 2;
    return {
      t,
      yS: 60,
      yD: 150,
      sBox: { x: sStartX, y: 60, w: BOX_W, h: BOX_H },
      dBoxes: Array.from({ length: dCount }, (_, i) => ({
        x: dStartX + i * (BOX_W + GAP), y: 150, w: BOX_W, h: BOX_H,
      })),
    };
  }

  function drawBox(b, count, color, fadeOut = 0) {
    ctx.fillStyle = `color-mix(in srgb, ${color} ${count > 0 ? 12 : 6}%, var(--bg-elevated))`;
    ctx.strokeStyle = count > 0 ? color : cssVar("--rule-strong");
    ctx.lineWidth = 1;
    roundRect(ctx, b.x, b.y, b.w, b.h, 5);
    ctx.fill();
    ctx.stroke();
    // up/down arrows
    ctx.font = "600 19px " + cssVar("--mono");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (count >= 1) {
      ctx.globalAlpha = Math.max(0, 1 - fadeOut);
      ctx.fillStyle = color;
      ctx.fillText("↑", b.x + b.w * 0.3, b.y + b.h * 0.55 - fadeOut * 30);
    }
    if (count >= 2) {
      ctx.globalAlpha = Math.max(0, 1 - fadeOut);
      ctx.fillStyle = color;
      ctx.fillText("↓", b.x + b.w * 0.7, b.y + b.h * 0.55 - fadeOut * 30);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const L = layout();

    // labels
    ctx.font = "600 13px " + cssVar("--mono");
    ctx.fillStyle = sCol;
    ctx.fillText("4s", L.sBox.x - 36, L.sBox.y + L.sBox.h * 0.6);
    ctx.fillStyle = dCol;
    ctx.fillText("3d", L.dBoxes[0].x - 36, L.dBoxes[0].y + L.dBoxes[0].h * 0.6);

    // energy hint
    ctx.font = "11px " + cssVar("--mono");
    ctx.fillStyle = cssVar("--text-muted");
    ctx.textAlign = "right";
    ctx.fillText("higher energy →", W - 12, L.sBox.y - 10);
    ctx.fillText("lower energy", W - 12, L.dBoxes[0].y + L.dBoxes[0].h + 18);
    ctx.textAlign = "left";

    // 4s row: always 1 orbital. Fade out the electrons by removeProgress.
    drawBox(L.sBox, L.t.fourS, sCol, removed ? removeProgress : 0);

    // 3d row: 5 orbitals, populated by Hund (single-fill first, then pair)
    const dN = L.t.threeD;
    for (let i = 0; i < 5; i++) {
      let count;
      if (dN <= 5) count = (i < dN ? 1 : 0);
      else count = (i < dN - 5 ? 2 : (i < 5 ? 1 : 0));
      drawBox(L.dBoxes[i], count, dCol, 0);
    }

    // status line atop the figure
    ctx.font = "600 14px " + cssVar("--display");
    ctx.fillStyle = cssVar("--text-primary");
    ctx.textAlign = "center";
    const status = removed
      ? `${sym}²⁺  ${L.t.ionLabel}`
      : `neutral ${sym} (Z=${L.t.z})  [Ar] 3d${sup(L.t.threeD)} 4s²`;
    ctx.fillText(status, W / 2, 24);
    ctx.textAlign = "left";

    if (readout) {
      readout.textContent = removed
        ? `${sym}²⁺ formed by losing both 4s electrons. 3d is the lower-energy seat by this Z, so it stays.`
        : `Pick neutral ${sym}. Click "remove 2 electrons" to ionize.`;
    }
  }

  function animateOut() {
    if (removed) return;
    removed = true;
    removeProgress = 0;
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / 700);
      removeProgress = t;
      draw();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function reset() {
    removed = false;
    removeProgress = 0;
    draw();
  }

  pick.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      pick.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      sym = b.dataset.sym;
      reset();
    });
  });
  goBtn.addEventListener("click", animateOut);
  resetBtn.addEventListener("click", reset);

  draw();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
