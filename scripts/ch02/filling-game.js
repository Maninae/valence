/* 2.3 — the filling game. SVG energy ladder of orbital boxes (one box per
   orbital, not per subshell). Click a box to drop the next electron in
   (alternating ↑ ↓). Aufbau/Hund/Pauli enforced with friendly inline
   corrections. Auto-fill, undo, reset. Live config string with subshell
   colors. Targets: H..Kr via elements.json. */

import { loadData, cssVar, SUBSHELL_COLORS } from "../shared.js";

// fixed list of orbitals in the order they appear on the energy ladder
// (the aufbau order). Each is one orbital; subshells expand to several.
// Used both for layout and for the aufbau "lowest seat" rule.
const LADDER = [
  { sub: "1s", n: 1, l: 0, m: 0, rung: 0 },
  { sub: "2s", n: 2, l: 0, m: 0, rung: 1 },
  { sub: "2p", n: 2, l: 1, m: -1, rung: 2 },
  { sub: "2p", n: 2, l: 1, m: 0, rung: 2 },
  { sub: "2p", n: 2, l: 1, m: 1, rung: 2 },
  { sub: "3s", n: 3, l: 0, m: 0, rung: 3 },
  { sub: "3p", n: 3, l: 1, m: -1, rung: 4 },
  { sub: "3p", n: 3, l: 1, m: 0, rung: 4 },
  { sub: "3p", n: 3, l: 1, m: 1, rung: 4 },
  { sub: "4s", n: 4, l: 0, m: 0, rung: 5 },          // BELOW 3d on the ladder
  { sub: "3d", n: 3, l: 2, m: -2, rung: 6 },
  { sub: "3d", n: 3, l: 2, m: -1, rung: 6 },
  { sub: "3d", n: 3, l: 2, m: 0, rung: 6 },
  { sub: "3d", n: 3, l: 2, m: 1, rung: 6 },
  { sub: "3d", n: 3, l: 2, m: 2, rung: 6 },
  { sub: "4p", n: 4, l: 1, m: -1, rung: 7 },
  { sub: "4p", n: 4, l: 1, m: 0, rung: 7 },
  { sub: "4p", n: 4, l: 1, m: 1, rung: 7 },
];

const SUBSHELLS_IN_ORDER = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p"];
const RUNG_LABEL = { 0: "1s", 1: "2s", 2: "2p", 3: "3s", 4: "3p", 5: "4s", 6: "3d", 7: "4p" };

// element-config string -> array of subshell counts in the order they appear
// in the configSemantic string (which uses the noble-gas core, but the raw
// `config` field expands it). We use `config` for ground truth.
function parseConfig(raw) {
  // "1s2 2s2 2p6 4s2 3d6" -> [{sub:'1s',n:2}, ...]
  return raw.trim().split(/\s+/).map((tok) => {
    const m = tok.match(/^(\d+)([spdf])(\d+)$/);
    if (!m) return null;
    return { sub: m[1] + m[2], count: +m[3] };
  }).filter(Boolean);
}

// total electrons in a parsed config
const totalElectrons = (parsed) => parsed.reduce((s, p) => s + p.count, 0);

// pretty config string from a per-subshell count map
function formatConfig(counts) {
  return SUBSHELLS_IN_ORDER
    .filter((s) => counts[s] > 0)
    .map((s) => {
      const c = SUBSHELL_COLORS[s[1]]();
      return `<span style="color:${c}">${s}<sup>${counts[s]}</sup></span>`;
    })
    .join(" ");
}

// The actual aufbau ladder order — for "lowest open seat".
// At each rung, a seat is "available" if its orbital has <2 electrons.
function findLowestRungWithOpenSeat(electrons) {
  // electrons: map keyed by ladder index -> count (0,1,2)
  for (let rung = 0; rung <= 7; rung++) {
    const seats = LADDER.filter((o) => o.rung === rung);
    const open = seats.some((seat, i) => {
      const idx = LADDER.indexOf(seat);
      return (electrons[idx] || 0) < 2;
    });
    if (open) return rung;
  }
  return 8;
}

// Hund check at a given rung: if any orbital in the rung is unpaired (1 e),
// then the next electron in this rung must go in another empty orbital,
// not pair up.
function hundLegal(electrons, ladderIdx) {
  const target = LADDER[ladderIdx];
  const seats = LADDER.map((o, i) => ({ o, i }))
    .filter(({ o }) => o.rung === target.rung);
  const hasEmpty = seats.some(({ i }) => (electrons[i] || 0) === 0);
  const currentCount = electrons[ladderIdx] || 0;
  // if we're trying to put a 2nd electron in this orbital while another
  // orbital in the same subshell is still empty → Hund violation
  if (currentCount === 1 && hasEmpty) return false;
  return true;
}

export async function initFillingGame() {
  const stage = document.getElementById("filling-stage");
  const sel = document.getElementById("filling-element");
  const undoBtn = document.getElementById("filling-undo");
  const resetBtn = document.getElementById("filling-reset");
  const autoBtn = document.getElementById("filling-auto");
  const built = document.getElementById("filling-built");
  const targetline = document.getElementById("filling-targetline");
  const feedback = document.getElementById("filling-feedback");
  const cfgRow = document.getElementById("filling-config");
  if (!stage || !sel) return;

  const elements = await loadData("elements");
  // H..Kr (Z 1..36) is enough to span 1s..4p
  const choices = elements.filter((e) => e.z >= 1 && e.z <= 36);
  for (const e of choices) {
    const opt = document.createElement("option");
    opt.value = e.symbol;
    opt.textContent = `${e.symbol}  ·  Z=${e.z}  ·  ${e.name}`;
    sel.appendChild(opt);
  }
  sel.value = "Ca"; // good default: ends in 4s, before any d funniness

  // ---------- SVG ladder ----------
  // Fixed coordinate space (viewBox); SVG scales to container width and keeps
  // its intrinsic aspect ratio, so mobile renders the same layout shrunk.
  const svgNS = "http://www.w3.org/2000/svg";
  const W = 760;
  const H = 360;

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", "100%");
  svg.style.maxWidth = W + "px";
  svg.style.height = "auto";
  svg.style.display = "block";
  stage.appendChild(svg);

  // background subtle
  // 8 rungs total; lay out vertically with 4p at top (high energy), 1s at bottom
  const PAD_T = 18, PAD_B = 18;
  const rungY = (rung) => PAD_B + (7 - rung) * ((H - PAD_T - PAD_B) / 7);

  // place orbital boxes per rung horizontally
  const BOX_W = 30, BOX_H = 30, BOX_GAP = 6;
  const PAD_L = 200;
  // rung-by-rung centered group
  const rungBoxes = {};
  for (let r = 0; r <= 7; r++) {
    const seats = LADDER.map((o, i) => ({ o, i })).filter(({ o }) => o.rung === r);
    const groupW = seats.length * BOX_W + (seats.length - 1) * BOX_GAP;
    const startX = PAD_L;
    rungBoxes[r] = seats.map(({ o, i }, k) => ({
      idx: i,
      x: startX + k * (BOX_W + BOX_GAP),
      y: rungY(r) - BOX_H / 2,
    }));
  }

  // rung labels (left side) — show subshell letters at their rung
  for (let r = 0; r <= 7; r++) {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", PAD_L - 18);
    t.setAttribute("y", rungY(r) + 5);
    t.setAttribute("text-anchor", "end");
    t.setAttribute("font-family", cssVar("--mono"));
    t.setAttribute("font-size", "14");
    t.setAttribute("font-weight", "600");
    const sub = RUNG_LABEL[r];
    t.setAttribute("fill", SUBSHELL_COLORS[sub[1]]());
    t.textContent = sub;
    svg.appendChild(t);

    // faint horizontal rung line
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", PAD_L - 6);
    line.setAttribute("x2", W - 16);
    line.setAttribute("y1", rungY(r));
    line.setAttribute("y2", rungY(r));
    line.setAttribute("stroke", cssVar("--rule"));
    line.setAttribute("stroke-dasharray", "2 5");
    svg.appendChild(line);
  }

  // energy axis arrow + label
  const ax = document.createElementNS(svgNS, "line");
  ax.setAttribute("x1", 28);
  ax.setAttribute("x2", 28);
  ax.setAttribute("y1", rungY(7) - 6);
  ax.setAttribute("y2", rungY(0) + 6);
  ax.setAttribute("stroke", cssVar("--text-muted"));
  ax.setAttribute("stroke-width", "1");
  ax.setAttribute("marker-end", "url(#arrowhead-up)");
  svg.appendChild(ax);

  // marker
  const defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML = `<marker id="arrowhead-up" viewBox="0 0 10 10" refX="5" refY="0" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 10 L 5 0 L 10 10 z" fill="${cssVar("--text-muted")}" /></marker>`;
  svg.appendChild(defs);

  const eAxLabel = document.createElementNS(svgNS, "text");
  eAxLabel.setAttribute("x", 18);
  eAxLabel.setAttribute("y", rungY(7) - 14);
  eAxLabel.setAttribute("font-family", cssVar("--mono"));
  eAxLabel.setAttribute("font-size", "11");
  eAxLabel.setAttribute("fill", cssVar("--text-muted"));
  eAxLabel.textContent = "energy";
  svg.appendChild(eAxLabel);

  // crossing annotation (4s below 3d)
  // small label between 4s rung and 3d rung explaining the gap
  const cross = document.createElementNS(svgNS, "text");
  cross.setAttribute("x", W - 24);
  cross.setAttribute("y", (rungY(5) + rungY(6)) / 2 + 4);
  cross.setAttribute("text-anchor", "end");
  cross.setAttribute("font-family", cssVar("--mono"));
  cross.setAttribute("font-size", "11");
  cross.setAttribute("fill", cssVar("--text-muted"));
  cross.textContent = "← 4s sneaks below 3d here";
  svg.appendChild(cross);

  // ---------- box rendering + click handlers ----------
  const boxEls = []; // index in LADDER → { rect, arrows: [el, el], group }
  for (let i = 0; i < LADDER.length; i++) {
    const o = LADDER[i];
    // find box position
    const placed = rungBoxes[o.rung].find((p) => p.idx === i);
    const g = document.createElementNS(svgNS, "g");
    g.style.cursor = "pointer";
    svg.appendChild(g);

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", placed.x);
    rect.setAttribute("y", placed.y);
    rect.setAttribute("width", BOX_W);
    rect.setAttribute("height", BOX_H);
    rect.setAttribute("rx", 4);
    rect.setAttribute("fill", "var(--bg-elevated)");
    rect.setAttribute("stroke", cssVar("--rule-strong"));
    rect.setAttribute("stroke-width", "1");
    g.appendChild(rect);

    // up arrow (left half)
    const upArr = document.createElementNS(svgNS, "text");
    upArr.setAttribute("x", placed.x + BOX_W * 0.3);
    upArr.setAttribute("y", placed.y + BOX_H * 0.72);
    upArr.setAttribute("text-anchor", "middle");
    upArr.setAttribute("font-family", cssVar("--mono"));
    upArr.setAttribute("font-size", "18");
    upArr.setAttribute("font-weight", "600");
    upArr.textContent = "↑";
    upArr.setAttribute("opacity", "0");
    g.appendChild(upArr);

    const dnArr = document.createElementNS(svgNS, "text");
    dnArr.setAttribute("x", placed.x + BOX_W * 0.7);
    dnArr.setAttribute("y", placed.y + BOX_H * 0.72);
    dnArr.setAttribute("text-anchor", "middle");
    dnArr.setAttribute("font-family", cssVar("--mono"));
    dnArr.setAttribute("font-size", "18");
    dnArr.setAttribute("font-weight", "600");
    dnArr.textContent = "↓";
    dnArr.setAttribute("opacity", "0");
    g.appendChild(dnArr);

    g.addEventListener("click", () => attemptPlace(i));
    boxEls.push({ rect, upArr, dnArr });
  }

  // ---------- state ----------
  let electrons = {}; // ladderIdx → 0/1/2
  let history = []; // ladderIdx push for undo
  let autoTimer = null;

  function targetCounts() {
    return parseConfig(currentTargetConfig());
  }
  function currentTargetConfig() {
    const sym = sel.value;
    const el = choices.find((c) => c.symbol === sym);
    return el.config;
  }
  function targetZ() {
    return choices.find((c) => c.symbol === sel.value).z;
  }

  function builtCounts() {
    const counts = {};
    for (const s of SUBSHELLS_IN_ORDER) counts[s] = 0;
    for (let i = 0; i < LADDER.length; i++) {
      const o = LADDER[i];
      counts[o.sub] = (counts[o.sub] || 0) + (electrons[i] || 0);
    }
    return counts;
  }

  function targetSubshellCounts() {
    const counts = {};
    for (const s of SUBSHELLS_IN_ORDER) counts[s] = 0;
    for (const t of parseConfig(currentTargetConfig())) counts[t.sub] = t.count;
    return counts;
  }

  function totalPlaced() {
    return history.length;
  }

  function isComplete() {
    const bc = builtCounts();
    const tc = targetSubshellCounts();
    return SUBSHELLS_IN_ORDER.every((s) => bc[s] === tc[s]);
  }

  function render() {
    for (let i = 0; i < LADDER.length; i++) {
      const c = electrons[i] || 0;
      const o = LADDER[i];
      const color = SUBSHELL_COLORS[o.sub[1]]();
      const { rect, upArr, dnArr } = boxEls[i];
      rect.setAttribute("stroke", c > 0 ? color : cssVar("--rule-strong"));
      rect.setAttribute("fill", c > 0
        ? `color-mix(in srgb, ${color} 10%, var(--bg-elevated))`
        : "var(--bg-elevated)");
      upArr.setAttribute("opacity", c >= 1 ? "1" : "0");
      upArr.setAttribute("fill", color);
      dnArr.setAttribute("opacity", c >= 2 ? "1" : "0");
      dnArr.setAttribute("fill", color);
    }
    const bc = builtCounts();
    built.innerHTML = formatConfig(bc) || `<span style="color:${cssVar("--text-muted")}">empty</span>`;
    const tc = targetSubshellCounts();
    targetline.innerHTML = `target ${sel.value}: ${formatConfigTarget(tc)} &nbsp;·&nbsp; ${totalPlaced()}/${targetZ()} electrons`;
    cfgRow.classList.toggle("complete", isComplete());
  }

  function formatConfigTarget(counts) {
    return SUBSHELLS_IN_ORDER
      .filter((s) => counts[s] > 0)
      .map((s) => `${s}${counts[s]}`)
      .join(" ");
  }

  function setFeedback(msg, kind = "") {
    feedback.textContent = msg;
    feedback.className = "feedback" + (kind ? " " + kind : "");
  }

  function attemptPlace(ladderIdx) {
    if (totalPlaced() >= targetZ()) {
      setFeedback(`${sel.value} only has ${targetZ()} electrons — this atom is full.`, "warn");
      return;
    }
    const orb = LADDER[ladderIdx];
    const c = electrons[ladderIdx] || 0;

    // Pauli
    if (c >= 2) {
      setFeedback("Pauli: an orbital fits two electrons, opposite spins. This one is full.", "warn");
      flashBox(ladderIdx);
      return;
    }
    // Aufbau: must take a seat at the lowest rung that still has any opening
    const lowestRung = findLowestRungWithOpenSeat(electrons);
    if (orb.rung > lowestRung) {
      setFeedback(`Aufbau: that seat costs more energy — a cheaper one is open on the ${RUNG_LABEL[lowestRung]} rung.`, "warn");
      flashBox(ladderIdx);
      return;
    }
    // Hund: within a subshell, spread out before pairing
    if (!hundLegal(electrons, ladderIdx)) {
      setFeedback("Hund: electrons in the same subshell spread out first. Empty orbitals at this rung are still available.", "warn");
      flashBox(ladderIdx);
      return;
    }

    // place it
    electrons[ladderIdx] = c + 1;
    history.push(ladderIdx);
    render();
    if (isComplete() && totalPlaced() === targetZ()) {
      setFeedback(`${sel.value} built — ground-state configuration.`, "good");
      celebrate();
    } else {
      setFeedback("");
    }
  }

  function flashBox(i) {
    const { rect } = boxEls[i];
    const prev = rect.getAttribute("stroke");
    rect.setAttribute("stroke", cssVar("--rose"));
    setTimeout(() => rect.setAttribute("stroke", prev), 220);
  }

  function celebrate() {
    // brief flash on the config row (handled via .complete class)
    // also glow each filled box once
    for (let i = 0; i < LADDER.length; i++) {
      if ((electrons[i] || 0) > 0) {
        const { rect } = boxEls[i];
        const orig = rect.getAttribute("stroke-width") || "1";
        rect.setAttribute("stroke-width", "2");
        setTimeout(() => rect.setAttribute("stroke-width", orig), 700);
      }
    }
  }

  function reset() {
    electrons = {};
    history = [];
    setFeedback("");
    render();
  }

  function undo() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    const last = history.pop();
    if (last == null) return;
    electrons[last] = Math.max(0, (electrons[last] || 0) - 1);
    setFeedback("");
    render();
  }

  // auto-fill plays the correct moves, one per tick. Uses the same legality
  // engine as a real click to demonstrate the rules.
  function autoFill() {
    if (autoTimer) return;
    autoTimer = setInterval(() => {
      if (totalPlaced() >= targetZ() || isComplete()) {
        clearInterval(autoTimer); autoTimer = null;
        return;
      }
      // find the lowest rung with an open seat; within it, prefer the
      // orbital with the smallest current count (Hund)
      const rung = findLowestRungWithOpenSeat(electrons);
      const seats = LADDER.map((o, i) => ({ o, i }))
        .filter(({ o }) => o.rung === rung);
      let best = seats[0].i, bestCount = electrons[seats[0].i] || 0;
      for (const { i } of seats) {
        const c = electrons[i] || 0;
        if (c < bestCount) { best = i; bestCount = c; }
      }
      attemptPlace(best);
    }, 160);
  }

  sel.addEventListener("change", () => {
    reset();
    render();
  });
  undoBtn.addEventListener("click", undo);
  resetBtn.addEventListener("click", () => {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    reset();
  });
  autoBtn.addEventListener("click", () => {
    reset();
    autoFill();
  });

  render();
  setFeedback("click an orbital to drop in the next electron.");
}
