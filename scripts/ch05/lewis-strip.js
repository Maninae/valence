/* 5.1 — Lewis dot symbol strip.
   Main-group elements rows 1-3. Click an element, see its symbol with
   dots placed singly on N/E/S/W first, then paired (Hund-style). The
   valence count derives from configSemantic's outermost s + p shells. */
import { loadData } from "../shared.js";

// rows shown in the strip (group numbers per row, gaps allowed)
// row 1: H, He
// row 2: Li, Be, B, C, N, O, F, Ne
// row 3: Na, Mg, Al, Si, P, S, Cl, Ar
const ROWS = [
  ["H", "He"],
  ["Li", "Be", "B", "C", "N", "O", "F", "Ne"],
  ["Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"],
];

// Order in which dots are placed: top, right, bottom, left, then double each.
// Coordinates are offsets from the center of the symbol box.
const DOT_POSITIONS = [
  // singles first (1..4), then pair second dot for each side (5..8)
  { x: 0, y: -34 }, { x: 34, y: 0 }, { x: 0, y: 34 }, { x: -34, y: 0 },
  { x: -10, y: -34 }, { x: 34, y: -10 }, { x: 10, y: 34 }, { x: -34, y: 10 },
];
// when we place the second dot on a side, shift the first one to the matching side-pair offset
const DOT_PAIR_FIRST_SHIFT = [
  { x: 10, y: -34 }, { x: 34, y: 10 }, { x: -10, y: 34 }, { x: -34, y: -10 },
];

// Parse configSemantic like "[He] 2s2 2p4" → valence count = s+p electrons
// in the OUTERMOST shell.
function valenceFromSemantic(semantic) {
  // strip the bracketed core
  const stripped = semantic.replace(/\[[^\]]+\]\s*/, "").trim();
  if (!stripped) return { count: 0, subshells: [] };
  const tokens = stripped.split(/\s+/);
  // each token: nL<count>, e.g. "2s2", "2p4". keep only s/p in the highest shell.
  let maxShell = 0;
  for (const t of tokens) {
    const m = /^(\d+)([spdf])(\d+)$/.exec(t);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n > maxShell) maxShell = n;
  }
  const out = [];
  let count = 0;
  for (const t of tokens) {
    const m = /^(\d+)([spdf])(\d+)$/.exec(t);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    const l = m[2];
    const c = parseInt(m[3], 10);
    if (n === maxShell && (l === "s" || l === "p")) {
      out.push({ n, l, count: c });
      count += c;
    }
  }
  return { count, subshells: out };
}

function escapeForId(symbol) {
  return symbol.replace(/[^a-zA-Z0-9]/g, "");
}

export async function initLewisStrip() {
  const stripEl = document.getElementById("lewis-strip");
  const svg = document.getElementById("lewis-symbol");
  const readout = document.getElementById("lewis-readout");
  if (!stripEl || !svg || !readout) return;

  const elements = await loadData("elements");
  const bySymbol = new Map(elements.map((e) => [e.symbol, e]));

  let current = "C";

  // build the strip with row breaks
  stripEl.innerHTML = "";
  ROWS.forEach((row) => {
    row.forEach((sym) => {
      const b = document.createElement("button");
      b.className = "el-btn";
      b.dataset.sym = sym;
      b.textContent = sym;
      b.setAttribute("aria-pressed", String(sym === current));
      b.addEventListener("click", () => {
        current = sym;
        stripEl.querySelectorAll(".el-btn").forEach((btn) =>
          btn.setAttribute("aria-pressed", String(btn.dataset.sym === current)));
        draw();
      });
      stripEl.appendChild(b);
    });
    const sp = document.createElement("div");
    sp.className = "el-spacer";
    stripEl.appendChild(sp);
  });

  function draw() {
    const el = bySymbol.get(current);
    if (!el) return;
    const { count, subshells } = valenceFromSemantic(el.configSemantic);

    svg.innerHTML = "";
    const cx = 120, cy = 100;

    // central symbol
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", cy);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", "var(--display)");
    text.setAttribute("font-size", "40");
    text.setAttribute("font-weight", "600");
    text.setAttribute("fill", "var(--text-primary)");
    text.textContent = el.symbol;
    svg.appendChild(text);

    // dot placement: singly on each of 4 sides first (up to 4 electrons),
    // then a second dot per side for 5..8.
    const dotPlacements = [];
    for (let i = 0; i < count && i < 4; i++) {
      dotPlacements.push({ ...DOT_POSITIONS[i], side: i });
    }
    for (let i = 4; i < count && i < 8; i++) {
      const side = i - 4;
      // shift the first dot on that side to make room for a pair
      dotPlacements[side] = { ...DOT_PAIR_FIRST_SHIFT[side], side };
      dotPlacements.push({ ...DOT_POSITIONS[i], side });
    }

    dotPlacements.forEach((d) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", cx + d.x);
      c.setAttribute("cy", cy + d.y);
      c.setAttribute("r", "4");
      c.setAttribute("fill", "var(--accent)");
      c.setAttribute("style", "filter: drop-shadow(0 0 6px var(--accent));");
      svg.appendChild(c);
    });

    // readout: configuration colored by subshell, then valence count
    const cfg = subshells.length === 0
      ? '<span class="sub-s">(no valence s/p)</span>'
      : subshells
          .map((s) => `<span class="sub-${s.l}">${s.n}${s.l}${s.count}</span>`)
          .join(" ");
    readout.innerHTML =
      `<span>${el.name}</span>` +
      `<span>valence: ${cfg}</span>` +
      `<span class="lewis-count">${count} dot${count === 1 ? "" : "s"}</span>`;
  }

  draw();
}
