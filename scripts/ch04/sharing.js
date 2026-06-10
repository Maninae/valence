/* 4.2 — two 1s clouds overlapping in phase.
   The shared-pair payoff. Static canvas: two gaussians + their reinforced
   sum painted as the midline density, plus a subtle wave overlay showing
   same-sign reinforcement. */
import { setupCanvas, cssVar, stageWidth } from "../shared.js";

export function initSharing() {
  const stage = document.getElementById("sharing-stage");
  if (!stage) return;

  const W = stageWidth(stage, 720);
  const H = 300;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);

  const cy = H / 2;
  const sep = Math.min(170, W * 0.32);
  const xL = W / 2 - sep / 2;
  const xR = W / 2 + sep / 2;
  const sigma = 50; // gaussian width

  // density field: g(x) = exp(-(x-xL)^2/(2 sigma^2)) + exp(-(x-xR)^2/(2 sigma^2))
  // in 1D along the bond axis. Paint as a soft horizontal strip.

  function gauss(x, x0) {
    const d = (x - x0) / sigma;
    return Math.exp(-d * d * 0.5);
  }

  // density strip below the nuclei
  const stripY = cy + 70;
  const stripH = 38;
  for (let x = 0; x < W; x++) {
    const v = gauss(x, xL) + gauss(x, xR);
    // squared sum is the "extra density between nuclei" effect
    const sq = v * v / 4;
    const a = Math.min(0.85, sq * 0.95);
    ctx.fillStyle = `rgba(45, 212, 237, ${a})`;
    ctx.fillRect(x, stripY, 1, stripH);
  }

  // tag the midline payoff. Caption sits clear of the strip.
  ctx.fillStyle = cssVar("--accent");
  ctx.font = "600 12px " + cssVar("--mono");
  ctx.textAlign = "center";
  ctx.fillText("|ψ_A + ψ_B|² — extra density between the nuclei",
    W / 2, stripY + stripH + 18);
  ctx.textAlign = "left";

  // two atomic 1s clouds
  for (const x of [xL, xR]) {
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, sigma * 1.6);
    g.addColorStop(0, "rgba(45, 212, 237, 0.65)");
    g.addColorStop(1, "rgba(45, 212, 237, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, stripY - 6);
  }

  // wave overlay along the axis (two same-sign cosines reinforcing)
  const axisY = cy - 70;
  ctx.strokeStyle = cssVar("--text-muted");
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, axisY);
  ctx.lineTo(W - 40, axisY);
  ctx.stroke();

  // wave A
  ctx.strokeStyle = "rgba(45, 212, 237, 0.7)";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    const y = axisY - 24 * gauss(x, xL) * Math.cos((x - xL) * 0.06);
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // wave B
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    const y = axisY - 24 * gauss(x, xR) * Math.cos((x - xR) * 0.06);
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // sum
  ctx.strokeStyle = cssVar("--accent");
  ctx.lineWidth = 2.2;
  ctx.shadowColor = cssVar("--accent");
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    const yA = -24 * gauss(x, xL) * Math.cos((x - xL) * 0.06);
    const yB = -24 * gauss(x, xR) * Math.cos((x - xR) * 0.06);
    const y = axisY + yA + yB;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = cssVar("--text-secondary");
  ctx.font = "12px " + cssVar("--mono");
  ctx.fillText("ψ_A  +  ψ_B  →  reinforced wave", 40, axisY - 38);

  // nuclei
  for (const [x, lbl] of [[xL, "H"], [xR, "H"]]) {
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, 12);
    g.addColorStop(0, "rgba(251, 113, 133, 1)");
    g.addColorStop(1, "rgba(251, 113, 133, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, cy, 9, 0, 7); ctx.fill();
    ctx.fillStyle = cssVar("--text-primary");
    ctx.font = "600 13px " + cssVar("--mono");
    ctx.textAlign = "center";
    ctx.fillText(lbl, x, cy + 28);
    ctx.textAlign = "left";
  }
}
