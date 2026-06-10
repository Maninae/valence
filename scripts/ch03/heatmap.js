/* 3.4 — Trend heatmaps.
   Seg-toggle: blocks | size | IE1 | EN.
   Color cells via perceptually sensible ramp on dark bg. */

import { loadData, cssVar } from "../shared.js";
import { createPTable, blockFill, blockColor, colorMix } from "./ptable.js";

const MODES = {
  blocks: {
    label: "block (subshell being filled)",
    valueFor: () => null,
    units: "",
    description:
      "the table's geography. Each colored region is one subshell type filling.",
  },
  size: {
    label: "modeled atomic size",
    valueFor: (el) => el.radiusProxy,
    units: "Å",
    description:
      "Slater-modeled radius. Atoms shrink right (Zeff pulls the same shell tighter), grow down (new shell, farther out).",
    invert: true,    // SMALL = darker / cooler, BIG = brighter
    rampColor: "--p-color",  // amber for size
  },
  ie1: {
    label: "first ionization energy",
    valueFor: (el) => el.ie1,
    units: "eV",
    description:
      "energy to pluck one electron off a neutral atom. Higher Zeff means a tighter grip — harder to pluck.",
    rampColor: "--s-color",
  },
  en: {
    label: "electronegativity (Pauling)",
    valueFor: (el) => el.en,
    units: "",
    description:
      "how strongly an atom pulls on shared electrons in a bond. Same physics as ionization energy: Zeff wearing a different hat.",
    rampColor: "--d-color",
  },
};

export async function initHeatmap() {
  const stage = document.getElementById("heatmap-stage");
  const seg = document.getElementById("heatmap-mode");
  const readout = document.getElementById("heatmap-readout");
  const legend = document.getElementById("heatmap-legend");
  const bar = document.getElementById("heatmap-bar");
  const minLbl = document.getElementById("heatmap-min");
  const maxLbl = document.getElementById("heatmap-max");
  if (!stage || !seg) return;

  const els = await loadData("elements");
  const main = els.filter((e) => e.z <= 86);

  const table = createPTable(stage, {});
  table.setElements(main);

  let currentMode = "blocks";

  function applyMode(key) {
    currentMode = key;
    const m = MODES[key];
    if (key === "blocks") {
      table.setMode((el) => ({
        fill: blockFill(el.block, 0.40),
        stroke: colorMix(blockColor(el.block), 0.6),
        text: blockColor(el.block),
      }));
      table.setTooltipExtra((el) => `block: ${el.block}`);
      legend.style.visibility = "hidden";
      readout.textContent = m.description;
      return;
    }
    legend.style.visibility = "visible";

    // gather values
    const vals = [];
    main.forEach((el) => {
      const v = m.valueFor(el);
      if (v != null && !isNaN(v)) vals.push(v);
    });
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const rampHex = cssVar(m.rampColor) || cssVar("--accent");

    // legend bar gradient
    bar.style.background = `linear-gradient(90deg, color-mix(in srgb, ${rampHex} 8%, var(--bg-elevated)), ${rampHex})`;
    const lo = `${minV.toFixed(2)}${m.units ? " " + m.units : ""}`;
    const hi = `${maxV.toFixed(2)}${m.units ? " " + m.units : ""}`;
    minLbl.textContent = m.invert ? `${hi} (smallest cell color)` : lo;
    maxLbl.textContent = m.invert ? `${lo} (biggest cell color)` : hi;
    // simpler labels — just min and max with units
    minLbl.textContent = `low: ${lo}`;
    maxLbl.textContent = `high: ${hi}`;

    table.setMode((el) => {
      const v = m.valueFor(el);
      if (v == null || isNaN(v)) {
        return {
          fill: "var(--bg-elevated)",
          stroke: "var(--rule)",
          text: "var(--text-muted)",
        };
      }
      let t = (v - minV) / range;
      if (m.invert) t = 1 - t;
      // ease so extremes pop a bit
      const alpha = 0.10 + 0.65 * Math.pow(t, 0.9);
      return {
        fill: `color-mix(in srgb, ${rampHex} ${Math.round(alpha * 100)}%, var(--bg-elevated))`,
        stroke: `color-mix(in srgb, ${rampHex} ${Math.round(alpha * 80)}%, var(--rule))`,
        text: t > 0.55 ? "var(--text-primary)" : "var(--text-secondary)",
      };
    });

    table.setTooltipExtra((el) => {
      const v = m.valueFor(el);
      if (v == null || isNaN(v)) return `${m.label}: —`;
      return `${m.label}: <strong style="color:${rampHex};">${v}${m.units ? " " + m.units : ""}</strong>`;
    });

    readout.textContent = m.description;
  }

  seg.querySelectorAll(".seg-btn").forEach((b) => {
    b.addEventListener("click", () => {
      seg.querySelectorAll(".seg-btn").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
      applyMode(b.dataset.v);
    });
  });

  applyMode("blocks");
}
