/* 1.3 — a wave wrapped around a loop. Ghost laps show self-interference:
   integer wavelength counts reinforce, non-integer counts cancel. */
import { setupCanvas, cssVar, stageWidth } from "../shared.js";

const LAPS = 6;
const SEGS = 360;

export function initStandingWave() {
  const stage = document.getElementById("wave-stage");
  const slider = document.getElementById("wave-n");
  const readout = document.getElementById("wave-readout");
  if (!stage || !slider) return;

  const W = stageWidth(stage, 860);
  const H = 380;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);
  const cx = W / 2, cy = H / 2;
  const R = Math.min(H / 2 - 56, 130);
  const A = 26;

  let disposed = false;

  function lapPath(k, lap, amp) {
    ctx.beginPath();
    for (let i = 0; i <= SEGS; i++) {
      const th = (i / SEGS) * 2 * Math.PI;
      const v = Math.sin(k * th + 2 * Math.PI * k * lap);
      const r = R + A * amp * v;
      const x = cx + r * Math.cos(th - Math.PI / 2);
      const y = cy + r * Math.sin(th - Math.PI / 2);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function sumPath(k, amp) {
    ctx.beginPath();
    for (let i = 0; i <= SEGS; i++) {
      const th = (i / SEGS) * 2 * Math.PI;
      let v = 0;
      for (let j = 0; j < LAPS; j++) v += Math.sin(k * th + 2 * Math.PI * k * j);
      const r = R + (A * amp * v) / LAPS;
      const x = cx + r * Math.cos(th - Math.PI / 2);
      const y = cy + r * Math.sin(th - Math.PI / 2);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function frame(now) {
    if (disposed) return;
    const k = +slider.value;
    const isInt = Math.abs(k - Math.round(k)) < 0.04;
    const amp = Math.cos(now / 480); // standing-wave breathing

    ctx.clearRect(0, 0, W, H);

    // nucleus
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
    g.addColorStop(0, "rgba(251,113,133,0.9)");
    g.addColorStop(1, "rgba(251,113,133,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, 7);
    ctx.fill();

    // reference loop
    ctx.strokeStyle = "rgba(148,168,210,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);

    // ghost laps (where the wave lands on successive trips around)
    const ghost = isInt ? "rgba(45,212,237,0.10)" : "rgba(251,113,133,0.16)";
    ctx.strokeStyle = ghost;
    ctx.lineWidth = 1.4;
    for (let j = 1; j < LAPS; j++) lapPath(k, j, amp);

    // the surviving sum
    ctx.lineWidth = 2.4;
    if (isInt) {
      ctx.strokeStyle = cssVar("--s-color");
      ctx.shadowColor = cssVar("--s-color");
      ctx.shadowBlur = 14;
    } else {
      ctx.strokeStyle = "rgba(230,235,245,0.75)";
      ctx.shadowBlur = 0;
    }
    sumPath(k, amp);
    ctx.shadowBlur = 0;

    if (readout) {
      readout.textContent = isInt
        ? `n = ${Math.round(k)} — laps align, the wave survives`
        : `${k.toFixed(2)} wavelengths — each lap lands out of step; the wave cancels itself`;
      readout.style.color = isInt ? cssVar("--s-color") : cssVar("--rose");
    }
    requestAnimationFrame(frame);
  }

  // magnetic detent: integers click into place, but the cancellation
  // states between them stay reachable
  slider.addEventListener("input", () => {
    const k = +slider.value;
    const n = Math.round(k);
    if (Math.abs(k - n) < 0.1) slider.value = n;
  });
  slider.addEventListener("change", () => {
    const k = +slider.value;
    const n = Math.round(k);
    if (Math.abs(k - n) < 0.25) slider.value = n;
  });

  requestAnimationFrame(frame);
}
