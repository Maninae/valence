/* 4.4 — rock-salt NaCl lattice in Three.js.
   Alternating Na+/Cl- spheres on a 5×5×5 cubic grid. Solid-ish spheres,
   two colors from the token palette, subtle emissive, OrbitControls drag. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { cssVar } from "../shared.js";

const SIZE = 5;          // 5x5x5 grid
const SPACING = 1.0;
const NA_R = 0.27;       // smaller cation
const CL_R = 0.42;       // larger anion

export function initLattice() {
  const container = document.getElementById("lattice-stage");
  if (!container) return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.borderRadius = "inherit";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(6.6, 5.0, 6.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.target.set(0, 0, 0);

  // lights — soft fill + a single key light to give the spheres dimension
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(5, 8, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
  fill.position.set(-6, -3, -2);
  scene.add(fill);

  // two materials: Na+ (amber, smaller) and Cl- (cyan, larger)
  const naColor = new THREE.Color(cssVar("--p-color"));  // amber
  const clColor = new THREE.Color(cssVar("--s-color"));  // cyan
  const naMat = new THREE.MeshPhysicalMaterial({
    color: naColor,
    roughness: 0.45,
    metalness: 0.1,
    emissive: naColor.clone().multiplyScalar(0.18),
    clearcoat: 0.25,
    clearcoatRoughness: 0.55,
  });
  const clMat = new THREE.MeshPhysicalMaterial({
    color: clColor,
    roughness: 0.5,
    metalness: 0.1,
    emissive: clColor.clone().multiplyScalar(0.15),
    clearcoat: 0.25,
    clearcoatRoughness: 0.55,
  });

  const naGeo = new THREE.SphereGeometry(NA_R, 24, 18);
  const clGeo = new THREE.SphereGeometry(CL_R, 28, 22);

  // count instances of each
  let naCount = 0, clCount = 0;
  const half = (SIZE - 1) / 2;
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++)
      for (let k = 0; k < SIZE; k++) {
        if (((i + j + k) & 1) === 0) clCount++; else naCount++;
      }

  const naMesh = new THREE.InstancedMesh(naGeo, naMat, naCount);
  const clMesh = new THREE.InstancedMesh(clGeo, clMat, clCount);
  scene.add(naMesh); scene.add(clMesh);

  const dummy = new THREE.Object3D();
  let ni = 0, ci = 0;
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++)
      for (let k = 0; k < SIZE; k++) {
        dummy.position.set((i - half) * SPACING, (j - half) * SPACING, (k - half) * SPACING);
        dummy.updateMatrix();
        if (((i + j + k) & 1) === 0) {
          clMesh.setMatrixAt(ci++, dummy.matrix);
        } else {
          naMesh.setMatrixAt(ni++, dummy.matrix);
        }
      }
  naMesh.instanceMatrix.needsUpdate = true;
  clMesh.instanceMatrix.needsUpdate = true;

  // thin connecting lines along axes between nearest neighbors — restrained
  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(0x67748f),
    transparent: true,
    opacity: 0.18,
  });
  const linePts = [];
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++)
      for (let k = 0; k < SIZE; k++) {
        const x = (i - half) * SPACING;
        const y = (j - half) * SPACING;
        const z = (k - half) * SPACING;
        if (i + 1 < SIZE) {
          linePts.push(x, y, z, x + SPACING, y, z);
        }
        if (j + 1 < SIZE) {
          linePts.push(x, y, z, x, y + SPACING, z);
        }
        if (k + 1 < SIZE) {
          linePts.push(x, y, z, x, y, z + SPACING);
        }
      }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linePts), 3));
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // legend overlay — drawn via DOM, since canvas-text overlap is fiddly
  const legend = document.createElement("div");
  legend.style.cssText = `
    position: absolute; top: 14px; right: 14px;
    font-family: ${cssVar("--mono")}; font-size: 12px;
    color: ${cssVar("--text-secondary")};
    background: ${cssVar("--bg-surface")};
    border: 1px solid ${cssVar("--rule")};
    border-radius: 8px; padding: 8px 12px;
    line-height: 1.6;
    pointer-events: none;
  `;
  legend.innerHTML =
    `<span style="display:inline-block;width:8px;height:8px;border-radius:99px;background:${cssVar("--p-color")};box-shadow:0 0 6px ${cssVar("--p-color")};margin-right:6px;"></span>Na⁺` +
    `<br>` +
    `<span style="display:inline-block;width:8px;height:8px;border-radius:99px;background:${cssVar("--s-color")};box-shadow:0 0 6px ${cssVar("--s-color")};margin-right:6px;"></span>Cl⁻`;
  container.style.position = container.style.position || "relative";
  container.appendChild(legend);

  function resize() {
    const w = container.clientWidth || 320;
    const h = container.clientHeight || 320;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let disposed = false;
  function loop() {
    if (disposed) return;
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  // expose disposer for hot-reloading scenarios (currently unused)
  return {
    dispose() {
      disposed = true;
      ro.disconnect();
      controls.dispose();
      naGeo.dispose(); clGeo.dispose();
      naMat.dispose(); clMat.dispose();
      lineGeo.dispose(); lineMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      legend.remove();
    },
  };
}
