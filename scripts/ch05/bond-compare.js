/* 5.5 — bond strength/length comparative graphic.
   Three carbon-carbon bonds (single, double, triple). Length encoded by
   spacing between the atoms (proportional to bond length in pm), strength
   shown as a horizontal bar (kJ/mol). Single SVG, three rows. */

const NS = "http://www.w3.org/2000/svg";

const BONDS = [
  { order: 1, length: 154, energy: 347, label: "C–C single" },
  { order: 2, length: 134, energy: 614, label: "C=C double" },
  { order: 3, length: 120, energy: 839, label: "C≡C triple" },
];

const W = 720;
const ROW_H = 78;
const MARGIN_LEFT = 110;
const MARGIN_RIGHT = 60;
const TITLE_H = 24;

function elt(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function drawBondGlyph(svg, x, y, order, lengthPx) {
  const left = x;
  const right = x + lengthPx;

  // C symbols at each end
  for (const cx of [left, right]) {
    elt("circle", {
      cx, cy: y, r: 18,
      fill: "var(--bg-deep)",
      stroke: "var(--rule-strong)",
      "stroke-width": 1.2,
    }, svg);
    elt("text", {
      x: cx, y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-family": "var(--display)",
      "font-size": 22,
      "font-weight": 600,
      fill: "var(--text-primary)",
    }, svg).appendChild(document.createTextNode("C"));
  }

  // bond lines between
  const startX = left + 20;
  const endX = right - 20;
  const offsets = order === 1 ? [0] : order === 2 ? [-5, 5] : [-7.5, 0, 7.5];
  for (const off of offsets) {
    elt("line", {
      x1: startX, y1: y + off,
      x2: endX, y2: y + off,
      stroke: "var(--text-secondary)",
      "stroke-width": 2.4,
      "stroke-linecap": "round",
    }, svg);
  }
}

export function initBondCompare() {
  const svg = document.getElementById("bond-compare");
  if (!svg) return;

  // dimensions
  const maxLength = Math.max(...BONDS.map((b) => b.length));
  const minLength = Math.min(...BONDS.map((b) => b.length));
  const maxEnergy = Math.max(...BONDS.map((b) => b.energy));

  const totalH = TITLE_H + ROW_H * BONDS.length + 40;
  svg.setAttribute("viewBox", `0 0 ${W} ${totalH}`);

  // layout columns — compute the bar column first so headers land in the right spot
  const BOND_AREA_X = MARGIN_LEFT + 110;
  const BOND_AREA_W = 180;
  const BAR_X = BOND_AREA_X + BOND_AREA_W + 60;
  const BAR_MAX_W = W - MARGIN_RIGHT - BAR_X - 60;

  // header row
  elt("text", {
    x: MARGIN_LEFT, y: 14,
    "font-family": "var(--mono)",
    "font-size": 11,
    "letter-spacing": "0.08em",
    fill: "var(--text-muted)",
  }, svg).appendChild(document.createTextNode("BOND"));

  elt("text", {
    x: BOND_AREA_X, y: 14,
    "font-family": "var(--mono)",
    "font-size": 11,
    "letter-spacing": "0.08em",
    fill: "var(--text-muted)",
  }, svg).appendChild(document.createTextNode("LENGTH (pm)"));

  elt("text", {
    x: BAR_X, y: 14,
    "font-family": "var(--mono)",
    "font-size": 11,
    "letter-spacing": "0.08em",
    fill: "var(--text-muted)",
  }, svg).appendChild(document.createTextNode("ENERGY (kJ/mol)"));

  // Length scale: maxLength → BOND_AREA_W, minLength → BOND_AREA_W * (minLength/maxLength)
  // but we want the visual spacing to *be* proportional to physical length.
  // scale: pixels per pm
  const pxPerPm = BOND_AREA_W / maxLength;

  BONDS.forEach((b, i) => {
    const y = TITLE_H + ROW_H * (i + 0.5);

    // label
    elt("text", {
      x: MARGIN_LEFT, y,
      "font-family": "var(--mono)",
      "font-size": 13,
      "dominant-baseline": "central",
      fill: "var(--text-secondary)",
    }, svg).appendChild(document.createTextNode(b.label));

    // bond glyph — left-anchored at BOND_AREA_X
    const lenPx = b.length * pxPerPm;
    drawBondGlyph(svg, BOND_AREA_X, y, b.order, lenPx);

    // length number under the bond
    elt("text", {
      x: BOND_AREA_X + lenPx / 2, y: y + 32,
      "font-family": "var(--mono)",
      "font-size": 11,
      "text-anchor": "middle",
      fill: "var(--text-muted)",
    }, svg).appendChild(document.createTextNode(`${b.length} pm`));

    // energy bar
    const barW = (b.energy / maxEnergy) * BAR_MAX_W;
    elt("rect", {
      x: BAR_X, y: y - 10, width: BAR_MAX_W, height: 20,
      fill: "var(--bg-elevated)",
      rx: 4,
    }, svg);
    elt("rect", {
      x: BAR_X, y: y - 10, width: barW, height: 20,
      fill: "var(--accent)",
      rx: 4,
      style: "filter: drop-shadow(0 0 6px var(--accent));",
    }, svg);
    elt("text", {
      x: BAR_X + barW + 8, y,
      "font-family": "var(--mono)",
      "font-size": 12,
      "dominant-baseline": "central",
      fill: "var(--text-primary)",
    }, svg).appendChild(document.createTextNode(`${b.energy}`));
  });
}
