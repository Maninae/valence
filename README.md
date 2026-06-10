# Valence Shell Game

An interactive course on how electrons arrange themselves inside atoms — and
why that one fact explains the periodic table, bonding, and most of chemistry.

**Live: [maninae.github.io/valence-shell-game](https://maninae.github.io/valence-shell-game)**

Built for a smart STEM high schooler who hasn't taken chemistry. The only
prerequisites are protons, neutrons, and electrons; everything else is
constructed from first principles, with interactives doing the teaching.

## Chapters

1. **Where electrons live** — the planetary atom destroys itself in 16 ps;
   standing waves quantize; rotatable 3D orbital clouds sampled from the real
   hydrogenic wavefunctions.
2. **The filling order** — Pauli, Hund, and aufbau as a seating game, then the
   site's centerpiece: orbital energy levels that drift and cross as the
   nucleus grows, showing exactly why 4s fills before 3d.
3. **The table is a map** — build the periodic table from the filling order,
   then watch effective nuclear charge drive every trend across it.
4. **One continuum, not three bonds** — the H₂ energy well, then an
   electronegativity tug-of-war that morphs a shared cloud smoothly from
   covalent to ionic. Three bond "types" are three regions of one axis.
5. **Building molecules** — Lewis structures as a working tool: an interactive
   builder with live octet checking, from H₂ to HCN.

## Stack

Vanilla JS, no build step. Three.js (orbital clouds, NaCl lattice) and KaTeX
from CDN. Hosted on GitHub Pages straight from `main`.

Element data is baked to JSON by `build/bake_data.py` from the
[Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON)
dataset; orbital-energy curves are computed with Slater's rules (an empirical
approximation, flagged as such where shown).

## Development

```
python3 -m http.server 8000
# open http://localhost:8000
```

To regenerate `data/`: `python3 build/bake_data.py`.
See `CLAUDE.md` for architecture and design-system rules.
