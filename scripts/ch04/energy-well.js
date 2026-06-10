/* 4.1 — the H2 energy well.
   Two stacked canvases: top is a cartoon of two protons with overlapping
   electron clouds tracking the slider; bottom is the Morse potential
   V(r) = De * (1 - exp(-a (r - re)))^2 - De, with a glowing marker.
   A "release" button lets the marker damped-oscillate into the well. */
import { setupCanvas, cssVar, stageWidth } from "../shared.js";

// H2 Morse parameters (rough physical values)
const RE = 0.74;   // equilibrium separation, Angstroms
const DE = 4.52;   // well depth, eV
const A_MORSE = 1.94; // Morse width parameter, 1/Angstrom
const R_MIN = 0.3;
const R_MAX = 3.0;

function morseV(r) {
  const u = 1 - Math.exp(-A_MORSE * (r - RE));
  return DE * u * u - DE;
}

function zone(r) {
  if (r > RE + 0.65) return { txt: "too far — nothing gained", col: "--text-muted" };
  if (r < RE - 0.12) return { txt: "too close — repulsion wins", col: "--rose" };
  return { txt: "sweet spot — the bond", col: "--green" };
}

export function initEnergyWell() {
  const stage = document.getElementById("well-stage");
  const slider = document.getElementById("well-r");
  const readout = document.getElementById("well-readout");
  const releaseBtn = document.getElementById("well-release");
  if (!stage || !slider) return;

  const W = stageWidth(stage, 860);
  const TOP_H = 200;
  const BOT_H = 260;
  stage.classList.add("well-stage");

  const cartoonCanvas = document.createElement("canvas");
  const curveCanvas = document.createElement("canvas");
  stage.appendChild(cartoonCanvas);
  stage.appendChild(curveCanvas);
  const ctxC = setupCanvas(cartoonCanvas, W, TOP_H);
  const ctxG = setupCanvas(curveCanvas, W, BOT_H);

  // ---------- top cartoon ----------
  // map separation r (Angstroms) -> pixel distance between nuclei.
  // 1 Angstrom = SCALE_PX pixels in the cartoon panel.
  const SCALE_PX = Math.min(170, (W - 200) / R_MAX);

  function drawCartoon(r) {
    ctxC.clearRect(0, 0, W, TOP_H);
    const cy = TOP_H / 2;
    const halfDx = (r * SCALE_PX) / 2;
    const xL = W / 2 - halfDx;
    const xR = W / 2 + halfDx;

    // electron clouds (gaussian blobs around each nucleus)
    // when r is small, midline density is artificially boosted to show
    // the "shared cloud building between the nuclei" payoff.
    const cloudR = 36;
    const overlap = Math.max(0, 1 - r / (RE + 0.9));
    // pre-paint a midline blob whose intensity tracks overlap
    if (overlap > 0.02) {
      const midG = ctxC.createRadialGradient(W / 2, cy, 0, W / 2, cy, cloudR * 1.4);
      const ov = Math.min(0.7, overlap * 0.85);
      midG.addColorStop(0, `rgba(45, 212, 237, ${ov})`);
      midG.addColorStop(1, "rgba(45, 212, 237, 0)");
      ctxC.fillStyle = midG;
      ctxC.fillRect(0, 0, W, TOP_H);
    }
    // individual atomic clouds — get distorted/compressed at very small r
    const sq = r < RE ? Math.max(0.55, r / RE) : 1;
    for (const x of [xL, xR]) {
      const g = ctxC.createRadialGradient(x, cy, 0, x, cy, cloudR);
      g.addColorStop(0, `rgba(45, 212, 237, ${0.5 * sq})`);
      g.addColorStop(1, "rgba(45, 212, 237, 0)");
      ctxC.fillStyle = g;
      ctxC.save();
      ctxC.translate(x, cy);
      ctxC.scale(sq, 1 + (1 - sq) * 0.4); // squish horizontally, expand vertically
      ctxC.translate(-x, -cy);
      ctxC.fillRect(x - cloudR * 1.3, cy - cloudR * 1.3, cloudR * 2.6, cloudR * 2.6);
      ctxC.restore();
    }

    // nuclei
    for (const x of [xL, xR]) {
      const g = ctxC.createRadialGradient(x, cy, 0, x, cy, 12);
      g.addColorStop(0, "rgba(251, 113, 133, 1)");
      g.addColorStop(1, "rgba(251, 113, 133, 0)");
      ctxC.fillStyle = g;
      ctxC.beginPath();
      ctxC.arc(x, cy, 9, 0, 7);
      ctxC.fill();
    }
    // nucleus-nucleus repulsion "spark" when very close
    if (r < RE - 0.05) {
      const spark = Math.min(0.85, (RE - r - 0.05) / RE * 1.8);
      ctxC.strokeStyle = `rgba(251, 191, 36, ${spark})`;
      ctxC.lineWidth = 1.5;
      ctxC.beginPath();
      for (let i = 0; i < 5; i++) {
        const t = (i / 4) * 2 - 1;
        ctxC.moveTo(W / 2 - 6, cy + t * 14);
        ctxC.lineTo(W / 2 + 6, cy + t * 14);
      }
      ctxC.stroke();
    }

    // scale ruler at the bottom
    ctxC.strokeStyle = cssVar("--text-muted");
    ctxC.lineWidth = 1;
    ctxC.beginPath();
    ctxC.moveTo(xL, cy + 50);
    ctxC.lineTo(xR, cy + 50);
    ctxC.moveTo(xL, cy + 46); ctxC.lineTo(xL, cy + 54);
    ctxC.moveTo(xR, cy + 46); ctxC.lineTo(xR, cy + 54);
    ctxC.stroke();
    ctxC.fillStyle = cssVar("--text-muted");
    ctxC.font = "12px " + cssVar("--mono");
    ctxC.textAlign = "center";
    ctxC.fillText(`r = ${r.toFixed(2)} Å`, W / 2, cy + 70);
    ctxC.textAlign = "left";

    // labels at the nuclei
    ctxC.fillStyle = cssVar("--text-secondary");
    ctxC.font = "600 13px " + cssVar("--mono");
    ctxC.textAlign = "center";
    ctxC.fillText("H", xL, cy - 36);
    ctxC.fillText("H", xR, cy - 36);
    ctxC.textAlign = "left";
  }

  // ---------- bottom curve ----------
  const PAD = { l: 62, r: 22, t: 22, b: 38 };
  const PW = W - PAD.l - PAD.r;
  const PH = BOT_H - PAD.t - PAD.b;
  // y-axis bounds (eV) — clamp top so curve breathes a bit
  const E_MIN = -DE - 0.6;
  const E_MAX = 4.5; // a touch above zero so the wall is visible

  const xPx = (r) => PAD.l + ((r - R_MIN) / (R_MAX - R_MIN)) * PW;
  const yPx = (e) => PAD.t + ((E_MAX - e) / (E_MAX - E_MIN)) * PH;

  function drawCurve(r) {
    ctxG.clearRect(0, 0, W, BOT_H);

    // axes
    ctxG.strokeStyle = cssVar("--rule-strong");
    ctxG.lineWidth = 1;
    ctxG.beginPath();
    ctxG.moveTo(PAD.l, PAD.t);
    ctxG.lineTo(PAD.l, PAD.t + PH);
    ctxG.lineTo(PAD.l + PW, PAD.t + PH);
    ctxG.stroke();

    // E=0 reference line
    const yZero = yPx(0);
    ctxG.strokeStyle = cssVar("--rule");
    ctxG.setLineDash([3, 5]);
    ctxG.beginPath();
    ctxG.moveTo(PAD.l, yZero);
    ctxG.lineTo(PAD.l + PW, yZero);
    ctxG.stroke();
    ctxG.setLineDash([]);

    // axis labels
    ctxG.fillStyle = cssVar("--text-muted");
    ctxG.font = "12px " + cssVar("--mono");
    ctxG.fillText("energy (eV)", PAD.l - 38, PAD.t - 8);
    ctxG.textAlign = "center";
    ctxG.fillText("separation r (Å)", PAD.l + PW / 2, BOT_H - 10);
    // x ticks every 0.5 Å
    for (let r0 = 0.5; r0 <= R_MAX; r0 += 0.5) {
      const x = xPx(r0);
      ctxG.fillText(r0.toFixed(1), x, PAD.t + PH + 16);
      ctxG.strokeStyle = cssVar("--rule");
      ctxG.beginPath();
      ctxG.moveTo(x, PAD.t + PH);
      ctxG.lineTo(x, PAD.t + PH + 4);
      ctxG.stroke();
    }
    // y ticks
    ctxG.textAlign = "right";
    ctxG.strokeStyle = cssVar("--rule");
    for (const e of [0, -1, -2, -3, -4]) {
      const y = yPx(e);
      ctxG.fillText(String(e), PAD.l - 6, y + 4);
      ctxG.beginPath();
      ctxG.moveTo(PAD.l - 4, y); ctxG.lineTo(PAD.l, y);
      ctxG.stroke();
    }
    ctxG.textAlign = "left";

    // the curve
    ctxG.strokeStyle = cssVar("--s-color");
    ctxG.lineWidth = 2.4;
    ctxG.shadowColor = cssVar("--s-color");
    ctxG.shadowBlur = 8;
    ctxG.beginPath();
    for (let i = 0; i <= 500; i++) {
      const rr = R_MIN + (i / 500) * (R_MAX - R_MIN);
      const e = Math.min(E_MAX, morseV(rr));
      const x = xPx(rr), y = yPx(e);
      i ? ctxG.lineTo(x, y) : ctxG.moveTo(x, y);
    }
    ctxG.stroke();
    ctxG.shadowBlur = 0;

    // equilibrium marker (dashed)
    ctxG.strokeStyle = cssVar("--rule-strong");
    ctxG.setLineDash([2, 4]);
    ctxG.beginPath();
    ctxG.moveTo(xPx(RE), yPx(-DE));
    ctxG.lineTo(xPx(RE), PAD.t + PH);
    ctxG.stroke();
    ctxG.setLineDash([]);
    ctxG.fillStyle = cssVar("--text-muted");
    ctxG.font = "11px " + cssVar("--mono");
    ctxG.fillText(`re = ${RE} Å`, xPx(RE) + 5, yPx(-DE) - 8);
    ctxG.fillText(`De ≈ ${DE.toFixed(1)} eV`, PAD.l + 10, yPx(-DE) + 4);

    // glowing marker at current r
    const mr = Math.max(R_MIN, Math.min(R_MAX, r));
    const me = Math.min(E_MAX, morseV(mr));
    const mx = xPx(mr), my = yPx(me);
    const gg = ctxG.createRadialGradient(mx, my, 0, mx, my, 16);
    gg.addColorStop(0, "rgba(45, 212, 237, 1)");
    gg.addColorStop(1, "rgba(45, 212, 237, 0)");
    ctxG.fillStyle = gg;
    ctxG.beginPath();
    ctxG.arc(mx, my, 16, 0, 7);
    ctxG.fill();
    ctxG.fillStyle = cssVar("--accent");
    ctxG.beginPath();
    ctxG.arc(mx, my, 4.5, 0, 7);
    ctxG.fill();
  }

  function draw(r) {
    drawCartoon(r);
    drawCurve(r);
    const e = morseV(r);
    const z = zone(r);
    readout.innerHTML =
      `r = <span style="color: var(--text-primary)">${r.toFixed(2)} Å</span>` +
      ` &nbsp;|&nbsp; E = <span style="color: var(--text-primary)">${e.toFixed(2)} eV</span>` +
      ` &nbsp;|&nbsp; <span style="color: var(${z.col})">${z.txt}</span>`;
  }

  slider.addEventListener("input", () => {
    if (animating) cancelAnimation();
    draw(+slider.value);
  });

  // ---------- release animation: damped slide into the well ----------
  let raf = null;
  let animating = false;
  function cancelAnimation() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    animating = false;
  }
  releaseBtn.addEventListener("click", () => {
    cancelAnimation();
    animating = true;
    // simple damped harmonic motion in a parabolic approximation of the well
    // around RE. Use the slider's current r as the starting point.
    let r = +slider.value;
    let v = 0;
    const k = 18;       // spring (Hz^2)
    const gamma = 3.6;  // damping
    const dt = 1 / 60;
    let frames = 0;
    function step() {
      // numerical gradient of the Morse for force
      const eps = 0.001;
      const F = -(morseV(r + eps) - morseV(r - eps)) / (2 * eps);
      // blend the Morse gradient with a parabolic restoring force for stability
      v += (F * 0.6 + -k * (r - RE) * 0.4 - gamma * v) * dt;
      r += v * dt;
      if (r < R_MIN + 0.02) { r = R_MIN + 0.02; v = Math.abs(v) * 0.4; }
      if (r > R_MAX - 0.02) { r = R_MAX - 0.02; v = -Math.abs(v) * 0.4; }
      slider.value = r;
      draw(r);
      frames++;
      if (frames < 360 && (Math.abs(v) > 0.02 || Math.abs(r - RE) > 0.01)) {
        raf = requestAnimationFrame(step);
      } else {
        slider.value = RE;
        draw(RE);
        animating = false;
      }
    }
    step();
  });

  draw(+slider.value);
}
