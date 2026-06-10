/* Chapter 3 entry point: wire every interactive, isolated so one failure
   can't take down the page. */
import { initBuilder } from "./builder.js";
import { initFamilies } from "./families.js";
import { initHeatmap } from "./heatmap.js";
import { initBoss } from "./boss.js";

for (const init of [initBuilder, initFamilies, initHeatmap, initBoss]) {
  Promise.resolve()
    .then(() => init())
    .catch((e) => console.error(`[ch03] ${init.name} failed:`, e));
}
