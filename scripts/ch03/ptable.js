/* Shared periodic-table renderer for chapter 3.
   SVG grid keyed off elements.json xpos/ypos.
   Same component instance per interactive (builder, families, heatmap, boss).

   Public API (returned by createPTable):
     setElements(arr)         install element data
     setMode(modeFn)          modeFn(el) → {fill, dim, hidden} per cell
     setHighlight(zSet)       border highlight (truthy = hl class)
     setDim(zSet)             dim cells in this set; cleared on null
     setClickable(on, cb)     enable .clickable + onClick(el)
     onHover(cb)              cb(el|null)
     flash(z)                 brief glow on Z
     getCells()               { z → DOM g node }
     redraw()                 reapply current mode (e.g. after data update)
     svg                      the root SVG element
*/

const COLS = 18;
const MAIN_ROWS = 7;       // periods 1..7
const F_ROWS = [9, 10];    // lanthanides + actinides float below
const TOTAL_ROWS = 9;      // visual rows: 7 main + 1 spacer + 2 floating (compressed)

const CELL = 30;           // base cell size in svg user units
const GAP = 2;
const PAD_TOP = 18;
const PAD_LEFT = 26;       // room for row numbers
const PAD_RIGHT = 8;
const F_GAP = 14;          // visual gap before f-block

const SVG_NS = "http://www.w3.org/2000/svg";

export function createPTable(stageEl, opts = {}) {
  const compact = opts.compact || false;
  const cellSize = opts.cellSize || CELL;
  const showAxis = opts.showAxis !== false;

  // wrap so we can horizontal-scroll on mobile
  const wrap = document.createElement("div");
  wrap.className = "ptable-wrap";
  wrap.style.position = "relative";
  stageEl.appendChild(wrap);

  const W = PAD_LEFT + COLS * (cellSize + GAP) + PAD_RIGHT;
  const H = PAD_TOP + (MAIN_ROWS + 0.4) * (cellSize + GAP) + F_GAP +
            2 * (cellSize + GAP) + 8;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "ptable-svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  wrap.appendChild(svg);

  // floating tooltip
  const tip = document.createElement("div");
  tip.className = "ptable-tooltip";
  tip.style.display = "none";
  wrap.appendChild(tip);

  // group containers
  const gAxis = document.createElementNS(SVG_NS, "g");
  const gCells = document.createElementNS(SVG_NS, "g");
  const gOverlay = document.createElementNS(SVG_NS, "g");
  svg.appendChild(gAxis);
  svg.appendChild(gCells);
  svg.appendChild(gOverlay);

  const state = {
    elements: [],
    cells: {},        // z → g node
    cellsByXY: {},    // "x,y" → g
    mode: null,
    dim: new Set(),
    hl: new Set(),
    clickable: false,
    onClick: null,
    onHover: null,
  };

  function xyToPx(x, y) {
    let px = PAD_LEFT + (x - 1) * (cellSize + GAP);
    let py = PAD_TOP + (y - 1) * (cellSize + GAP);
    if (y >= 9) py += F_GAP - (cellSize + GAP) * 0.6; // tuck floating rows up
    return { px, py };
  }

  function makeAxis() {
    if (!showAxis) return;
    // group numbers on top (1..18)
    for (let g = 1; g <= COLS; g++) {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("class", "ptable-axis group");
      t.setAttribute("data-group", String(g));
      const { px } = xyToPx(g, 1);
      t.setAttribute("x", px + cellSize / 2);
      t.setAttribute("y", PAD_TOP - 6);
      t.textContent = String(g);
      gAxis.appendChild(t);
    }
    // period numbers down the left side, for rows 1..7
    for (let p = 1; p <= MAIN_ROWS; p++) {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("class", "ptable-axis");
      const { py } = xyToPx(1, p);
      t.setAttribute("x", PAD_LEFT - 10);
      t.setAttribute("y", py + cellSize / 2 + 3);
      t.setAttribute("text-anchor", "end");
      t.textContent = String(p);
      gAxis.appendChild(t);
    }
  }

  function makeCells() {
    state.cells = {};
    state.cellsByXY = {};
    for (const el of state.elements) {
      const { px, py } = xyToPx(el.xpos, el.ypos);
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "ptable-cell");
      g.setAttribute("transform", `translate(${px}, ${py})`);
      g.dataset.z = String(el.z);

      const r = document.createElementNS(SVG_NS, "rect");
      r.setAttribute("width", cellSize);
      r.setAttribute("height", cellSize);
      r.setAttribute("rx", 3);
      g.appendChild(r);

      const sym = document.createElementNS(SVG_NS, "text");
      sym.setAttribute("class", "sym");
      sym.setAttribute("x", cellSize / 2);
      sym.setAttribute("y", cellSize / 2 + 1);
      sym.setAttribute("font-size", String(Math.round(cellSize * 0.42)));
      sym.textContent = el.symbol;
      g.appendChild(sym);

      const z = document.createElementNS(SVG_NS, "text");
      z.setAttribute("class", "z");
      z.setAttribute("x", cellSize - 3);
      z.setAttribute("y", 8);
      z.setAttribute("font-size", "7");
      z.setAttribute("text-anchor", "end");
      z.textContent = String(el.z);
      g.appendChild(z);

      // event wiring (always attached; behavior gated by state)
      g.addEventListener("mouseenter", (e) => {
        if (state.onHover) state.onHover(el);
        showTip(el, e);
      });
      g.addEventListener("mousemove", (e) => moveTip(e));
      g.addEventListener("mouseleave", () => {
        if (state.onHover) state.onHover(null);
        hideTip();
      });
      g.addEventListener("click", () => {
        if (state.clickable && state.onClick) state.onClick(el);
      });

      gCells.appendChild(g);
      state.cells[el.z] = g;
      state.cellsByXY[`${el.xpos},${el.ypos}`] = g;
    }
  }

  function showTip(el, ev) {
    const lines = [];
    lines.push(`<div class="name">${el.name} &middot; ${el.symbol}</div>`);
    lines.push(`Z=${el.z} &middot; ${el.configSemantic}`);
    if (state.tooltipExtra) {
      const extra = state.tooltipExtra(el);
      if (extra) lines.push(extra);
    }
    tip.innerHTML = lines.join("<br>");
    tip.style.display = "block";
    moveTip(ev);
  }

  function moveTip(ev) {
    const rect = wrap.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const tw = tip.offsetWidth;
    let nx = x + 14;
    if (nx + tw > rect.width - 8) nx = x - tw - 14;
    tip.style.left = Math.max(4, nx) + "px";
    tip.style.top = (y + 14) + "px";
  }

  function hideTip() {
    tip.style.display = "none";
  }

  function applyMode() {
    if (!state.mode) {
      for (const z in state.cells) {
        const g = state.cells[z];
        const r = g.querySelector("rect");
        r.style.fill = "";
        r.style.stroke = "";
        const sym = g.querySelector("text.sym");
        sym.style.fill = "";
        g.classList.remove("hidden");
        g.style.display = "";
      }
      return;
    }
    for (const el of state.elements) {
      const g = state.cells[el.z];
      const r = g.querySelector("rect");
      const sym = g.querySelector("text.sym");
      const m = state.mode(el) || {};
      if (m.hidden) {
        g.style.display = "none";
        continue;
      }
      g.style.display = "";
      r.style.fill = m.fill || "";
      r.style.stroke = m.stroke || "";
      sym.style.fill = m.text || "";
      if (m.glowColor) {
        g.style.color = m.glowColor;     // currentColor for flash filter
      } else {
        g.style.color = "";
      }
    }
  }

  function applyDim() {
    for (const z in state.cells) {
      const g = state.cells[z];
      g.classList.toggle("dim", state.dim.has(+z));
    }
  }

  function applyHighlight() {
    for (const z in state.cells) {
      const g = state.cells[z];
      g.classList.toggle("hl", state.hl.has(+z));
    }
  }

  function applyClickable() {
    for (const z in state.cells) {
      state.cells[z].classList.toggle("clickable", state.clickable);
    }
  }

  // -- public API --

  const api = {
    svg,
    wrap,
    setElements(arr) {
      state.elements = arr;
      // clear & rebuild
      while (gCells.firstChild) gCells.removeChild(gCells.firstChild);
      while (gAxis.firstChild) gAxis.removeChild(gAxis.firstChild);
      makeAxis();
      makeCells();
      applyMode();
      applyDim();
      applyHighlight();
      applyClickable();
    },
    setMode(modeFn) {
      state.mode = modeFn;
      applyMode();
    },
    setTooltipExtra(fn) {
      state.tooltipExtra = fn;
    },
    setDim(zSet) {
      state.dim = zSet instanceof Set ? zSet : new Set(zSet || []);
      applyDim();
    },
    setHighlight(zSet) {
      state.hl = zSet instanceof Set ? zSet : new Set(zSet || []);
      applyHighlight();
    },
    setClickable(on, cb) {
      state.clickable = !!on;
      state.onClick = cb || null;
      applyClickable();
    },
    onHover(cb) { state.onHover = cb || null; },
    onGroupClick(cb) {
      gAxis.querySelectorAll("text.group").forEach((t) => {
        t.addEventListener("click", () => cb(+t.dataset.group));
      });
    },
    setActiveGroup(g) {
      gAxis.querySelectorAll("text.group").forEach((t) => {
        t.classList.toggle("active", +t.dataset.group === g);
      });
    },
    flash(z) {
      const g = state.cells[z];
      if (!g) return;
      g.classList.add("flash");
      setTimeout(() => g.classList.remove("flash"), 700);
    },
    getCells() { return state.cells; },
    getElement(z) {
      return state.elements.find((e) => e.z === z);
    },
    redraw: applyMode,
  };

  return api;
}

/* helpers shared by interactives */

import { SUBSHELL_COLORS } from "../shared.js";

export function blockColor(block) {
  if (!block || !SUBSHELL_COLORS[block]) return "";
  return SUBSHELL_COLORS[block]();
}

// fill style for a cell tinted by block color at a soft opacity
export function blockFill(block, alpha = 0.22) {
  const c = blockColor(block);
  if (!c) return "";
  return colorMix(c, alpha);
}

export function colorMix(c, alpha) {
  // c could be hex or rgb; use CSS color-mix for consistency with the theme
  return `color-mix(in srgb, ${c} ${Math.round(alpha * 100)}%, transparent)`;
}
