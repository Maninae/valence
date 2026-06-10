/* 4.3 — the electronegativity tug-of-war.
   Two atoms A and B, shared cloud morphs as a function of ΔEN.
   Cloud = sum of two gaussians weighted by EN share (covalent end);
   high ΔEN: cloud collapses onto winner; very high: explicit ions + field. */
import { setupCanvas, cssVar, stageWidth, loadData } from "../shared.js";
import { drawContinuumBar, classifyBond, DELTA_MAX } from "./continuum-bar.js";

const POOL_SYMBOLS = ["H", "Li", "Na", "K", "Mg", "C", "N", "O", "F", "Cl", "Br"];
const DEFAULT_A = "H";
const DEFAULT_B = "Cl";

export async function initTugOfWar() {
  const stage = document.getElementById("tug-stage");
  const pickA = document.getElementById("tug-pick-a");
  const pickB = document.getElementById("tug-pick-b");
  const readout = document.getElementById("tug-readout");
  const continuumWrap = document.getElementById("tug-continuum");
  const swapBtn = document.getElementById("tug-swap");
  if (!stage || !pickA || !pickB) return;

  const elements = await loadData("elements");
  const byMap = Object.fromEntries(elements.map((e) => [e.symbol, e]));

  // build pickers
  const buildPicker = (el, onChange) => {
    el.innerHTML = "";
    POOL_SYMBOLS.forEach((s) => {
      const b = document.createElement("button");
      b.className = "element-btn";
      b.textContent = s;
      b.dataset.sym = s;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => onChange(s));
      el.appendChild(b);
    });
  };

  let symA = DEFAULT_A, symB = DEFAULT_B;
  buildPicker(pickA, (s) => { symA = s; render(); });
  buildPicker(pickB, (s) => { symB = s; render(); });

  swapBtn.addEventListener("click", () => {
    [symA, symB] = [symB, symA];
    render();
  });

  // --- stage canvas ---
  const W = stageWidth(stage, 860);
  const H = 320;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);

  // --- continuum bar canvas (below) ---
  const cw = stageWidth(continuumWrap, 860);
  const ch = 100;
  const contCanvas = document.createElement("canvas");
  continuumWrap.appendChild(contCanvas);
  const ctxC = setupCanvas(contCanvas, cw, ch);

  function pickedClass(picker, sym) {
    picker.querySelectorAll(".element-btn").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.sym === sym))
    );
  }

  function draw(eA, eB) {
    ctx.clearRect(0, 0, W, H);

    const enA = eA.en, enB = eB.en;
    const dEN = Math.abs(enA - enB);
    const cy = H / 2 - 10;
    const sep = Math.min(260, W * 0.36);
    const xA = W / 2 - sep / 2;
    const xB = W / 2 + sep / 2;

    // share fraction biased toward higher EN
    // alpha = exp(beta * ΔEN); winner share = alpha / (1 + alpha)
    const beta = 1.05;
    const aWins = enA > enB;
    const winnerShare = 1 / (1 + Math.exp(-beta * (Math.max(enA, enB) - Math.min(enA, enB))));
    const winnerX = aWins ? xA : xB;
    const loserX = aWins ? xB : xA;
    const winnerEN = Math.max(enA, enB);
    const loserEN = Math.min(enA, enB);

    // For the cloud: when ionic (dEN >= 1.8) interpolate from "blob" to "ion".
    // Otherwise blob = two gaussians, weighted by share.
    const ionic = dEN >= 1.8;
    const ionicProgress = Math.min(1, Math.max(0, (dEN - 1.6) / 0.8)); // 0..1 fade

    // sigma scales: larger gaussian sits around winner, smaller around loser
    const sigmaCov = 70;

    // dipole arrow color (amber for polar)
    const polar = dEN > 0.35 && dEN < 2.0;

    // --- blob (low-ΔEN to mid-ΔEN cloud) ---
    if (ionicProgress < 1) {
      // tighten the loser gaussian as we approach ionic
      const sL = sigmaCov * (1 - 0.6 * ionicProgress);
      const sW = sigmaCov;
      // gaussian peak weights
      // share => 0.5 + bias; winnerShare goes 0.5..1
      const wW = winnerShare;
      const wL = 1 - winnerShare;

      // paint as gradient strip (1D along bond axis, fattened with a vertical
      // gaussian envelope)
      const envH = 80;
      for (let x = 0; x < W; x++) {
        const dW = (x - winnerX) / sW;
        const dL = (x - loserX) / sL;
        const v = wW * Math.exp(-dW * dW * 0.5) + wL * Math.exp(-dL * dL * 0.5);
        // vertical band
        for (let dy = -envH / 2; dy <= envH / 2; dy += 2) {
          const env = Math.exp(-(dy * dy) / (2 * 24 * 24));
          const a = Math.min(0.85, v * env * 1.1);
          if (a < 0.04) continue;
          ctx.fillStyle = `rgba(45, 212, 237, ${a * (1 - ionicProgress * 0.7)})`;
          ctx.fillRect(x, cy + dy, 1, 2);
        }
      }
    }

    // --- ionic glyphs ---
    if (ionicProgress > 0.05) {
      // collapse a dense ball onto the winner
      const lobeR = 28 + 14 * ionicProgress;
      const g = ctx.createRadialGradient(winnerX, cy, 0, winnerX, cy, lobeR * 2);
      g.addColorStop(0, `rgba(45, 212, 237, ${0.55 + 0.35 * ionicProgress})`);
      g.addColorStop(1, "rgba(45, 212, 237, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(winnerX, cy, lobeR * 2, 0, 7);
      ctx.fill();

      if (ionicProgress > 0.55) {
        // electrostatic attraction glyph: dashed field lines between the ions
        ctx.strokeStyle = `rgba(168, 179, 201, ${ionicProgress * 0.45})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        for (let i = -2; i <= 2; i++) {
          const yo = i * 14;
          ctx.beginPath();
          ctx.moveTo(loserX + 18, cy + yo);
          // curve gently
          ctx.bezierCurveTo(
            (loserX + winnerX) / 2, cy + yo * 1.5,
            (loserX + winnerX) / 2, cy + yo * 1.5,
            winnerX - 18, cy + yo
          );
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }

    // --- nuclei + symbol labels ---
    for (const [x, sym, en] of [[xA, eA.symbol, enA], [xB, eB.symbol, enB]]) {
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, 16);
      g.addColorStop(0, "rgba(251, 113, 133, 0.95)");
      g.addColorStop(1, "rgba(251, 113, 133, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, cy, 11, 0, 7);
      ctx.fill();

      // symbol
      ctx.fillStyle = cssVar("--text-primary");
      ctx.font = "700 22px " + cssVar("--display");
      ctx.textAlign = "center";
      ctx.fillText(sym, x, cy - 38);
      // EN value below the nucleus
      ctx.fillStyle = cssVar("--text-muted");
      ctx.font = "12px " + cssVar("--mono");
      ctx.fillText(`χ = ${en.toFixed(2)}`, x, cy + 56);
      ctx.textAlign = "left";
    }

    // ionic charge brackets when fully ionic
    if (ionicProgress > 0.65) {
      const fade = Math.min(1, (ionicProgress - 0.55) / 0.4);
      ctx.fillStyle = `rgba(45, 212, 237, ${fade})`;
      ctx.font = "700 15px " + cssVar("--mono");
      ctx.textAlign = "center";
      const winnerSym = aWins ? eA.symbol : eB.symbol;
      const loserSym = aWins ? eB.symbol : eA.symbol;
      ctx.fillText(`[${winnerSym}]⁻`, winnerX, cy - 64);
      ctx.fillStyle = `rgba(251, 191, 36, ${fade})`;
      ctx.fillText(`[${loserSym}]⁺`, loserX, cy - 64);
      ctx.textAlign = "left";
    }

    // --- δ+ / δ- partial-charge labels (polar regime) ---
    if (polar && ionicProgress < 0.6) {
      const fade = Math.min(1, dEN / 1.2) * (1 - ionicProgress);
      ctx.fillStyle = `rgba(251, 191, 36, ${fade})`;
      ctx.font = "700 17px " + cssVar("--mono");
      ctx.textAlign = "center";
      ctx.fillText("δ+", loserX, cy - 64);
      ctx.fillStyle = `rgba(45, 212, 237, ${fade})`;
      ctx.fillText("δ−", winnerX, cy - 64);
      ctx.textAlign = "left";

      // dipole arrow (loser → winner)
      const arrowY = cy + 84;
      const ax1 = Math.min(xA, xB) + 20;
      const ax2 = Math.max(xA, xB) - 20;
      const x1 = aWins ? ax2 : ax1;
      const x2 = aWins ? ax1 : ax2;
      ctx.strokeStyle = `rgba(251, 191, 36, ${fade})`;
      ctx.fillStyle = `rgba(251, 191, 36, ${fade})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, arrowY); ctx.lineTo(x2, arrowY);
      ctx.stroke();
      // arrowhead
      const dir = Math.sign(x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, arrowY);
      ctx.lineTo(x2 - 9 * dir, arrowY - 5);
      ctx.lineTo(x2 - 9 * dir, arrowY + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cssVar("--text-muted");
      ctx.font = "11px " + cssVar("--mono");
      ctx.textAlign = "center";
      ctx.fillText("dipole", (x1 + x2) / 2, arrowY + 16);
      ctx.textAlign = "left";
    }

    // verdict caption at top
    ctx.fillStyle = cssVar("--text-secondary");
    ctx.font = "12.5px " + cssVar("--mono");
    ctx.textAlign = "center";
    ctx.fillText(`ΔEN = ${dEN.toFixed(2)}  ·  ${classifyBond(dEN)}`, W / 2, 22);
    ctx.textAlign = "left";

    // -- continuum bar with current ΔEN marker --
    ctxC.clearRect(0, 0, cw, ch);
    drawContinuumBar(ctxC, 30, 32, cw - 60, 24, {
      markers: [{ d: Math.min(DELTA_MAX, dEN), highlight: true, label: `${dEN.toFixed(2)}` }],
    });

    // -- text readout below --
    const verdict = classifyBond(dEN);
    readout.innerHTML =
      `${eA.symbol} (χ=${enA.toFixed(2)}) &nbsp;⟷&nbsp; ${eB.symbol} (χ=${enB.toFixed(2)}) ` +
      `&nbsp;|&nbsp; ΔEN = <span style="color: var(--text-primary)">${dEN.toFixed(2)}</span>` +
      ` &nbsp;|&nbsp; <span style="color: var(--accent)">${verdict}</span>`;
  }

  function render() {
    const eA = byMap[symA];
    const eB = byMap[symB];
    if (!eA || !eB || eA.en == null || eB.en == null) return;
    pickedClass(pickA, symA);
    pickedClass(pickB, symB);
    draw(eA, eB);
  }

  render();
}
