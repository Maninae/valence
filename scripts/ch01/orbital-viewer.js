/* 1.4 — the orbital viewer: n / ℓ / m segmented controls driving the
   shared Three.js point cloud. */
import { createOrbitalCloud } from "../orbital-cloud.js";

const L_LETTER = ["s", "p", "d", "f"];
const L_CLASS = ["sub-s", "sub-p", "sub-d", "sub-f"];

// conventional names for real orbitals, keyed "l:m"
const M_NAME = {
  "0:0": "", // s
  "1:0": "z", "1:1": "x", "1:-1": "y",
  "2:0": "z²", "2:1": "xz", "2:-1": "yz", "2:2": "x²−y²", "2:-2": "xy",
  "3:0": "z³", "3:1": "xz²", "3:-1": "yz²", "3:2": "z(x²−y²)",
  "3:-2": "xyz", "3:3": "x(x²−3y²)", "3:-3": "y(3x²−y²)",
};

export function initOrbitalViewer() {
  const stage = document.getElementById("orbital-stage");
  if (!stage) return;

  const segN = document.getElementById("orb-n");
  const segL = document.getElementById("orb-l");
  const segM = document.getElementById("orb-m");
  const segPhase = document.getElementById("orb-phase");
  const readout = document.getElementById("orb-readout");

  const state = { n: 2, l: 1, m: 0 };
  const cloud = createOrbitalCloud(stage, {
    n: state.n, l: state.l, m: state.m,
    points: 15000,
    autoRotate: true,
    interactive: true,
  });

  function seg(container, values, current, labelFn, classFn, onPick) {
    container.innerHTML = "";
    values.forEach((v) => {
      const b = document.createElement("button");
      b.className = "seg-btn" + (classFn ? " " + classFn(v) : "");
      b.textContent = labelFn(v);
      b.setAttribute("aria-pressed", String(v === current));
      b.addEventListener("click", () => onPick(v));
      container.appendChild(b);
    });
  }

  function orbitalName() {
    const suffix = M_NAME[state.l + ":" + state.m] ?? state.m;
    return `${state.n}${L_LETTER[state.l]}` + (suffix ? `(${suffix})` : "");
  }

  function render() {
    seg(segN, [1, 2, 3, 4], state.n, (v) => String(v), null, (v) => {
      state.n = v;
      if (state.l > v - 1) state.l = v - 1;
      if (Math.abs(state.m) > state.l) state.m = 0;
      update();
    });
    const ls = Array.from({ length: state.n }, (_, i) => i);
    seg(segL, ls, state.l, (v) => L_LETTER[v], (v) => L_CLASS[v], (v) => {
      state.l = v;
      if (Math.abs(state.m) > v) state.m = 0;
      update();
    });
    const ms = [];
    for (let m = -state.l; m <= state.l; m++) ms.push(m);
    seg(segM, ms, state.m, (v) => (v > 0 ? "+" + v : String(v)), null, (v) => {
      state.m = v;
      update();
    });

    const counts = ["one s orbital", "three p orbitals", "five d orbitals", "seven f orbitals"];
    readout.innerHTML =
      `<span class="${L_CLASS[state.l]}">${orbitalName()}</span>` +
      ` &nbsp;·&nbsp; n=${state.n}, ℓ=${state.l}, m=${state.m}` +
      ` &nbsp;·&nbsp; ${counts[state.l]} in shell ${state.n}` +
      ` &nbsp;·&nbsp; ${state.n - state.l - 1} radial node${state.n - state.l - 1 === 1 ? "" : "s"}`;
  }

  function update() {
    cloud.setOrbital(state.n, state.l, state.m);
    render();
  }

  segPhase.querySelectorAll(".seg-btn").forEach((b) => {
    b.addEventListener("click", () => {
      segPhase.querySelectorAll(".seg-btn").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
      cloud.setPhase(b.dataset.v === "1");
    });
  });

  render();
}
