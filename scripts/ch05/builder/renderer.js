/* 5.4 — Lewis builder SVG renderer.
   Draws atoms (with hit targets for lone-pair clicks), bonds (1/2/3
   parallel lines), gap hit-targets between adjacent atoms, and lone-pair
   dots at N/E/S/W positions on each atom. Stateless: takes molecule +
   attempt + an options object (callbacks, glowMode).
*/

import { edgeKey, atomState, atomShellCount } from "./engine.js";

const NS = "http://www.w3.org/2000/svg";

function elt(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const ATOM_RADIUS = 24;
const HIT_RADIUS = 28;
const GAP_HIT = 36;

// lone-pair offset from atom center, indexed by pair-slot 0..3 = N/E/S/W
const LP_SLOTS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];
const LP_DISTANCE = 38;
const LP_DOT_SPREAD = 5;

// figure out which slots a given atom's lone pairs should occupy.
// Avoid placing them on top of bond directions.
function pickLonePairSlots(molecule, attempt, atomIndex, pairCount) {
  if (pairCount === 0) return [];
  const me = molecule.atoms[atomIndex];
  // unit vectors toward each neighbor (where bonds will draw)
  const bondDirs = [];
  for (const [i, j] of molecule.edges) {
    if (i !== atomIndex && j !== atomIndex) continue;
    const other = molecule.atoms[i === atomIndex ? j : i];
    const dx = other.x - me.x, dy = other.y - me.y;
    const len = Math.hypot(dx, dy) || 1;
    bondDirs.push({ dx: dx / len, dy: dy / len });
  }

  // score each slot by maximum dot product with any bond direction (lower = farther from bonds)
  const slotScores = LP_SLOTS.map((slot, idx) => {
    let maxDot = -Infinity;
    for (const b of bondDirs) {
      const d = slot.dx * b.dx + slot.dy * b.dy;
      if (d > maxDot) maxDot = d;
    }
    return { idx, score: maxDot === -Infinity ? -1 : maxDot };
  });
  slotScores.sort((a, b) => a.score - b.score);
  return slotScores.slice(0, pairCount).map((s) => s.idx);
}

function drawBond(svg, a, b, order) {
  if (order === 0) return;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  // shorten so the line ends outside the atom halo
  const pad = ATOM_RADIUS + 2;
  const sx = a.x + ux * pad, sy = a.y + uy * pad;
  const ex = b.x - ux * pad, ey = b.y - uy * pad;

  const offsets = order === 1 ? [0] : order === 2 ? [-5, 5] : [-7.5, 0, 7.5];
  for (const off of offsets) {
    elt("line", {
      x1: sx + px * off, y1: sy + py * off,
      x2: ex + px * off, y2: ey + py * off,
      class: "bond-line",
    }, svg);
  }
}

function drawGapHit(svg, a, b, edge, callback) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // hit area: a rotated rectangle covering the middle third of the bond
  // simpler: a circle at the midpoint, big enough to be easy to click on mobile.
  const g = elt("g", { class: "gap-group" }, svg);
  elt("circle", {
    cx: mx, cy: my, r: GAP_HIT,
    class: "gap-glow",
  }, g);
  const hit = elt("circle", {
    cx: mx, cy: my, r: GAP_HIT,
    class: "gap-hit",
    "data-edge": `${edge[0]}-${edge[1]}`,
  }, g);
  hit.addEventListener("click", () => callback(edge[0], edge[1]));
  hit.addEventListener("touchstart", (e) => {
    e.preventDefault();
    callback(edge[0], edge[1]);
  }, { passive: false });
}

function drawAtom(svg, atom, atomIndex, attempt, molecule, opts) {
  const g = elt("g", { class: "atom-group" }, svg);

  // glow halo state — only if glowMode != "none"
  let haloClass = "atom-halo";
  if (opts.glowMode !== "none") {
    const state = atomState(attempt, molecule, atomIndex);
    if (state === "full") haloClass += " full";
    else if (state === "over") haloClass += " over";
  }

  elt("circle", {
    cx: atom.x, cy: atom.y, r: ATOM_RADIUS,
    class: haloClass,
  }, g);

  // hit target (transparent, slightly larger)
  const hit = elt("circle", {
    cx: atom.x, cy: atom.y, r: HIT_RADIUS,
    class: "atom-hit",
    fill: "transparent",
    "data-atom": String(atomIndex),
  }, g);
  hit.addEventListener("click", () => opts.onAtomClick(atomIndex));
  hit.addEventListener("touchstart", (e) => {
    e.preventDefault();
    opts.onAtomClick(atomIndex);
  }, { passive: false });

  // element symbol
  elt("text", {
    x: atom.x, y: atom.y,
    class: "atom-symbol",
  }, g).appendChild(document.createTextNode(atom.sym));

  // lone pair dots, placed in non-bonded slots
  const pairs = attempt.lonePairs[atomIndex] || 0;
  const slots = pickLonePairSlots(molecule, attempt, atomIndex, pairs);
  for (const slotIdx of slots) {
    const slot = LP_SLOTS[slotIdx];
    const cx = atom.x + slot.dx * LP_DISTANCE;
    const cy = atom.y + slot.dy * LP_DISTANCE;
    // two dots, spread perpendicular to slot direction
    const px = -slot.dy, py = slot.dx;
    elt("circle", {
      cx: cx + px * LP_DOT_SPREAD, cy: cy + py * LP_DOT_SPREAD, r: 3,
      class: "lone-dot",
    }, svg);
    elt("circle", {
      cx: cx - px * LP_DOT_SPREAD, cy: cy - py * LP_DOT_SPREAD, r: 3,
      class: "lone-dot",
    }, svg);
  }

  // count tag below atom (small, mono) — only when glow shown
  if (opts.glowMode !== "none") {
    const count = atomShellCount(attempt, molecule, atomIndex);
    const target = atom.target;
    elt("text", {
      x: atom.x,
      y: atom.y + ATOM_RADIUS + 16,
      class: "atom-tag",
    }, svg).appendChild(document.createTextNode(`${count}/${target}`));
  }
}

// Compute a viewBox that fits all atoms (with their lone-pair halo) snugly,
// preserving aspect ratio and a minimum size so 2-atom molecules don't blow up.
// Returns "minX minY width height".
function autoViewBox(molecule, baseAspect = 600 / 380) {
  const pad = 110; // room for lone pairs, count tag, atom halo
  const minWidth = 580; // never zoom in past this width
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const a of molecule.atoms) {
    if (a.x < minX) minX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.x > maxX) maxX = a.x;
    if (a.y > maxY) maxY = a.y;
  }
  // center on the bounding-box midpoint
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let w = Math.max(minWidth, (maxX - minX) + 2 * pad);
  let h = Math.max(minWidth / baseAspect, (maxY - minY) + 2 * pad);
  // expand to match the SVG's aspect ratio so nothing stretches
  const targetAspect = baseAspect;
  if (w / h < targetAspect) w = h * targetAspect;
  else h = w / targetAspect;
  const vbX = cx - w / 2;
  const vbY = cy - h / 2;
  return `${vbX} ${vbY} ${w} ${h}`;
}

/**
 * Render a molecule with the given attempt into the SVG element.
 * @param {SVGElement} svg
 * @param {object} molecule
 * @param {object} attempt
 * @param {object} opts
 *   - onAtomClick(atomIndex)
 *   - onGapClick(i, j)
 *   - glowMode: "live" (default) | "none" (exam mode)
 */
export function render(svg, molecule, attempt, opts) {
  // clear
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // auto-fit viewBox to this molecule so small molecules fill the canvas
  svg.setAttribute("viewBox", autoViewBox(molecule));
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // draw bonds first (behind atoms)
  for (const [i, j] of molecule.edges) {
    const order = attempt.bonds[edgeKey(i, j)] || 0;
    if (order > 0) drawBond(svg, molecule.atoms[i], molecule.atoms[j], order);
  }

  // draw gap hits (above bonds, below atom halos)
  for (const [i, j] of molecule.edges) {
    drawGapHit(svg, molecule.atoms[i], molecule.atoms[j], [i, j], opts.onGapClick);
  }

  // draw atoms last (foreground)
  for (let i = 0; i < molecule.atoms.length; i++) {
    drawAtom(svg, molecule.atoms[i], i, attempt, molecule, opts);
  }
}
