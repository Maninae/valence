/* 5.4 — molecule specs for the Lewis builder.
   Each spec is a skeleton: atom positions (in SVG coords, 0..600 x 0..380),
   the connectivity (which atom pairs can host bonds), a "target" answer
   (bond orders + lone-pair counts), and metadata.

   target.bonds is keyed by "i-j" where i < j (atom indices) → integer order.
   target.lonePairs is an array indexed by atom → integer count.
   Symmetry-equivalent answers are handled in the engine (CO2's two doubles
   are interchangeable; H2/O2/N2 only have one bond anyway).

   Each atom has:
     - sym (element symbol — must be in elements.json)
     - x, y (SVG center)
     - target (full-shell count: 2 for H, 8 otherwise)
*/

export const MOLECULES = [
  {
    id: "H2",
    name: "H2",
    fullName: "Hydrogen gas",
    atoms: [
      { sym: "H", x: 230, y: 190, target: 2 },
      { sym: "H", x: 370, y: 190, target: 2 },
    ],
    edges: [[0, 1]],
    target: { bonds: { "0-1": 1 }, lonePairs: [0, 0] },
    fact: "Hydrogen — the simplest molecule, two atoms sharing a single pair.",
  },
  {
    id: "HCl",
    name: "HCl",
    fullName: "Hydrogen chloride",
    atoms: [
      { sym: "H", x: 200, y: 190, target: 2 },
      { sym: "Cl", x: 400, y: 190, target: 8 },
    ],
    edges: [[0, 1]],
    target: { bonds: { "0-1": 1 }, lonePairs: [0, 3] },
    fact: "Hydrogen chloride — dissolves in water to make hydrochloric acid, the stuff in your stomach.",
  },
  {
    id: "H2O",
    name: "H2O",
    fullName: "Water",
    atoms: [
      { sym: "O", x: 300, y: 170, target: 8 },
      { sym: "H", x: 200, y: 260, target: 2 },
      { sym: "H", x: 400, y: 260, target: 2 },
    ],
    edges: [[0, 1], [0, 2]],
    target: { bonds: { "0-1": 1, "0-2": 1 }, lonePairs: [2, 0, 0] },
    fact: "Water — the bent geometry and lone pairs are why ice floats and life works.",
  },
  {
    id: "NH3",
    name: "NH3",
    fullName: "Ammonia",
    atoms: [
      { sym: "N", x: 300, y: 170, target: 8 },
      { sym: "H", x: 180, y: 260, target: 2 },
      { sym: "H", x: 300, y: 300, target: 2 },
      { sym: "H", x: 420, y: 260, target: 2 },
    ],
    edges: [[0, 1], [0, 2], [0, 3]],
    target: { bonds: { "0-1": 1, "0-2": 1, "0-3": 1 }, lonePairs: [1, 0, 0, 0] },
    fact: "Ammonia — three N-H bonds and one lone pair. That pair is why ammonia smells so sharp; it grabs protons.",
  },
  {
    id: "CH4",
    name: "CH4",
    fullName: "Methane",
    atoms: [
      { sym: "C", x: 300, y: 200, target: 8 },
      { sym: "H", x: 180, y: 110, target: 2 },
      { sym: "H", x: 420, y: 110, target: 2 },
      { sym: "H", x: 180, y: 290, target: 2 },
      { sym: "H", x: 420, y: 290, target: 2 },
    ],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4]],
    target: {
      bonds: { "0-1": 1, "0-2": 1, "0-3": 1, "0-4": 1 },
      lonePairs: [0, 0, 0, 0, 0],
    },
    fact: "Methane — natural gas. Four C-H bonds, no lone pairs. The real shape is a tetrahedron, not a square.",
  },
  {
    id: "O2",
    name: "O2",
    fullName: "Oxygen gas",
    atoms: [
      { sym: "O", x: 220, y: 190, target: 8 },
      { sym: "O", x: 380, y: 190, target: 8 },
    ],
    edges: [[0, 1]],
    target: { bonds: { "0-1": 2 }, lonePairs: [2, 2] },
    fact: "O2 — a double bond plus two lone pairs on each oxygen. The reason you can breathe.",
  },
  {
    id: "N2",
    name: "N2",
    fullName: "Nitrogen gas",
    atoms: [
      { sym: "N", x: 220, y: 190, target: 8 },
      { sym: "N", x: 380, y: 190, target: 8 },
    ],
    edges: [[0, 1]],
    target: { bonds: { "0-1": 3 }, lonePairs: [1, 1] },
    fact: "N2 — a triple bond, 945 kJ/mol to break. That's why 78% of the air is unreactive.",
  },
  {
    id: "CO2",
    name: "CO2",
    fullName: "Carbon dioxide",
    atoms: [
      { sym: "O", x: 160, y: 190, target: 8 },
      { sym: "C", x: 300, y: 190, target: 8 },
      { sym: "O", x: 440, y: 190, target: 8 },
    ],
    edges: [[0, 1], [1, 2]],
    target: { bonds: { "0-1": 2, "1-2": 2 }, lonePairs: [2, 0, 2] },
    // CO2 also has a valid 1+3 / 3+1 resonance (O=C=O is the canonical Lewis structure).
    // For this exercise we accept only the symmetric 2/2 answer (the default Lewis).
    fact: "CO2 — two double bonds, linear. The greenhouse gas, the carbonation in soda, the exhale of every breath.",
  },
  {
    id: "HCN",
    name: "HCN",
    fullName: "Hydrogen cyanide",
    atoms: [
      { sym: "H", x: 160, y: 190, target: 2 },
      { sym: "C", x: 300, y: 190, target: 8 },
      { sym: "N", x: 440, y: 190, target: 8 },
    ],
    edges: [[0, 1], [1, 2]],
    target: { bonds: { "0-1": 1, "1-2": 3 }, lonePairs: [0, 0, 1] },
    fact: "Hydrogen cyanide — H-C triple-bonded to N. The nitrogen keeps one lone pair. Famously toxic; also a key prebiotic molecule.",
  },
];

// total valence electrons available for a molecule — sum of group valence
// for its atoms. This is the "electrons placed vs available" target.
export function totalValenceElectrons(molecule, valenceLookup) {
  let total = 0;
  for (const a of molecule.atoms) total += valenceLookup(a.sym);
  return total;
}

// Map sym → valence count derived from elements.json configSemantic.
// Same parser used by lewis-strip; replicated here to keep modules
// independent (builder doesn't need to import section 5.1).
export function valenceFromConfig(semantic) {
  const stripped = semantic.replace(/\[[^\]]+\]\s*/, "").trim();
  if (!stripped) return 0;
  const tokens = stripped.split(/\s+/);
  let maxShell = 0;
  for (const t of tokens) {
    const m = /^(\d+)([spdf])(\d+)$/.exec(t);
    if (m) maxShell = Math.max(maxShell, parseInt(m[1], 10));
  }
  let count = 0;
  for (const t of tokens) {
    const m = /^(\d+)([spdf])(\d+)$/.exec(t);
    if (!m) continue;
    if (parseInt(m[1], 10) === maxShell && (m[2] === "s" || m[2] === "p")) {
      count += parseInt(m[3], 10);
    }
  }
  return count;
}
