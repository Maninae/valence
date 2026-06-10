/* Chapter 1 entry point: wire every interactive, isolated so one failure
   can't take down the page. */
import { initScaleZoom } from "./scale-zoom.js";
import { initCollapse } from "./collapse.js";
import { initStandingWave } from "./standing-wave.js";
import { initOrbitalViewer } from "./orbital-viewer.js";
import { initRadialChart } from "./radial-chart.js";
import { initBoss } from "./boss.js";

for (const init of [
  initScaleZoom,
  initCollapse,
  initStandingWave,
  initOrbitalViewer,
  initRadialChart,
  initBoss,
]) {
  try {
    init();
  } catch (e) {
    console.error(`[ch01] ${init.name} failed:`, e);
  }
}
