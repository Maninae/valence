/* Chapter 5 entry point. Wire each interactive, isolated so one failure
   doesn't take down the page. Async initializers are awaited individually
   inside their own try/catch. */

import { initLewisStrip } from "./lewis-strip.js";
import { initOctetDiagrams } from "./octet-diagrams.js";
import { initWorkedExamples } from "./worked-examples.js";
import { initBuilder } from "./builder/controller.js";
import { initBondCompare } from "./bond-compare.js";
import { initBoss } from "./boss.js";

const inits = [
  initLewisStrip,
  initOctetDiagrams,
  initWorkedExamples,
  initBuilder,
  initBondCompare,
  initBoss,
];

for (const init of inits) {
  try {
    const ret = init();
    // some inits return a Promise; surface failures asynchronously without
    // blocking subsequent inits.
    if (ret && typeof ret.then === "function") {
      ret.catch((e) => console.error(`[ch05] ${init.name} failed:`, e));
    }
  } catch (e) {
    console.error(`[ch05] ${init.name} failed:`, e);
  }
}
