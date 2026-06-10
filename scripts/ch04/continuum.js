/* 4.5 — real bonds on the dial.
   Bond chips below the canvas; hovering or tapping a chip highlights its
   marker on the continuum bar and writes a one-line character description. */
import { setupCanvas, cssVar, stageWidth, loadData } from "../shared.js";
import { drawContinuumBar, DELTA_MAX, classifyBond } from "./continuum-bar.js";

const BONDS = [
  { pair: "H–H",  a: "H",  b: "H",  blurb: "perfectly symmetric — covalent benchmark" },
  { pair: "C–H",  a: "C",  b: "H",  blurb: "nearly even sharing — basically nonpolar" },
  { pair: "N–H",  a: "N",  b: "H",  blurb: "small dipole; H is mildly δ+" },
  { pair: "C–O",  a: "C",  b: "O",  blurb: "noticeably polar; O steals more share" },
  { pair: "O–H",  a: "O",  b: "H",  blurb: "strongly polar; the reason water is weird" },
  { pair: "H–Cl", a: "H",  b: "Cl", blurb: "borderline polar / ionic; ionizes in water" },
  { pair: "H–F",  a: "H",  b: "F",  blurb: "the most polar bond among p-block hydrides" },
  { pair: "Mg–O", a: "Mg", b: "O",  blurb: "ionic — oxide salt at this Δχ" },
  { pair: "Na–Cl",a: "Na", b: "Cl", blurb: "the canonical ionic bond" },
  { pair: "K–F",  a: "K",  b: "F",  blurb: "nearly the largest Δχ in chemistry — fully ionic" },
];

export async function initContinuum() {
  const stage = document.getElementById("cont-stage");
  const chipsEl = document.getElementById("cont-chips");
  const readout = document.getElementById("cont-readout");
  if (!stage || !chipsEl) return;

  const elements = await loadData("elements");
  const byMap = Object.fromEntries(elements.map((e) => [e.symbol, e]));

  // compute ΔEN for each bond
  const bonds = BONDS.map((b) => {
    const ea = byMap[b.a], eb = byMap[b.b];
    return { ...b, d: Math.abs(ea.en - eb.en) };
  });

  const W = stageWidth(stage, 860);
  const H = 200;
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = setupCanvas(canvas, W, H);

  let activeIdx = -1;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const markers = bonds.map((b, i) => ({
      d: b.d,
      label: b.pair,
      highlight: i === activeIdx,
    }));
    drawContinuumBar(ctx, 30, 80, W - 60, 32, { markers });
  }

  // build chip row
  chipsEl.innerHTML = "";
  bonds.forEach((b, i) => {
    const chip = document.createElement("button");
    chip.className = "bond-chip";
    chip.textContent = `${b.pair}  (Δχ=${b.d.toFixed(2)})`;
    chip.dataset.idx = i;
    const activate = () => {
      activeIdx = i;
      chipsEl.querySelectorAll(".bond-chip").forEach((c) => c.classList.toggle("active", c === chip));
      const v = classifyBond(b.d);
      readout.innerHTML =
        `<strong style="color: var(--text-primary)">${b.pair}</strong> ` +
        `&nbsp;|&nbsp; Δχ = <span style="color: var(--text-primary)">${b.d.toFixed(2)}</span> ` +
        `&nbsp;|&nbsp; <span style="color: var(--accent)">${v}</span> ` +
        `&nbsp;—&nbsp; ${b.blurb}`;
      draw();
    };
    chip.addEventListener("mouseenter", activate);
    chip.addEventListener("focus", activate);
    chip.addEventListener("click", activate);
    chipsEl.appendChild(chip);
  });

  draw();
}
