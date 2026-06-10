/* 1.5 — radial probability distributions P(r) = r²R²(r), with presets
   that set up shielding/penetration for chapter 2. */
import { setupCanvas, cssVar, stageWidth, SUBSHELL_COLORS } from "../shared.js";
import { radialR } from "../orbital-cloud.js";

const PRESETS = {
  ladder: {
    curves: [[1, 0], [2, 0], [3, 0]],
    rMax: 28,
    note: "bigger n lives farther out — but keeps inner lobes near the nucleus",
  },
  shapes: {
    curves: [[3, 0], [3, 1], [3, 2]],
    rMax: 26,
    note: "same shell, different shapes: 3s dips closest to the nucleus, 3d not at all",
  },
  cross: {
    curves: [[4, 0], [3, 2]],
    rMax: 38,
    note: "4s lives farther out than 3d, yet its inner lobes sneak in closer — penetration",
  },
};

const DASH = { 1: [], 2: [7, 5], 3: [2, 4], 4: [] };

export function initRadialChart() {
  const stage = document.getElementById("radial-stage");
  const seg = document.getElementById("radial-preset");
  const readout = document.getElementById("radial-readout");
  if (!stage || !seg) return;

  const W = stageWidth(stage, 860);
  const H = 360;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);
  const PAD = { l: 46, r: 18, t: 26, b: 44 };
  const PW = W - PAD.l - PAD.r;
  const PH = H - PAD.t - PAD.b;

  function curvePoints(n, l, rMax) {
    const pts = [];
    let max = 0;
    for (let i = 0; i <= 400; i++) {
      const r = (i / 400) * rMax;
      const R = radialR(n, l, r);
      const p = r * r * R * R;
      pts.push(p);
      if (p > max) max = p;
    }
    return { pts, max };
  }

  function draw(presetKey) {
    const preset = PRESETS[presetKey];
    ctx.clearRect(0, 0, W, H);

    // axes
    ctx.strokeStyle = cssVar("--rule-strong");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.l, PAD.t);
    ctx.lineTo(PAD.l, PAD.t + PH);
    ctx.lineTo(PAD.l + PW, PAD.t + PH);
    ctx.stroke();

    ctx.fillStyle = cssVar("--text-muted");
    ctx.font = "12px " + cssVar("--mono");
    ctx.fillText("probability of distance r", PAD.l - 36, PAD.t - 10);
    ctx.textAlign = "center";
    ctx.fillText("distance from nucleus (Bohr radii)", PAD.l + PW / 2, H - 12);
    // x ticks every 5 a0
    for (let r = 0; r <= preset.rMax; r += 5) {
      const x = PAD.l + (r / preset.rMax) * PW;
      ctx.fillText(String(r), x, PAD.t + PH + 18);
      ctx.strokeStyle = cssVar("--rule");
      ctx.beginPath();
      ctx.moveTo(x, PAD.t + PH);
      ctx.lineTo(x, PAD.t + PH + 4);
      ctx.stroke();
    }
    ctx.textAlign = "left";

    // curves, normalized to the preset's global max
    const computed = preset.curves.map(([n, l]) => ({ n, l, ...curvePoints(n, l, preset.rMax) }));
    const gMax = Math.max(...computed.map((c) => c.max)) * 1.06;

    const labels = [];
    for (const c of computed) {
      const letter = "spdf"[c.l];
      const color = SUBSHELL_COLORS[letter]();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.setLineDash(DASH[c.n] || []);
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      let peakI = 0;
      c.pts.forEach((p, i) => {
        if (p > c.pts[peakI]) peakI = i;
        const x = PAD.l + (i / 400) * PW;
        const y = PAD.t + PH - (p / gMax) * PH;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      labels.push({
        text: `${c.n}${letter}`,
        color,
        x: PAD.l + (peakI / 400) * PW,
        y: PAD.t + PH - (c.pts[peakI] / gMax) * PH - 10,
      });
    }

    // peak labels with simple collision nudging
    labels.sort((a, b) => a.x - b.x);
    for (let i = 1; i < labels.length; i++) {
      if (Math.abs(labels[i].x - labels[i - 1].x) < 34 &&
          Math.abs(labels[i].y - labels[i - 1].y) < 16) {
        labels[i].y = labels[i - 1].y - 18;
      }
    }
    ctx.font = "600 13px " + cssVar("--mono");
    ctx.textAlign = "center";
    for (const lb of labels) {
      ctx.fillStyle = lb.color;
      ctx.fillText(lb.text, lb.x, Math.max(lb.y, PAD.t + 12));
    }
    ctx.textAlign = "left";

    // penetration annotation for the 4s/3d preset
    if (presetKey === "cross") {
      const x = PAD.l + (1.4 / preset.rMax) * PW;
      ctx.strokeStyle = cssVar("--text-muted");
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, PAD.t + PH);
      ctx.lineTo(x, PAD.t + 40);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cssVar("--text-secondary");
      ctx.font = "12px " + cssVar("--mono");
      ctx.fillText("← 4s inner lobes: closer than 3d ever gets", x + 8, PAD.t + 52);
    }

    readout.textContent = preset.note;
  }

  seg.querySelectorAll(".seg-btn").forEach((b) => {
    b.addEventListener("click", () => {
      seg.querySelectorAll(".seg-btn").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
      draw(b.dataset.v);
    });
  });

  draw("ladder");
}
