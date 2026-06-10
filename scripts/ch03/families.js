/* 3.3 — Columns are families.
   Preset buttons → highlight column on table, list members' valence configs. */

import { loadData, SUBSHELL_COLORS } from "../shared.js";
import { createPTable, blockFill, blockColor, colorMix } from "./ptable.js";

const FAMILIES = {
  alkali: {
    group: 1,
    name: "alkali metals",
    members: [3, 11, 19, 37, 55],
    behavior:
      "one lonely electron beyond a closed shell — easy to lose. They burn, fizz, give up that electron at the slightest provocation.",
    accent: "s",
  },
  alkaline: {
    group: 2,
    name: "alkaline earth metals",
    members: [4, 12, 20, 38, 56],
    behavior:
      "two outer s electrons. Still happy to lose them, just a touch less eager than the alkalis.",
    accent: "s",
  },
  carbon: {
    group: 14,
    name: "carbon family",
    members: [6, 14, 32, 50, 82],
    behavior:
      "four outer electrons — equidistant from full and empty. Carbon's whole personality (organic chemistry) comes from this stalemate.",
    accent: "p",
  },
  halogens: {
    group: 17,
    name: "halogens",
    members: [9, 17, 35, 53, 85],
    behavior:
      "one electron short of a full outer shell. They grab. Fluorine is the most electronegative element in the universe.",
    accent: "p",
  },
  noble: {
    group: 18,
    name: "noble gases",
    members: [2, 10, 18, 36, 54, 86],
    behavior:
      "full outer shell — nothing to give, nothing missing. They barely react.",
    accent: "p",
  },
};

// Extract just the valence (highest-n s+p) tokens from a configSemantic.
function valenceConfig(el) {
  const n = el.period;
  const tokens = (el.configSemantic || "").match(/\d+[spdf]\d+/g) || [];
  // outer s and p with shell == period
  return tokens
    .filter((t) => {
      const m = t.match(/^(\d+)([spdf])\d+$/);
      return m && +m[1] === n && (m[2] === "s" || m[2] === "p");
    })
    .join(" ");
}

function colorConfig(cfg) {
  return cfg.replace(/(\d+)([spdf])(\d+|\b)/g, (_, n, l, k) => {
    const c = SUBSHELL_COLORS[l] ? SUBSHELL_COLORS[l]() : "currentColor";
    return `<span style="color:${c}">${n}${l}${k}</span>`;
  });
}

export async function initFamilies() {
  const stage = document.getElementById("families-stage");
  const presetsEl = document.getElementById("family-presets");
  const membersEl = document.getElementById("families-members");
  const readout = document.getElementById("families-readout");
  if (!stage || !presetsEl) return;

  const els = await loadData("elements");
  const main = els.filter((e) => e.z <= 86);
  const byZ = {};
  main.forEach((e) => (byZ[e.z] = e));

  const table = createPTable(stage, {});
  table.setElements(main);

  // baseline mode: faint block tint so the table is readable
  function baseMode(el) {
    return {
      fill: blockFill(el.block, 0.10),
      text: "var(--text-secondary)",
      stroke: "var(--rule)",
    };
  }
  table.setMode(baseMode);
  table.setTooltipExtra((el) => `valence: ${valenceConfig(el) || "—"}`);

  let activeFam = null;

  function showFamily(key) {
    const fam = FAMILIES[key];
    if (!fam) return;
    activeFam = key;
    const memSet = new Set(fam.members);

    // mode: family members bright (block color), others dim
    table.setMode((el) => {
      if (memSet.has(el.z)) {
        return {
          fill: blockFill(el.block, 0.55),
          stroke: colorMix(blockColor(el.block), 0.9),
          text: blockColor(el.block),
        };
      }
      return {
        fill: blockFill(el.block, 0.06),
        text: "var(--text-muted)",
        stroke: "var(--rule)",
      };
    });
    table.setHighlight(memSet);
    table.setActiveGroup(fam.group);

    // members list, with colored valence configs
    const items = fam.members
      .map((z) => {
        const el = byZ[z];
        if (!el) return "";
        const v = valenceConfig(el);
        return `<span class="mem"><span class="sym">${el.symbol}</span> ${colorConfig(v)}</span>`;
      })
      .join("");
    membersEl.innerHTML = items;
    readout.innerHTML = `<strong style="color:${blockColor(fam.accent)};">${fam.name}</strong> · group ${fam.group} · ${fam.behavior}`;

    presetsEl.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("primary", b.dataset.fam === key);
    });
  }

  presetsEl.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => showFamily(b.dataset.fam));
  });

  showFamily("alkali");
}
