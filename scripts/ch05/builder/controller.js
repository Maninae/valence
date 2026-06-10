/* 5.4 — Lewis builder controller.
   Owns the per-interactive state object: which molecule, the working
   attempt, hint/reset wiring, ladder progression. Mounts to elements on
   the page by id. Used by both the section-5.4 main interactive and the
   boss panel (with different DOM ids + options). */

import { MOLECULES, valenceFromConfig, totalValenceElectrons } from "./molecules.js";
import {
  emptyAttempt, cycleBond, cycleLonePair, electronsPlaced,
  atomShellCount, atomState, evaluate, hintFor, validate,
} from "./engine.js";
import { render } from "./renderer.js";
import { loadData } from "../../shared.js";

/**
 * Create a builder controller.
 * @param {object} cfg
 *   - svg: SVGElement
 *   - dom: { title, sub, placed, total, atomList, status, hint, reset, ladder }
 *   - moleculeIds: array of ids to include (defaults to all)
 *   - glowMode: "live" | "none" (boss disables glow until check)
 *   - onWin?: (molecule) => void
 *   - onAttemptChange?: () => void  (boss uses this to invalidate check count)
 *   - initialId?: string
 *   - showLadder: bool
 *   - allowAtomicWin: bool (default true — section 5.4. Boss sets false; check button gates win)
 */
export async function createBuilder(cfg) {
  const elements = await loadData("elements");
  const bySymbol = new Map(elements.map((e) => [e.symbol, e]));
  const valenceLookup = (sym) => {
    const el = bySymbol.get(sym);
    return el ? valenceFromConfig(el.configSemantic) : 0;
  };

  const moleculeIds = cfg.moleculeIds || MOLECULES.map((m) => m.id);
  const pool = MOLECULES.filter((m) => moleculeIds.includes(m.id));

  const state = {
    moleculeIndex: Math.max(0, pool.findIndex((m) => m.id === cfg.initialId)) || 0,
    attempt: null,
    solved: new Set(), // ids of solved molecules in this session
    glowMode: cfg.glowMode || "live",
  };
  if (cfg.initialId) {
    const idx = pool.findIndex((m) => m.id === cfg.initialId);
    if (idx >= 0) state.moleculeIndex = idx;
  }

  function currentMolecule() {
    return pool[state.moleculeIndex];
  }

  function loadMolecule(idx) {
    state.moleculeIndex = idx;
    state.attempt = emptyAttempt(currentMolecule());
    redraw();
    setStatus("build the structure.", "");
    if (cfg.onAttemptChange) cfg.onAttemptChange();
  }

  function setStatus(msg, cls = "") {
    if (!cfg.dom.status) return;
    cfg.dom.status.textContent = msg;
    cfg.dom.status.className = "builder-status" + (cls ? " " + cls : "");
  }

  function handleGap(i, j) {
    cycleBond(state.attempt, i, j);
    redraw();
    if (state.glowMode === "live" && cfg.allowAtomicWin !== false) checkAutoWin();
    if (cfg.onAttemptChange) cfg.onAttemptChange();
  }

  function handleAtom(idx) {
    cycleLonePair(state.attempt, idx);
    redraw();
    if (state.glowMode === "live" && cfg.allowAtomicWin !== false) checkAutoWin();
    if (cfg.onAttemptChange) cfg.onAttemptChange();
  }

  function checkAutoWin() {
    const m = currentMolecule();
    const total = totalValenceElectrons(m, valenceLookup);
    const r = evaluate(state.attempt, m, total);
    if (r.won && !state.solved.has(m.id)) {
      state.solved.add(m.id);
      setStatus(`${m.fact}`, "win");
      if (cfg.onWin) cfg.onWin(m);
      updateLadder();
    }
  }

  function redraw() {
    const m = currentMolecule();
    render(cfg.svg, m, state.attempt, {
      onAtomClick: handleAtom,
      onGapClick: handleGap,
      glowMode: state.glowMode,
    });

    const total = totalValenceElectrons(m, valenceLookup);
    const placed = electronsPlaced(state.attempt);

    if (cfg.dom.title) cfg.dom.title.textContent = m.name.replace(/(\d)/g, "$1").replace("2", "₂").replace("3", "₃").replace("4", "₄");
    if (cfg.dom.sub) cfg.dom.sub.textContent = m.fullName;
    if (cfg.dom.placed) cfg.dom.placed.textContent = String(placed);
    if (cfg.dom.total) cfg.dom.total.textContent = String(total);

    // per-atom list
    if (cfg.dom.atomList) {
      cfg.dom.atomList.innerHTML = "";
      for (let i = 0; i < m.atoms.length; i++) {
        const a = m.atoms[i];
        const count = atomShellCount(state.attempt, m, i);
        const st = atomState(state.attempt, m, i);
        const line = document.createElement("div");
        line.className = "builder-atom-line";
        if (state.glowMode !== "none") {
          if (st === "full") line.classList.add("full");
          if (st === "over") line.classList.add("over");
        }
        const left = document.createElement("span");
        left.textContent = `${a.sym}₁${"₂₃₄₅₆₇"[i] || ""}`;
        // simpler: just symbol + index
        left.textContent = `${a.sym}${pool.length === 1 ? "" : ""} #${i + 1}`;
        const right = document.createElement("span");
        right.textContent = state.glowMode === "none" ? "—" : `${count} / ${a.target}`;
        line.appendChild(left);
        line.appendChild(right);
        cfg.dom.atomList.appendChild(line);
      }
    }
  }

  function updateLadder() {
    if (!cfg.dom.ladder) return;
    cfg.dom.ladder.innerHTML = "";
    pool.forEach((m, i) => {
      const b = document.createElement("button");
      b.className = "lad-btn";
      if (state.solved.has(m.id)) b.classList.add("solved");
      if (i === state.moleculeIndex) b.classList.add("current");
      // unlock: first molecule always; later ones once previous is solved
      const unlocked = i === 0 || state.solved.has(pool[i - 1].id) || state.solved.has(m.id);
      if (!unlocked) b.classList.add("locked");
      b.textContent = m.name.replace("2", "₂").replace("3", "₃").replace("4", "₄");
      b.addEventListener("click", () => {
        if (unlocked || state.solved.has(m.id)) loadMolecule(i);
      });
      cfg.dom.ladder.appendChild(b);
    });
  }

  if (cfg.dom.hint) {
    cfg.dom.hint.addEventListener("click", () => {
      setStatus(hintFor(state.attempt, currentMolecule()), "hint");
    });
  }
  if (cfg.dom.reset) {
    cfg.dom.reset.addEventListener("click", () => {
      state.attempt = emptyAttempt(currentMolecule());
      redraw();
      setStatus("cleared.", "");
      if (cfg.onAttemptChange) cfg.onAttemptChange();
    });
  }

  // initial load
  loadMolecule(state.moleculeIndex);
  updateLadder();

  // expose useful methods for callers (boss uses these)
  return {
    state,
    pool,
    currentMolecule,
    loadMolecule,
    setStatus,
    redraw,
    valenceLookup,
    evaluateNow() {
      const m = currentMolecule();
      const total = totalValenceElectrons(m, valenceLookup);
      return evaluate(state.attempt, m, total);
    },
    validateNow() {
      return validate(state.attempt, currentMolecule());
    },
    setGlowMode(mode) {
      state.glowMode = mode;
      redraw();
    },
    nextUnlockedIndex() {
      for (let i = state.moleculeIndex + 1; i < pool.length; i++) {
        if (state.solved.has(pool[i].id) || i === state.moleculeIndex + 1) return i;
      }
      return -1;
    },
  };
}

/**
 * Wire the section-5.4 builder to its DOM ids.
 */
export async function initBuilder() {
  const svg = document.getElementById("builder-svg");
  if (!svg) return;

  await createBuilder({
    svg,
    dom: {
      title: document.getElementById("builder-title"),
      sub: document.getElementById("builder-sub"),
      placed: document.getElementById("builder-placed"),
      total: document.getElementById("builder-total"),
      atomList: document.getElementById("builder-atom-list"),
      status: document.getElementById("builder-status"),
      hint: document.getElementById("builder-hint"),
      reset: document.getElementById("builder-reset"),
      ladder: document.getElementById("builder-ladder"),
    },
    glowMode: "live",
    showLadder: true,
  });
}
