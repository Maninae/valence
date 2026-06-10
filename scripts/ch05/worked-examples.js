/* 5.3 — Clean, static Lewis structures for H2O and NH3.
   These are example diagrams, not interactive — bonds as lines, lone
   pairs as dot pairs, labeled. */

const NS = "http://www.w3.org/2000/svg";

function elt(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function text(parent, x, y, content, opts = {}) {
  return elt("text", {
    x, y,
    "text-anchor": opts.anchor || "middle",
    "dominant-baseline": "central",
    "font-family": opts.family || "var(--display)",
    "font-size": opts.size || 28,
    "font-weight": opts.weight || 600,
    fill: opts.fill || "var(--text-primary)",
  }, parent).appendChild(document.createTextNode(content));
}

function dotPair(parent, cx, cy, dx, dy) {
  // a pair of dots spaced perpendicular to the (dx, dy) vector
  // normalize the perpendicular
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  const spread = 7;
  elt("circle", {
    cx: cx + px * spread, cy: cy + py * spread, r: 3.4,
    fill: "var(--text-secondary)",
  }, parent);
  elt("circle", {
    cx: cx - px * spread, cy: cy - py * spread, r: 3.4,
    fill: "var(--text-secondary)",
  }, parent);
}

function bondLine(parent, x1, y1, x2, y2, order = 1) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // shorten line to avoid overlapping the atom label
  const pad = 18;
  const ux = dx / len, uy = dy / len;
  const sx = x1 + ux * pad, sy = y1 + uy * pad;
  const ex = x2 - ux * pad, ey = y2 - uy * pad;

  // perpendicular for double/triple
  const px = -uy, py = ux;
  const offsets = order === 1 ? [0] : order === 2 ? [-3.5, 3.5] : [-5, 0, 5];
  offsets.forEach((o) => {
    elt("line", {
      x1: sx + px * o, y1: sy + py * o,
      x2: ex + px * o, y2: ey + py * o,
      stroke: "var(--text-secondary)",
      "stroke-width": 2.2,
      "stroke-linecap": "round",
    }, parent);
  });
}

function atomLabel(parent, x, y, sym) {
  // halo so the bond line passes behind cleanly
  elt("circle", { cx: x, cy: y, r: 16, fill: "var(--bg-surface)" }, parent);
  text(parent, x, y, sym);
}

function drawH2O(svg) {
  // bent geometry, ~105°
  const cxO = 180, cyO = 110;
  const angle = 52; // half of 104°, from vertical (bend opens downward)
  const r = 70;
  const rad = (a) => (a * Math.PI) / 180;
  const xH1 = cxO - Math.sin(rad(angle)) * r;
  const yH1 = cyO + Math.cos(rad(angle)) * r;
  const xH2 = cxO + Math.sin(rad(angle)) * r;
  const yH2 = cyO + Math.cos(rad(angle)) * r;

  // bonds first (behind atom halos)
  bondLine(svg, cxO, cyO, xH1, yH1, 1);
  bondLine(svg, cxO, cyO, xH2, yH2, 1);

  // lone pairs on O: one above-left, one above-right (opposite the bond direction)
  dotPair(svg, cxO - 22, cyO - 18, -1, 1);
  dotPair(svg, cxO + 22, cyO - 18, 1, 1);

  atomLabel(svg, cxO, cyO, "O");
  atomLabel(svg, xH1, yH1, "H");
  atomLabel(svg, xH2, yH2, "H");

  text(svg, 180, 30, "H2O  ·  2 bonds + 2 lone pairs on oxygen",
    { size: 13, weight: 500, fill: "var(--text-muted)", family: "var(--mono)" });
}

function drawNH3(svg) {
  // N at center with 3 H below (no top H — that slot belongs to the lone pair)
  const cxN = 180, cyN = 110;
  const r = 70;
  // Three H atoms below N at 30°, 90°, 150° (SVG y grows downward → positive sin)
  const angles = [150, 90, 30]; // degrees, 0 = right; all below horizontal
  const positions = angles.map((a) => {
    const rad = (a * Math.PI) / 180;
    return { x: cxN + Math.cos(rad) * r, y: cyN + Math.sin(rad) * r };
  });

  positions.forEach((p) => bondLine(svg, cxN, cyN, p.x, p.y, 1));

  // single lone pair on top of N — place at a clear gap above
  dotPair(svg, cxN, cyN - 36, 1, 0);

  atomLabel(svg, cxN, cyN, "N");
  positions.forEach((p) => atomLabel(svg, p.x, p.y, "H"));

  text(svg, 180, 30, "NH3  ·  3 bonds + 1 lone pair on nitrogen",
    { size: 13, weight: 500, fill: "var(--text-muted)", family: "var(--mono)" });
}

export function initWorkedExamples() {
  const h2o = document.getElementById("example-h2o");
  const nh3 = document.getElementById("example-nh3");
  if (h2o) drawH2O(h2o);
  if (nh3) drawNH3(nh3);
}
