# Valence Shell Game

Interactive site teaching how electrons arrange in atoms and why atoms bond,
from first principles. Live target: maninae.github.io/valence-shell-game.
Sibling to grid-atlas and graph-playground: **vanilla JS, no build step,
GitHub Pages from main root.** Three.js + KaTeX from CDN only.

## Audience and voice

A smart STEM high schooler who has NOT taken chemistry. They know atoms have
protons, neutrons, and electrons — nothing else is assumed. Every concept is
built from first principles in sequence; never name-drop a term (orbital,
shielding, electronegativity) before the site has constructed it.

- Treat the reader as intelligent. Real vocabulary, no babying.
- **No hook questions** ("Ever wondered why...?") — Owen vetoed these as cheesy.
  Open sections with declarative claims or observations instead.
- Less prose, more seeing and doing. Interactives are the spine; prose is
  connective tissue between them. If a paragraph can become a manipulable
  thing, it should.
- Em-dash discipline: prefer colons, commas, or periods.
- All math symbols in prose must be KaTeX (`$...$`). No KaTeX in h2/h3
  headings (sidebar TOC is auto-generated from heading text) — use HTML
  entities there.

## Architecture

```
index.html                  hub: hero orbital cloud + chapter cards
chapters/01-the-cloud.html  one file per chapter
styles/shared.css           single stylesheet, all tokens + components
scripts/shared.js           TOC, progress bar, KaTeX, tooltips, nav, helpers
scripts/orbital-cloud.js    reusable Three.js hydrogenic point-cloud component
scripts/chXX/*.js           per-chapter interactive modules (ES modules)
data/elements.json          baked element data (see build/bake_data.py)
data/subshell_energies.json Slater orbital-energy curves, Z = 1..40
build/                      Python bake pipeline; rerun to regenerate data/
```

Dependencies flow one direction: `chapter page → chapter modules →
shared modules → data`. Keep each JS module under ~300 lines, one
responsibility each. State lives in a per-interactive controller object;
helpers are stateless functions.

Three.js is loaded via importmap from CDN (see chapter 1). KaTeX via CDN
stylesheet + script (see shared.js `renderMath`, `trust: true` for
`\htmlData` tooltips).

## Design system: "dark lab"

Near-black blue depths; electron clouds and accents glow. All colors are CSS
custom properties in `:root` — never hardcode colors in component rules.

**The subshell color law (most important rule on the site):** each subshell
type has one fixed color used EVERYWHERE — energy-ladder rungs, periodic-table
blocks, orbital clouds, configuration text, chips, chart strokes:

| Subshell | Token | Color |
|----------|-------|-------|
| s | `--s-color` | cyan |
| p | `--p-color` | amber |
| d | `--d-color` | violet |
| f | `--f-color` | green |

Use `.sub-s/.sub-p/.sub-d/.sub-f` utility classes for colored text/chips.
If a visual shows subshells in any form, it must use these colors. This is
pedagogy, not decoration (same principle as graph-playground's knob colors).

**Fonts:** `--display` Space Grotesk (headings), `--sans` Inter (body),
`--mono` JetBrains Mono (labels, eyebrows, tags, code, axis labels).

**Callouts:** `.callout.definition` (blue) / `.model` (violet, for "the
model says" boxes) / `.example` (amber) / `.insight` (green) / `.note`
(muted). Each takes a `.callout-label`.

**Interactive panels:** wrap every interactive in
```html
<div class="interactive">
  <div class="interactive-label">Interactive</div>
  <h4 class="interactive-title">Title of the toy</h4>
  <p class="interactive-hint">One line telling the reader what to try.</p>
  <div class="interactive-stage"> ...canvas/svg... </div>
  <div class="interactive-controls"> ...sliders/buttons... </div>
  <div class="interactive-readout"> ...live values... </div>
</div>
```
Controls: `.control-group` wraps a `.control-label` + input. Sliders are
styled `input[type=range]`. Buttons: `.btn` (default), `.btn.primary` (glow).
Toggle rows: `.seg-toggle` with `.seg-btn` children (`aria-pressed`).

**Canvas/SVG rules (hard requirements):**
- Cap visual width (max ~900px) and center with auto margins. Never stretch
  a visualization to 100% of an uncapped container.
- Labels must never overlap each other or hide behind visual elements.
  Stagger or offset them. Screenshot-verify before calling a page done.
- Size canvases for devicePixelRatio (crisp on retina).
- Dark-canvas palette: backgrounds transparent or `--bg-deep`; strokes from
  tokens; glow via `shadowBlur`/additive blending, used purposefully.

## Page skeleton (chapters)

Copy chapter 1's structure exactly:
sidebar (auto-TOC) → progress bar → header (eyebrow "Chapter N" + title +
description + tags) → top nav → article (roadmap paragraph, then sections)
→ boss panel (end-of-chapter challenge) → bottom nav.

- Section h2s get `<span class="section-number">N.X</span>` prefixes.
- Top nav and bottom nav must have identical prev/next hrefs and titles;
  update neighbors when adding a chapter.
- Every chapter ends with a "boss" challenge (`.boss-panel`): an interactive
  quiz/game applying the chapter, in the spirit of graph-playground's levels.
- Roadmap paragraph (`.lecture-roadmap`): 2-3 sentences previewing the
  journey, not meta-commentary.

## Chapter map (v1)

1. **Where electrons live** — scale of the atom; the planetary model and its
   collapse; standing waves quantize; orbitals as 3D standing waves
   (Three.js viewer); radial probability and penetration. `chapters/01-the-cloud.html`
2. **The filling order** — Pauli, Hund, aufbau via the ladder game; shielding
   and penetration break degeneracy; Slater energy curves crossing (4s/3d);
   why transition metals ionize from 4s; Cr/Cu boss. `chapters/02-filling-order.html`
3. **The table is a map** — building the table from the filling order;
   blocks = subshells; valence electrons explain columns; Zeff drives the
   radius / ionization-energy / electronegativity trends (heatmap layers).
   `chapters/03-the-table.html`
4. **One continuum, not three bonds** — the H2 energy well; shared clouds;
   the electronegativity tug-of-war (covalent → polar → ionic is ONE axis,
   ΔEN); NaCl lattice; placing real bonds on the continuum.
   `chapters/04-one-continuum.html`
5. **Building molecules** — Lewis dot notation from valence counts; octet
   from s+p capacity; the Lewis builder (octet + formal-charge checking);
   double/triple bonds; teases VSEPR + hydrogen bonding (v2).
   `chapters/05-building-molecules.html`

## Data notes

- `elements.json`: `en` is Pauling electronegativity, `ie1` is first
  ionization energy in eV (converted from kJ/mol), `zeff` is Slater
  effective nuclear charge on the outermost s/p electron, `radiusProxy` is
  the Slater-derived size estimate in Å (label it as modeled, not measured).
  `xpos/ypos` are periodic-table grid coordinates (f-block in rows 9-10).
- `subshell_energies.json`: probe energies from Slater's rules. K (Z=19):
  4s = −4.8 eV vs 3d = −1.5 eV; crossing happens by Sc (Z=21): 3d = −13.6 eV
  vs 4s = −8.9 eV. When citing these in prose, note they come from Slater's
  empirical shielding rules (a simplification, but an honest one).

## Checklist: touching any page

1. No KaTeX in headings; section numbers on article h2s.
2. Subshell color law respected in every visual.
3. Both navs updated (and neighbors', if order changed).
4. Canvas centered + capped; labels non-overlapping; retina-scaled.
5. Interactives degrade gracefully (a static fallback message if JS fails).
6. Mobile pass: hamburger TOC, stacked controls, canvas fits 360px width.
7. Screenshot before declaring done.
