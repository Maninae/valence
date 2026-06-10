/* 5.2 — Octet/duet counter diagrams.
   Inline SVG figures of H2 (2-electron count) and HCl (2 vs 8) with
   shells drawn as circles around each atom, the shared pair sitting
   in the overlap so both atoms count it. */

const NS = "http://www.w3.org/2000/svg";

function makeSvg(viewBox) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("xmlns", NS);
  return svg;
}

function txt(svg, x, y, content, opts = {}) {
  const t = document.createElementNS(NS, "text");
  t.setAttribute("x", x);
  t.setAttribute("y", y);
  t.setAttribute("text-anchor", opts.anchor || "middle");
  t.setAttribute("dominant-baseline", "central");
  t.setAttribute("font-family", opts.family || "var(--display)");
  t.setAttribute("font-size", opts.size || 24);
  t.setAttribute("font-weight", opts.weight || 600);
  t.setAttribute("fill", opts.fill || "var(--text-primary)");
  t.textContent = content;
  svg.appendChild(t);
  return t;
}

function circ(svg, x, y, r, opts = {}) {
  const c = document.createElementNS(NS, "circle");
  c.setAttribute("cx", x);
  c.setAttribute("cy", y);
  c.setAttribute("r", r);
  c.setAttribute("fill", opts.fill || "none");
  c.setAttribute("stroke", opts.stroke || "var(--rule-strong)");
  c.setAttribute("stroke-width", opts.strokeWidth || 1.2);
  if (opts.dash) c.setAttribute("stroke-dasharray", opts.dash);
  svg.appendChild(c);
  return c;
}

function dot(svg, x, y, color = "var(--accent)") {
  const c = document.createElementNS(NS, "circle");
  c.setAttribute("cx", x);
  c.setAttribute("cy", y);
  c.setAttribute("r", 3.6);
  c.setAttribute("fill", color);
  c.setAttribute("style", `filter: drop-shadow(0 0 5px ${color});`);
  svg.appendChild(c);
  return c;
}

// H2: two hydrogens, shell radius small, shared pair in the overlap.
function drawH2() {
  const svg = makeSvg("0 0 340 220");
  const y = 110;
  const x1 = 110, x2 = 230;

  // shells (dashed, count-of-2 region)
  circ(svg, x1, y, 38, { stroke: "var(--accent)", dash: "3 4", strokeWidth: 1 });
  circ(svg, x2, y, 38, { stroke: "var(--accent)", dash: "3 4", strokeWidth: 1 });

  // shared pair in the overlap
  dot(svg, 165, y - 5);
  dot(svg, 175, y + 5);

  // symbols
  txt(svg, x1, y, "H");
  txt(svg, x2, y, "H");

  // counts
  txt(svg, x1, y + 70, "counts 2", { size: 12, weight: 500, fill: "var(--green)", family: "var(--mono)" });
  txt(svg, x2, y + 70, "counts 2", { size: 12, weight: 500, fill: "var(--green)", family: "var(--mono)" });
  txt(svg, 170, 30, "H2  ·  one shared pair", { size: 13, weight: 500, fill: "var(--text-muted)", family: "var(--mono)" });
  return svg;
}

// HCl: hydrogen (duet) + chlorine (octet). chlorine has 3 lone pairs.
function drawHCl() {
  const svg = makeSvg("0 0 340 220");
  const y = 110;
  const xH = 90, xCl = 230;

  // hydrogen shell (small)
  circ(svg, xH, y, 36, { stroke: "var(--accent)", dash: "3 4", strokeWidth: 1 });
  // chlorine shell (large)
  circ(svg, xCl, y, 60, { stroke: "var(--p-color)", dash: "3 4", strokeWidth: 1 });

  // shared pair (between H and Cl, in the overlap)
  dot(svg, 150, y - 5);
  dot(svg, 160, y + 5);

  // chlorine lone pairs (3 of them, at top, right, bottom — outside the H side)
  // top pair
  dot(svg, xCl - 7, y - 50);
  dot(svg, xCl + 7, y - 50);
  // right pair
  dot(svg, xCl + 50, y - 7);
  dot(svg, xCl + 50, y + 7);
  // bottom pair
  dot(svg, xCl - 7, y + 50);
  dot(svg, xCl + 7, y + 50);

  // symbols
  txt(svg, xH, y, "H");
  txt(svg, xCl, y, "Cl");

  // counts
  txt(svg, xH, y + 70, "counts 2", { size: 12, weight: 500, fill: "var(--green)", family: "var(--mono)" });
  txt(svg, xCl, y + 90, "counts 8", { size: 12, weight: 500, fill: "var(--green)", family: "var(--mono)" });
  txt(svg, 170, 30, "HCl  ·  shared pair + Cl's 3 lone pairs", { size: 13, weight: 500, fill: "var(--text-muted)", family: "var(--mono)" });

  return svg;
}

export function initOctetDiagrams() {
  const host = document.getElementById("octet-diagrams");
  if (!host) return;

  host.innerHTML = "";

  const f1 = document.createElement("figure");
  f1.appendChild(drawH2());
  const c1 = document.createElement("figcaption");
  c1.textContent = "H2 — both atoms count the shared pair toward their full shell of 2 (a duet).";
  f1.appendChild(c1);

  const f2 = document.createElement("figure");
  f2.appendChild(drawHCl());
  const c2 = document.createElement("figcaption");
  c2.textContent = "HCl — hydrogen counts 2, chlorine counts 8 (the shared pair + three lone pairs).";
  f2.appendChild(c2);

  host.appendChild(f1);
  host.appendChild(f2);
}
