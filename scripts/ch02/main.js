/* Chapter 2 entry point: wire every interactive, isolated so one failure
   can't take down the page. */
import { initShielding } from "./shielding.js";
import { initFillingGame } from "./filling-game.js";
import { initEnergyCurves } from "./energy-curves.js";
import { initIonFormation } from "./ion-formation.js";
import { initBoss } from "./boss.js";

for (const init of [
  initShielding,
  initFillingGame,
  initEnergyCurves,
  initIonFormation,
  initBoss,
]) {
  try {
    const r = init();
    if (r && typeof r.then === "function") r.catch((e) => console.error(`[ch02] ${init.name} failed:`, e));
  } catch (e) {
    console.error(`[ch02] ${init.name} failed:`, e);
  }
}
