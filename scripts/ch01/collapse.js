/* 1.2 — classical planetary atom spiraling into the nucleus.
   Real collapse time ~16 ps; animated over ~4.5 s with r(t) ∝ (1 - t/T)^(1/3). */
import { setupCanvas, cssVar, stageWidth } from "../shared.js";

const WALL_T = 4500;   // ms of animation
const REAL_PS = 16;    // picoseconds it represents

export function initCollapse() {
  const stage = document.getElementById("collapse-stage");
  const btn = document.getElementById("collapse-run");
  const readout = document.getElementById("collapse-readout");
  if (!stage || !btn) return;

  const W = stageWidth(stage, 860);
  const H = 340;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);
  const cx = W / 2, cy = H / 2;
  const R0 = Math.min(130, H / 2 - 30);

  let t0 = null;          // animation start
  let angle = 0;
  let ripples = [];       // emitted radiation
  let lastEmit = 0;
  let raf = null;
  let done = false;

  function radius(frac) {
    return R0 * Math.cbrt(Math.max(0, 1 - frac));
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    drawNucleus();
    drawElectron(cx + R0, cy);
    ctx.strokeStyle = "rgba(148,168,210,0.18)";
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, R0, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawNucleus() {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 9);
    g.addColorStop(0, "rgba(251,113,133,1)");
    g.addColorStop(1, "rgba(251,113,133,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, 7);
    ctx.fill();
  }

  function drawElectron(x, y) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
    g.addColorStop(0, "rgba(45,212,237,1)");
    g.addColorStop(1, "rgba(45,212,237,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 7);
    ctx.fill();
  }

  function frame(now) {
    if (t0 === null) t0 = now;
    const t = now - t0;
    const frac = Math.min(t / WALL_T, 1);
    const r = radius(frac);

    // angular speed grows as the orbit tightens (Kepler-like)
    angle += 0.05 * Math.pow(R0 / Math.max(r, 6), 1.5);
    const ex = cx + r * Math.cos(angle);
    const ey = cy + r * Math.sin(angle);

    if (t - lastEmit > 120 && frac < 1) {
      ripples.push({ x: ex, y: ey, r: 4, a: 0.5 });
      lastEmit = t;
    }

    ctx.clearRect(0, 0, W, H);

    // radiation ripples
    for (const rp of ripples) {
      rp.r += 2.6;
      rp.a *= 0.96;
      ctx.strokeStyle = `rgba(251,191,36,${rp.a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, 7);
      ctx.stroke();
    }
    ripples = ripples.filter((rp) => rp.a > 0.02);

    drawNucleus();

    if (frac < 1) {
      drawElectron(ex, ey);
      readout.textContent = (frac * REAL_PS).toFixed(1) + " ps";
      raf = requestAnimationFrame(frame);
    } else if (ripples.length) {
      // final flash, let ripples fade out
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
      g.addColorStop(0, "rgba(251,191,36,0.8)");
      g.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, 7);
      ctx.fill();
      readout.textContent = REAL_PS + " ps — atom destroyed";
      raf = requestAnimationFrame(frame);
    } else {
      done = true;
      btn.textContent = "↻ rebuild the atom";
      btn.disabled = false;
      ctx.fillStyle = cssVar("--text-muted");
      ctx.font = "13px " + cssVar("--mono");
      ctx.textAlign = "center";
      ctx.fillText("no force prevents this — except that electrons aren't planets",
        cx, H - 24);
      ctx.textAlign = "left";
    }
  }

  btn.addEventListener("click", () => {
    if (raf) cancelAnimationFrame(raf);
    t0 = null;
    angle = 0;
    ripples = [];
    lastEmit = 0;
    done = false;
    btn.disabled = true;
    setTimeout(() => (btn.disabled = false), 800);
    raf = requestAnimationFrame(frame);
  });

  drawStatic();
  readout.textContent = "0 ps";
}
