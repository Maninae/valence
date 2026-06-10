/* 2.2 — shielding diagram: nucleus, core-electron cloud, an outer s electron
   that pokes inside the core (feels strong nucleus) vs an outer d electron
   that sits outside (feels screened, weakened pull).
   No animation; one static frame on resize. Pure prop, no interaction. */

import { setupCanvas, cssVar, stageWidth, SUBSHELL_COLORS } from "../shared.js";

export function initShielding() {
  const stage = document.getElementById("shielding-stage");
  const readout = document.getElementById("shielding-readout");
  if (!stage) return;

  const W = stageWidth(stage, 760);
  const H = 320;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);

  const cx = W / 2;
  const cy = H / 2 + 8;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // ----- core electron cloud (shielding) -----
    const coreR = Math.min(W * 0.18, 110);
    const gCloud = ctx.createRadialGradient(cx, cy, 4, cx, cy, coreR);
    gCloud.addColorStop(0, "rgba(167, 139, 250, 0.32)");
    gCloud.addColorStop(0.7, "rgba(167, 139, 250, 0.14)");
    gCloud.addColorStop(1, "rgba(167, 139, 250, 0)");
    ctx.fillStyle = gCloud;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, 7);
    ctx.fill();

    // sample dots for the core cloud (low-rendered ~120)
    ctx.fillStyle = "rgba(167, 139, 250, 0.55)";
    for (let i = 0; i < 130; i++) {
      const u = Math.random();
      const r = coreR * Math.pow(u, 1.6);
      const a = Math.random() * 2 * Math.PI;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a) * 0.92;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // ----- nucleus -----
    const nucR = 9;
    const gNuc = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucR * 2.4);
    gNuc.addColorStop(0, "rgba(251, 113, 133, 0.95)");
    gNuc.addColorStop(0.55, "rgba(251, 191, 36, 0.5)");
    gNuc.addColorStop(1, "rgba(251, 191, 36, 0)");
    ctx.fillStyle = gNuc;
    ctx.beginPath();
    ctx.arc(cx, cy, nucR * 2.4, 0, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(251, 113, 133, 1)";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 7);
    ctx.fill();

    // labels on nucleus + core
    ctx.font = "11px " + cssVar("--mono");
    ctx.fillStyle = cssVar("--text-muted");
    ctx.textAlign = "center";
    ctx.fillText("nucleus  +Z", cx, cy + nucR * 2.4 + 16);
    ctx.fillStyle = "rgba(167, 139, 250, 0.85)";
    ctx.fillText("core electrons  −S", cx, cy - coreR - 8);

    // ----- two outer electrons: an s (penetrating) and a d (outside) -----

    // s orbital path: ellipse that crosses inside the core cloud
    const sCol = SUBSHELL_COLORS.s();
    const dCol = SUBSHELL_COLORS.d();
    const outerR = Math.min(W * 0.32, 180);

    // s electron at the deep inner-lobe position (to the left)
    const sX = cx - outerR * 0.78;
    const sY = cy;
    // outline of s cloud: dashed ellipse extending past + inside core
    ctx.strokeStyle = "rgba(45, 212, 237, 0.55)";
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx - outerR * 0.05, cy, outerR * 0.95, outerR * 0.42, 0, 0, 7);
    ctx.stroke();
    // a small "inner lobe" hint blob inside the core
    ctx.setLineDash([]);
    const sInner = ctx.createRadialGradient(cx - coreR * 0.45, cy, 0, cx - coreR * 0.45, cy, 22);
    sInner.addColorStop(0, "rgba(45, 212, 237, 0.55)");
    sInner.addColorStop(1, "rgba(45, 212, 237, 0)");
    ctx.fillStyle = sInner;
    ctx.beginPath();
    ctx.arc(cx - coreR * 0.45, cy, 22, 0, 7);
    ctx.fill();

    // s electron dot (penetrating, sitting near nucleus)
    drawElectron(ctx, sX + 16, sY - 4, sCol, "↑");

    // d electron well outside the core, to the right
    const dX = cx + outerR * 0.85;
    const dY = cy - 14;
    ctx.strokeStyle = "rgba(167, 139, 250, 0.55)";
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.4;
    // d cloud sketch: two off-center lobes (outside the core)
    ctx.beginPath();
    ctx.ellipse(cx + outerR * 0.55, cy - 22, outerR * 0.32, outerR * 0.18, -0.35, 0, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + outerR * 0.85, cy + 22, outerR * 0.32, outerR * 0.18, -0.35, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);

    drawElectron(ctx, dX, dY, dCol, "↑");

    // ----- arrows: pull felt -----
    // s electron pull arrow: thick, glowing, pointing to nucleus from s
    drawArrow(ctx, sX + 18, sY - 4, cx - 8, cy, sCol, 3, true);
    // d electron pull arrow: thin, muted
    drawArrow(ctx, dX - 6, dY + 4, cx + 12, cy, "rgba(167, 139, 250, 0.55)", 1.4, false);

    // labels for each electron
    ctx.font = "600 13px " + cssVar("--mono");
    ctx.textAlign = "left";
    ctx.fillStyle = sCol;
    ctx.fillText("outer s electron", 18, 26);
    ctx.font = "12px " + cssVar("--sans");
    ctx.fillStyle = cssVar("--text-secondary");
    ctx.fillText("penetrates the core", 18, 44);
    ctx.fillText("feels nearly the full +Z", 18, 60);
    ctx.fillStyle = sCol;
    ctx.font = "600 13px " + cssVar("--mono");
    ctx.fillText("Z_eff ≈ Z", 18, 80);

    ctx.textAlign = "right";
    ctx.fillStyle = dCol;
    ctx.fillText("outer d electron", W - 18, 26);
    ctx.font = "12px " + cssVar("--sans");
    ctx.fillStyle = cssVar("--text-secondary");
    ctx.fillText("stays outside the core", W - 18, 44);
    ctx.fillText("feels a screened, weak pull", W - 18, 60);
    ctx.fillStyle = dCol;
    ctx.font = "600 13px " + cssVar("--mono");
    ctx.fillText("Z_eff ≈ Z − S  (small)", W - 18, 80);
    ctx.textAlign = "left";

    if (readout) {
      readout.innerHTML = `same shell, different penetration → s sees more nucleus than d → <span style="color:${sCol}">E<sub>ns</sub></span> &lt; <span style="color:${dCol}">E<sub>nd</sub></span>`;
    }
  }

  function drawElectron(ctx, x, y, color, glyph) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
    g.addColorStop(0, color);
    g.addColorStop(1, color.replace(/^#/, "").length === 6 ? color + "00" : "transparent");
    // fallback for hex colors: use rgba via canvas trick
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = cssVar("--bg-deep");
    ctx.font = "600 11px " + cssVar("--mono");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, x, y + 1);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, lw, glow) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // head
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const ah = 8;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ah * Math.cos(ang - 0.35), y2 - ah * Math.sin(ang - 0.35));
    ctx.lineTo(x2 - ah * Math.cos(ang + 0.35), y2 - ah * Math.sin(ang + 0.35));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  draw();
}
