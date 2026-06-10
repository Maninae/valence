/* Reusable Three.js orbital point cloud.
   Samples the true hydrogenic probability density |psi_nlm|^2 (Bohr units,
   Z=1, real spherical harmonics) and renders it as a glowing point cloud.

   usage:
     const cloud = createOrbitalCloud(containerEl, { n:3, l:2, m:0 });
     cloud.setOrbital(4, 1, 0);
     cloud.dispose();
*/

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------- hydrogenic math ----------

const fact = (() => {
  const f = [1];
  for (let i = 1; i <= 24; i++) f[i] = f[i - 1] * i;
  return (n) => f[n];
})();

// generalized Laguerre L_k^a(x)
function laguerre(k, a, x) {
  if (k === 0) return 1;
  let lm2 = 1;
  let lm1 = 1 + a - x;
  for (let i = 2; i <= k; i++) {
    const l = ((2 * i - 1 + a - x) * lm1 - (i - 1 + a) * lm2) / i;
    lm2 = lm1;
    lm1 = l;
  }
  return lm1;
}

// radial wavefunction R_nl(r), r in Bohr radii
export function radialR(n, l, r) {
  const norm = Math.sqrt(
    Math.pow(2 / n, 3) * fact(n - l - 1) / (2 * n * fact(n + l))
  );
  const rho = (2 * r) / n;
  return norm * Math.exp(-rho / 2) * Math.pow(rho, l) * laguerre(n - l - 1, 2 * l + 1, rho);
}

// associated Legendre P_l^m(x), m >= 0, Condon-Shortley phase
function assocLegendre(l, m, x) {
  let pmm = 1;
  if (m > 0) {
    const s = Math.sqrt((1 - x) * (1 + x));
    let f = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -f * s;
      f += 2;
    }
  }
  if (l === m) return pmm;
  let pmm1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmm1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmm1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmm1;
    pmm1 = pll;
  }
  return pll;
}

// real spherical harmonic Y_lm(theta, phi)
function realYlm(l, m, cosTheta, phi) {
  const am = Math.abs(m);
  const norm = Math.sqrt(
    ((2 * l + 1) / (4 * Math.PI)) * (fact(l - am) / fact(l + am))
  );
  const p = assocLegendre(l, am, cosTheta);
  if (m === 0) return norm * p;
  const f = Math.SQRT2 * norm * p;
  return m > 0 ? f * Math.cos(am * phi) : f * Math.sin(am * phi);
}

// ---------- sampling ----------

// Sample N points from |psi|^2 = [r^2 R^2] x [|Y|^2] (separable).
function sampleOrbital(n, l, m, count) {
  const rMax = 2.5 * n * n + 10;
  const BINS = 2048;
  // radial CDF of P(r) = r^2 R^2
  const cdf = new Float64Array(BINS);
  let acc = 0;
  for (let i = 0; i < BINS; i++) {
    const r = ((i + 0.5) / BINS) * rMax;
    const R = radialR(n, l, r);
    acc += r * r * R * R;
    cdf[i] = acc;
  }
  for (let i = 0; i < BINS; i++) cdf[i] /= acc;

  // max |Y| over theta (phi factor's max is 1)
  let yMax = 0;
  for (let i = 0; i <= 256; i++) {
    const ct = -1 + (2 * i) / 256;
    const am = Math.abs(m);
    const norm = Math.sqrt(((2 * l + 1) / (4 * Math.PI)) * (fact(l - am) / fact(l + am)));
    let v = Math.abs(norm * assocLegendre(l, am, ct));
    if (m !== 0) v *= Math.SQRT2;
    if (v > yMax) yMax = v;
  }
  const yMax2 = yMax * yMax * 1.0001;

  const positions = new Float32Array(count * 3);
  const signs = new Int8Array(count);
  const radii = new Float32Array(count);
  let placed = 0;
  while (placed < count) {
    // radius via CDF inversion (binary search)
    const u = Math.random();
    let lo = 0, hi = BINS - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    const r = ((lo + Math.random()) / BINS) * rMax;
    // angles via rejection on |Y|^2
    const ct = -1 + 2 * Math.random();
    const phi = 2 * Math.PI * Math.random();
    const y = realYlm(l, m, ct, phi);
    if (y * y < Math.random() * yMax2) continue;
    const st = Math.sqrt(1 - ct * ct);
    const i3 = placed * 3;
    positions[i3] = r * st * Math.cos(phi);
    positions[i3 + 1] = r * ct; // z-axis of the orbital -> screen "up"
    positions[i3 + 2] = r * st * Math.sin(phi);
    signs[placed] = Math.sign(radialR(n, l, r) * y) >= 0 ? 1 : -1;
    radii[placed] = r;
    placed++;
  }
  return { positions, signs, radii };
}

// ---------- rendering ----------

function makeSpriteTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SUBSHELL_HEX = { 0: "#2dd4ed", 1: "#fbbf24", 2: "#a78bfa", 3: "#34d399" };

export function subshellColor(l) {
  return SUBSHELL_HEX[l] || "#e6ebf5";
}

export function createOrbitalCloud(container, opts = {}) {
  const {
    n = 2, l = 1, m = 0,
    points = 14000,
    autoRotate = true,
    interactive = true,
    showPhase = true,
    background = null, // null = transparent
  } = opts;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.borderRadius = "inherit";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (background) scene.background = new THREE.Color(background);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = interactive;
  controls.enableRotate = interactive;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.9;

  const material = new THREE.PointsMaterial({
    size: 1,
    map: makeSpriteTexture(),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  });

  let pointsObj = null;
  let state = { n, l, m, phase: showPhase };

  function rebuild() {
    const { positions, signs, radii } = sampleOrbital(state.n, state.l, state.m, points);
    const colors = new Float32Array(points * 3);
    const base = new THREE.Color(subshellColor(state.l));
    const neg = base.clone().lerp(new THREE.Color("#f4f6ff"), 0.75);
    for (let i = 0; i < points; i++) {
      const c = state.phase && signs[i] < 0 ? neg : base;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    if (pointsObj) {
      pointsObj.geometry.dispose();
      pointsObj.geometry = geo;
    } else {
      pointsObj = new THREE.Points(geo, material);
      scene.add(pointsObj);
    }

    // frame the camera on the 96th-percentile radius
    const sorted = Float32Array.from(radii).sort();
    const r96 = sorted[Math.floor(0.96 * (points - 1))];
    const dist = Math.max(4, r96 * 2.1);
    camera.position.set(dist * 0.9, dist * 0.45, dist * 0.9);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    material.size = Math.max(0.05, r96 * 0.028);
  }

  function resize() {
    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let disposed = false;
  function loop() {
    if (disposed) return;
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);

  rebuild();
  resize();
  loop();

  return {
    setOrbital(nn, ll, mm) {
      state.n = nn; state.l = ll; state.m = mm;
      rebuild();
    },
    setPhase(on) {
      state.phase = on;
      rebuild();
    },
    get state() { return { ...state }; },
    dispose() {
      disposed = true;
      ro.disconnect();
      controls.dispose();
      if (pointsObj) pointsObj.geometry.dispose();
      material.map.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
