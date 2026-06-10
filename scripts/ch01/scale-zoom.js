/* 1.1 — log-zoom from the whole atom down to the nucleus. */
import { setupCanvas, cssVar, stageWidth } from "../shared.js";

const ATOM_R = 0.5e-10;     // m
const NUCLEUS_R = 2.5e-15;  // m
const FOV0 = 2e-10;         // field of view width at zoom 0, m

export function initScaleZoom() {
  const stage = document.getElementById("scale-stage");
  const slider = document.getElementById("scale-zoom");
  const readout = document.getElementById("scale-readout");
  if (!stage || !slider) return;

  const W = stageWidth(stage, 860);
  const H = 340;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);
  const cx = W / 2, cy = H / 2;

  // fixed sample of electron-cloud dots (1s-like falloff), in atom units
  const dots = [];
  for (let i = 0; i < 900; i++) {
    const r = -Math.log(1 - Math.random()) * 0.3 * ATOM_R;
    const a = Math.random() * 2 * Math.PI;
    const e = Math.random() * 2 - 1;
    dots.push([r * Math.cos(a) * Math.sqrt(1 - e * e), r * Math.sin(a) * e]);
  }

  function fmtMeters(m) {
    const exp = Math.floor(Math.log10(m));
    const mant = m / 10 ** exp;
    const sup = String(exp).replace(/-/, "⁻").replace(/\d/g,
      (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d]);
    return (mant >= 1.5 ? mant.toFixed(0) + "×" : "") + "10" + sup + " m";
  }

  function caption(z) {
    if (z < 0.4) return "the whole atom";
    if (z < 1.6) return "inside the electron cloud";
    if (z < 3.2) return "…still nothing…";
    if (z < 3.9) return "a speck appears";
    return "the nucleus — 99.97% of the mass";
  }

  function draw() {
    const z = +slider.value;
    const fov = FOV0 / 10 ** z;       // meters across the canvas width
    const pxPerM = W / fov;
    ctx.clearRect(0, 0, W, H);

    // electron cloud: fuzzy gradient, fades as we zoom past it
    const cloudPx = ATOM_R * pxPerM;
    const cloudAlpha = Math.max(0, 0.55 - z * 0.16);
    if (cloudAlpha > 0.01) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(cloudPx, W));
      g.addColorStop(0, `rgba(45, 212, 237, ${cloudAlpha})`);
      g.addColorStop(1, "rgba(45, 212, 237, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // sampled electron positions
    ctx.fillStyle = cssVar("--s-color");
    ctx.globalAlpha = Math.max(0.05, 0.8 - z * 0.25);
    for (const [dx, dy] of dots) {
      const x = cx + dx * pxPerM, y = cy + dy * pxPerM;
      if (x > -4 && x < W + 4 && y > -4 && y < H + 4) ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;

    // nucleus
    const nucPx = Math.max(NUCLEUS_R * pxPerM, 0.6);
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(nucPx * 2.2, 3));
    g2.addColorStop(0, "rgba(251, 113, 133, 1)");
    g2.addColorStop(0.5, "rgba(251, 191, 36, 0.5)");
    g2.addColorStop(1, "rgba(251, 191, 36, 0)");
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(nucPx * 2.2, 3), 0, 7);
    ctx.fill();

    // scale bar: 100 px worth of meters
    const barM = 100 / pxPerM;
    ctx.strokeStyle = cssVar("--text-muted");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, H - 26); ctx.lineTo(124, H - 26);
    ctx.moveTo(24, H - 31); ctx.lineTo(24, H - 21);
    ctx.moveTo(124, H - 31); ctx.lineTo(124, H - 21);
    ctx.stroke();
    ctx.fillStyle = cssVar("--text-muted");
    ctx.font = "12px " + cssVar("--mono");
    ctx.fillText(fmtMeters(barM), 24, H - 38);

    readout.textContent = `${fmtMeters(fov)} — ${caption(z)}`;
  }

  slider.addEventListener("input", draw);
  draw();
}
