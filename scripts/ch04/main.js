/* Chapter 4 entry point — wire every interactive with isolated try/catch
   so a single failure can't take down the page. */
import { initEnergyWell } from "./energy-well.js";
import { initSharing } from "./sharing.js";
import { initTugOfWar } from "./tug-of-war.js";
import { initLattice } from "./lattice.js";
import { initShear } from "./shear.js";
import { initContinuum } from "./continuum.js";
import { initBoss } from "./boss.js";

for (const init of [
  initEnergyWell,
  initSharing,
  initTugOfWar,
  initLattice,
  initShear,
  initContinuum,
  initBoss,
]) {
  try {
    init();
  } catch (e) {
    console.error(`[ch04] ${init.name} failed:`, e);
  }
}
