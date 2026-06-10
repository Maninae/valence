/* Shared page machinery: sidebar TOC, scroll progress, mobile nav,
   KaTeX rendering, math hover tooltips, data + canvas helpers. */

// ---------- sidebar TOC (auto-generated from article h2/h3) ----------

function buildToc() {
  const toc = document.querySelector(".toc");
  const article = document.querySelector("article");
  if (!toc || !article) return;
  const heads = article.querySelectorAll("h2, h3");
  heads.forEach((h, i) => {
    if (!h.id) h.id = "sec-" + i;
    const li = document.createElement("li");
    if (h.tagName === "H3") li.className = "nav-sub-item";
    const a = document.createElement("a");
    a.href = "#" + h.id;
    // strip the section-number prefix for the sidebar
    const num = h.querySelector(".section-number");
    a.textContent = num
      ? h.textContent.replace(num.textContent, "").trim()
      : h.textContent.trim();
    li.appendChild(a);
    toc.appendChild(li);
  });

  const links = toc.querySelectorAll("a");
  const track = () => {
    let active = 0;
    heads.forEach((h, i) => {
      if (h.getBoundingClientRect().top < 130) active = i;
    });
    links.forEach((l, i) => l.classList.toggle("active", i === active));
  };
  document.addEventListener("scroll", track, { passive: true });
  track();
}

// ---------- scroll progress bar ----------

function initProgress() {
  const bar = document.querySelector(".progress-bar");
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
  };
  document.addEventListener("scroll", update, { passive: true });
  update();
}

// ---------- mobile sidebar toggle ----------

function initMenu() {
  const btn = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  if (!btn || !sidebar) return;
  btn.addEventListener("click", () => sidebar.classList.toggle("open"));
  sidebar.addEventListener("click", (e) => {
    if (e.target.tagName === "A") sidebar.classList.remove("open");
  });
}

// ---------- KaTeX ----------

function renderMath() {
  if (typeof renderMathInElement !== "function") return;
  renderMathInElement(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    trust: true, // required for \htmlData tooltips
    throwOnError: false,
  });
  initMathTooltips();
}

// JS-driven tooltip appended to <body> (CSS ::after gets clipped by
// .katex-display overflow).
function initMathTooltips() {
  let tip = null;
  document.querySelectorAll("[data-tip]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      tip = document.createElement("div");
      tip.className = "math-tooltip";
      tip.textContent = el.dataset.tip;
      document.body.appendChild(tip);
      const r = el.getBoundingClientRect();
      const tw = tip.offsetWidth;
      let x = r.left + r.width / 2 - tw / 2 + scrollX;
      x = Math.max(8, Math.min(x, innerWidth - tw - 8));
      tip.style.left = x + "px";
      tip.style.top = r.bottom + 10 + scrollY + "px";
    });
    el.addEventListener("mouseleave", () => {
      if (tip) { tip.remove(); tip = null; }
    });
  });
}

// ---------- helpers for chapter modules ----------

const dataCache = {};
export async function loadData(name) {
  if (!dataCache[name]) {
    const base = location.pathname.includes("/chapters/") ? ".." : ".";
    dataCache[name] = fetch(`${base}/data/${name}.json`).then((r) => r.json());
  }
  return dataCache[name];
}

// Size a canvas for devicePixelRatio; returns the 2d context scaled so the
// caller draws in CSS pixels. Centers via stylesheet (.interactive-stage).
export function setupCanvas(canvas, cssWidth, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return ctx;
}

// Read a CSS custom property (for canvas drawing with theme tokens).
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const SUBSHELL_COLORS = {
  s: () => cssVar("--s-color"),
  p: () => cssVar("--p-color"),
  d: () => cssVar("--d-color"),
  f: () => cssVar("--f-color"),
};

// Stage width helper: full container up to the cap, with margin allowance.
export function stageWidth(stageEl, cap = 860) {
  return Math.min(cap, stageEl.clientWidth || cap);
}

// ---------- boot ----------

document.addEventListener("DOMContentLoaded", () => {
  buildToc();
  initProgress();
  initMenu();
  renderMath();
});
