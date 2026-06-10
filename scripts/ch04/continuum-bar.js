/* Reusable continuum-bar drawing helper.
   The dial: ΔEN from 0 to ~3.5. Gradient fill, fuzzy zone borders, optional
   labeled markers at ΔEN positions. */
import { cssVar } from "../shared.js";

export const DELTA_MAX = 3.5;
export const CUTOFF_POLAR = 0.4;
export const CUTOFF_IONIC = 1.8;

export function classifyBond(d) {
  if (d < CUTOFF_POLAR) return "nearly even sharing";
  if (d < CUTOFF_IONIC) return "polar";
  return "ionic";
}
export function classifyKey(d) {
  if (d < CUTOFF_POLAR) return "even";
  if (d < CUTOFF_IONIC) return "polar";
  return "ionic";
}

// Draw a horizontal continuum bar inside a rect [x, y, w, h].
// Options: markers = [{ d, label, color?, highlight? }], showLabels = bool
export function drawContinuumBar(ctx, x, y, w, h, opts = {}) {
  const { markers = [], showLabels = true, title = "ΔEN" } = opts;

  // background gradient: covalent (s-color) → polar (amber) → ionic (rose),
  // soft mixes for the fuzzy boundaries.
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0.0, "rgba(45, 212, 237, 0.85)");
  grad.addColorStop(CUTOFF_POLAR / DELTA_MAX - 0.06, "rgba(45, 212, 237, 0.75)");
  grad.addColorStop(CUTOFF_POLAR / DELTA_MAX + 0.06, "rgba(251, 191, 36, 0.7)");
  grad.addColorStop((CUTOFF_POLAR + CUTOFF_IONIC) / (2 * DELTA_MAX),
    "rgba(251, 191, 36, 0.8)");
  grad.addColorStop(CUTOFF_IONIC / DELTA_MAX - 0.05, "rgba(251, 191, 36, 0.7)");
  grad.addColorStop(CUTOFF_IONIC / DELTA_MAX + 0.05, "rgba(251, 113, 133, 0.7)");
  grad.addColorStop(1.0, "rgba(251, 113, 133, 0.85)");

  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  // bar border
  ctx.strokeStyle = cssVar("--rule-strong");
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();

  // tick marks every 0.5
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  for (let d = 0.5; d < DELTA_MAX; d += 0.5) {
    const tx = x + (d / DELTA_MAX) * w;
    ctx.beginPath();
    ctx.moveTo(tx, y + h - 4);
    ctx.lineTo(tx, y + h);
    ctx.stroke();
  }

  // zone captions above bar
  if (showLabels) {
    ctx.fillStyle = cssVar("--text-secondary");
    ctx.font = "11.5px " + cssVar("--mono");
    ctx.textAlign = "center";
    const yLab = y - 8;
    ctx.fillText("covalent", x + (CUTOFF_POLAR / 2 / DELTA_MAX) * w, yLab);
    ctx.fillText("polar", x + ((CUTOFF_POLAR + CUTOFF_IONIC) / 2 / DELTA_MAX) * w, yLab);
    ctx.fillText("ionic", x + ((CUTOFF_IONIC + DELTA_MAX) / 2 / DELTA_MAX) * w, yLab);
    // x-axis ticks under the bar
    ctx.fillStyle = cssVar("--text-muted");
    ctx.font = "11px " + cssVar("--mono");
    for (let d = 0; d <= 3; d += 1) {
      const tx = x + (d / DELTA_MAX) * w;
      ctx.fillText(d.toFixed(0), tx, y + h + 14);
    }
    // axis title at the lower right, outside collision zones
    ctx.textAlign = "right";
    ctx.fillText(title, x + w, y + h + 14);
    ctx.textAlign = "left";
  }

  // markers (real-bond chips, or live ΔEN pointer).
  // Sort by x position, then place labels in alternating tiers above/below
  // to avoid overlap. Highlighted markers always sit in tier 0 below.
  const placed = markers.map((m) => {
    const mx = x + Math.min(1, m.d / DELTA_MAX) * w;
    return { ...m, mx };
  }).sort((a, b) => a.mx - b.mx);

  // assign label tiers
  let lastBelowX = -1e9, lastAboveX = -1e9;
  const MIN_GAP = 56;
  for (const m of placed) {
    if (m.highlight) {
      m.tier = "below0"; // always below, no collision check (only one)
      continue;
    }
    // alternate above/below; if too close to last in chosen tier, push to other
    const wantBelow = (lastBelowX < lastAboveX);
    let tier = wantBelow ? "below0" : "above0";
    if (tier === "below0" && m.mx - lastBelowX < MIN_GAP) tier = "above0";
    if (tier === "above0" && m.mx - lastAboveX < MIN_GAP) tier = "below1";
    m.tier = tier;
    if (tier === "below0" || tier === "below1") lastBelowX = m.mx;
    else lastAboveX = m.mx;
  }

  for (const m of placed) {
    const mc = m.color || cssVar("--text-primary");
    // stem
    ctx.strokeStyle = m.highlight ? cssVar("--accent") : mc;
    ctx.lineWidth = m.highlight ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(m.mx, y - 2);
    ctx.lineTo(m.mx, y + h + 2);
    ctx.stroke();
    if (m.highlight) {
      const gg = ctx.createRadialGradient(m.mx, y + h / 2, 0, m.mx, y + h / 2, 14);
      gg.addColorStop(0, "rgba(45, 212, 237, 1)");
      gg.addColorStop(1, "rgba(45, 212, 237, 0)");
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(m.mx, y + h / 2, 14, 0, 7); ctx.fill();
      ctx.fillStyle = cssVar("--accent");
      ctx.beginPath(); ctx.arc(m.mx, y + h / 2, 4, 0, 7); ctx.fill();
    }
    if (m.label) {
      ctx.fillStyle = m.highlight ? cssVar("--accent") : mc;
      ctx.font = (m.highlight ? "700 " : "600 ") + "12.5px " + cssVar("--mono");
      ctx.textAlign = "center";
      const yLab =
        m.tier === "below0" ? y + h + 30 :
        m.tier === "below1" ? y + h + 46 :
        y - 22; // above0
      ctx.fillText(m.label, m.mx, yLab);
      ctx.textAlign = "left";
    }
  }
}

// rounded-rect path
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
