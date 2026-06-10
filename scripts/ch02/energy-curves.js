/* 2.4 — the marquee: subshell energy vs atomic number, with a movable
   cursor that scrubs across Z. Highlights 4s and 3d boldly; dims others.
   Y-axis windowed to [-50, 0] eV so the chemistry-relevant crossings show.
   Curves that dive off the bottom of the window just clip — that's part
   of the story (1s/2s/2p plunge deep). */

import { loadData, setupCanvas, cssVar, stageWidth, SUBSHELL_COLORS } from "../shared.js";

// curve plot order; 4s and 3d are highlighted last so they paint on top
const CURVE_KEYS = ["5s", "1s", "2s", "2p", "3s", "3p", "4p", "3d", "4s"];
const HIGHLIGHT = new Set(["4s", "3d"]);
const DASH = { 1: [], 2: [6, 5], 3: [3, 4], 4: [], 5: [1, 5] };

// y-window in eV
const Y_MIN = -50;
const Y_MAX = 2;

export async function initEnergyCurves() {
  const stage = document.getElementById("curves-stage");
  const slider = document.getElementById("curves-z");
  const elName = document.getElementById("curves-element");
  const readout = document.getElementById("curves-readout");
  if (!stage || !slider) return;

  const [data, elements] = await Promise.all([
    loadData("subshell_energies"),
    loadData("elements"),
  ]);

  const W = stageWidth(stage, 880);
  const H = 400;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);

  const PAD = { l: 56, r: 18, t: 24, b: 44 };
  const PW = W - PAD.l - PAD.r;
  const PH = H - PAD.t - PAD.b;
  const zMin = data.zMin, zMax = data.zMax;

  const xOf = (z) => PAD.l + ((z - zMin) / (zMax - zMin)) * PW;
  const yOf = (e) => {
    const t = (e - Y_MIN) / (Y_MAX - Y_MIN);
    return PAD.t + (1 - Math.max(0, Math.min(1, t))) * PH;
  };

  // pre-compute label slots: for each curve, last visible (Z=40) y-position
  function lastVisible(key) {
    const arr = data.curves[key];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] > Y_MIN && arr[i] < Y_MAX) return { z: i + zMin, e: arr[i] };
    }
    return null;
  }

  function draw(zCursor) {
    ctx.clearRect(0, 0, W, H);

    // ----- axes -----
    ctx.strokeStyle = cssVar("--rule-strong");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.l, PAD.t);
    ctx.lineTo(PAD.l, PAD.t + PH);
    ctx.lineTo(PAD.l + PW, PAD.t + PH);
    ctx.stroke();

    // y ticks every 10 eV
    ctx.font = "11px " + cssVar("--mono");
    ctx.fillStyle = cssVar("--text-muted");
    ctx.textAlign = "right";
    for (let e = 0; e >= Y_MIN; e -= 10) {
      const y = yOf(e);
      ctx.fillText(String(e), PAD.l - 8, y + 4);
      ctx.strokeStyle = cssVar("--rule");
      ctx.beginPath();
      ctx.moveTo(PAD.l - 4, y);
      ctx.lineTo(PAD.l + PW, y);
      ctx.stroke();
    }
    ctx.textAlign = "left";
    ctx.fillText("energy (eV)", PAD.l - 48, PAD.t - 8);

    // x ticks every 5
    ctx.textAlign = "center";
    for (let z = zMin; z <= zMax; z += 5) {
      const x = xOf(z);
      ctx.fillText(String(z), x, PAD.t + PH + 18);
      ctx.strokeStyle = cssVar("--rule");
      ctx.beginPath();
      ctx.moveTo(x, PAD.t + PH);
      ctx.lineTo(x, PAD.t + PH + 4);
      ctx.stroke();
    }
    ctx.fillStyle = cssVar("--text-muted");
    ctx.fillText("atomic number Z", PAD.l + PW / 2, H - 12);
    ctx.textAlign = "left";

    // ----- curves -----
    for (const key of CURVE_KEYS) {
      const arr = data.curves[key];
      if (!arr) continue;
      const sub = key[1]; // s p d f
      const color = SUBSHELL_COLORS[sub]();
      const isHi = HIGHLIGHT.has(key);
      ctx.strokeStyle = color;
      ctx.lineWidth = isHi ? 3 : 1.4;
      ctx.globalAlpha = isHi ? 1 : 0.55;
      ctx.setLineDash(DASH[+key[0]] || []);
      if (isHi) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (e < Y_MIN - 30 || e > Y_MAX + 30) { started = false; continue; }
        const x = xOf(i + zMin);
        const y = yOf(e);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // ----- right-edge labels -----
    const labels = [];
    for (const key of CURVE_KEYS) {
      const arr = data.curves[key];
      if (!arr) continue;
      const lv = lastVisible(key);
      if (!lv) continue;
      labels.push({
        key,
        color: SUBSHELL_COLORS[key[1]](),
        x: xOf(lv.z) + 4,
        y: yOf(lv.e),
        hi: HIGHLIGHT.has(key),
      });
    }
    // collision: sort by y and nudge
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].y - labels[i - 1].y < 14) {
        labels[i].y = labels[i - 1].y + 14;
      }
    }
    ctx.font = "600 12px " + cssVar("--mono");
    for (const lb of labels) {
      ctx.fillStyle = lb.color;
      ctx.globalAlpha = lb.hi ? 1 : 0.7;
      ctx.fillText(lb.key, lb.x, lb.y + 4);
    }
    ctx.globalAlpha = 1;

    // ----- crossing annotation: 4s/3d intersect near Z≈21 -----
    // mark the band Z=20..21 with a tinted vertical strip
    ctx.fillStyle = "rgba(167, 139, 250, 0.10)";
    ctx.fillRect(xOf(20), PAD.t, xOf(21) - xOf(20), PH);
    ctx.font = "11px " + cssVar("--mono");
    ctx.fillStyle = cssVar("--text-secondary");
    ctx.textAlign = "center";
    const cxAnn = xOf(20.5);
    ctx.fillText("4s/3d cross", cxAnn, PAD.t + 14);
    ctx.fillText("here", cxAnn, PAD.t + 28);
    ctx.textAlign = "left";

    // ----- vertical cursor at zCursor -----
    const cx = xOf(zCursor);
    ctx.strokeStyle = cssVar("--accent");
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, PAD.t);
    ctx.lineTo(cx, PAD.t + PH);
    ctx.stroke();
    ctx.setLineDash([]);
    // little dots where cursor hits each curve
    for (const key of CURVE_KEYS) {
      const arr = data.curves[key];
      if (!arr) continue;
      const e = arr[zCursor - zMin];
      if (e < Y_MIN || e > Y_MAX) continue;
      const y = yOf(e);
      const color = SUBSHELL_COLORS[key[1]]();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, y, HIGHLIGHT.has(key) ? 4.5 : 2.6, 0, 7);
      ctx.fill();
    }
  }

  // ----- element + readout -----
  function elementBySym(z) {
    return elements.find((e) => e.z === z);
  }

  function colorizeConfig(cfg) {
    // wraps each n-letter-count token with its subshell color
    return cfg.split(/\s+/).map((tok) => {
      const m = tok.match(/^(\[[A-Z][a-z]?\])?(\d+)?([spdf]?)(\d+)?$/);
      if (!m) return tok;
      if (m[1] && !m[2]) return `<span style="color:${cssVar("--text-muted")}">${m[1]}</span>`;
      const sub = m[3];
      if (sub) {
        const c = SUBSHELL_COLORS[sub]();
        const nstr = m[2] || "";
        const cnt = m[4] || "";
        return `<span style="color:${c}">${nstr}${sub}<sup>${cnt}</sup></span>`;
      }
      return tok;
    }).join(" ");
  }

  function storyFor(z) {
    if (z <= 18) return "below Z=19 (Ar): 1s/2s/2p/3s/3p fill in straightforward order. 4s and 3d both empty.";
    if (z === 19) return "K (Z=19): 4s sits below 3d → the next electron goes to 4s, not 3d.";
    if (z === 20) return "Ca (Z=20): still 4s < 3d → both 4s seats fill before 3d gets one.";
    if (z === 21) return "Sc (Z=21): 3d has plunged below 4s. The crossing happened here.";
    if (z >= 22 && z <= 28) return "3d is now well below 4s. Both are filling; 3d is the more strongly bound seat.";
    if (z === 24) return "Cr (Z=24): 4s and 3d are close enough that half-filled 3d wins — [Ar] 3d⁵ 4s¹.";
    if (z === 29) return "Cu (Z=29): full 3d wins — [Ar] 3d¹⁰ 4s¹.";
    if (z >= 30 && z <= 36) return "3d is core-deep. The remaining seats fill 4p; 4s electrons sit at the top.";
    return "approaching the 5s rung — 4p completing, 4d still empty.";
  }

  function update() {
    const z = +slider.value;
    draw(z);
    const el = elementBySym(z);
    if (el) {
      elName.textContent = `${el.symbol} · Z=${z}`;
      readout.innerHTML = `${storyFor(z)}<br><span style="color:${cssVar("--text-muted")};font-size:12px">${el.name}: ${colorizeConfig(el.configSemantic)}</span>`;
    }
  }

  slider.addEventListener("input", update);
  update();
}
