# scripts/ch05 — Chapter 5: Building molecules

Lewis dot notation + a real Lewis-structure builder. The biggest interactive
on the site is `builder/`; everything else is small SVG.

## Modules

| File | Responsibility | Lines |
|------|----------------|-------|
| `main.js` | Entry point. Try/catch per init. | <30 |
| `lewis-strip.js` | 5.1 — pick a main-group element, render Lewis dot symbol; valence from `elements.json` `configSemantic`. | ~150 |
| `octet-diagrams.js` | 5.2 — two static SVG figures (H2 duet, HCl octet) showing both atoms counting the shared pair. | ~140 |
| `worked-examples.js` | 5.3 — static H2O and NH3 Lewis structures in `<svg>` tags inside `<callout.example>` blocks. | ~140 |
| `builder/molecules.js` | Molecule specs: skeleton positions + target answers (bond orders, lone pairs). 9 molecules. | ~140 |
| `builder/engine.js` | Pure state: `emptyAttempt`, `cycleBond`, `cycleLonePair`, `electronsPlaced`, `atomShellCount`, `validate`, `evaluate`, `hintFor`. No DOM. | ~150 |
| `builder/renderer.js` | SVG render only: bonds, gap hit-targets, atom hit-targets, lone-pair dots. Stateless; called every redraw. | ~180 |
| `builder/controller.js` | Wires engine → renderer → DOM. `createBuilder()` exported; `initBuilder()` mounts the section-5.4 instance. Boss imports the same factory. | ~190 |
| `bond-compare.js` | 5.5 — three C–C/C=C/C≡C rows: length-proportional glyph + energy bar. Static SVG. | ~140 |
| `boss.js` | The Architect: builds 3 molecules in sequence in exam mode (no glow until check, 3 checks each). Uses `createBuilder` with `glowMode: "none"`. | ~150 |

## Builder design

State lives on one `attempt` object: `{ bonds: { "i-j": order }, lonePairs: [n,...] }`.
The engine is pure functions taking `attempt + molecule`. The renderer is pure
SVG-from-state. The controller holds the only mutable state object.

Interaction model:
- Click the **gap** between two adjacent atoms → cycle bond order 0→1→2→3→0.
- Click an **atom** → add a lone pair, cycling 0→1→2→3→4→0.
- After every click in normal mode: re-evaluate; if won, fire `onWin` and
  unlock the next molecule in the ladder.

Validation: per-edge bond order match + per-atom lone-pair count match.
CO2's two double bonds are interchangeable but both go to 2, so identity
match works. For molecules with truly symmetric atom slots (e.g. CH4's four
hydrogens), the engine's identity check is still correct because they're
all assigned the same target (0 lone pairs, 1 bond order each).

## Exam mode (boss)

`glowMode: "none"` hides per-atom glow and the count tag. The controller
exposes `setGlowMode` so the boss can briefly flip glow on after a check,
then back off when the user mutates anything.

## Data dependency

Reads `data/elements.json` to derive valence counts from `configSemantic`.
Same parser lives in two places (`lewis-strip.js` and `builder/molecules.js`)
to avoid cross-section coupling.

## Adding a new molecule

1. Add an entry to `MOLECULES` in `builder/molecules.js`:
   - `atoms[]`: each with `sym`, `x`, `y` (SVG coords in 600×380 viewBox),
     and `target` (8, or 2 for H).
   - `edges[]`: pairs of atom indices that can host bonds.
   - `target`: canonical answer (bond orders + lone-pair counts per atom).
   - `fact`: one-sentence chemical fact shown on win.
2. The ladder picks up the new molecule automatically.
3. If you want it in the boss, add the id to `ROUND_IDS` in `boss.js`.
