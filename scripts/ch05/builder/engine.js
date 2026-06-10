/* 5.4 — builder engine.
   Pure state: a working answer (bond orders + lone pairs per atom) for a
   given molecule. Helpers compute electron counts, per-atom shell totals,
   and match against the molecule's canonical target with symmetry
   tolerance. */

export function emptyAttempt(molecule) {
  const bonds = {};
  for (const [i, j] of molecule.edges) bonds[edgeKey(i, j)] = 0;
  const lonePairs = molecule.atoms.map(() => 0);
  return { bonds, lonePairs };
}

export function edgeKey(i, j) {
  return i < j ? `${i}-${j}` : `${j}-${i}`;
}

// cycle a single bond order: 0 → 1 → 2 → 3 → 0
export function cycleBond(attempt, i, j) {
  const k = edgeKey(i, j);
  attempt.bonds[k] = ((attempt.bonds[k] || 0) + 1) % 4;
}

// cycle lone pairs on an atom: 0 → 1 → 2 → 3 → 4 → 0
export function cycleLonePair(attempt, atomIndex) {
  attempt.lonePairs[atomIndex] = ((attempt.lonePairs[atomIndex] || 0) + 1) % 5;
}

export function resetAttempt(molecule) {
  return emptyAttempt(molecule);
}

// total electrons placed = 2 × (sum of bond orders) + 2 × (sum of lone pairs)
export function electronsPlaced(attempt) {
  let bonded = 0;
  for (const k in attempt.bonds) bonded += attempt.bonds[k];
  let lone = 0;
  for (const lp of attempt.lonePairs) lone += lp;
  return bonded * 2 + lone * 2;
}

// per-atom shell count: 2 × (sum of bond orders touching this atom) + 2 × (lone pairs)
export function atomShellCount(attempt, molecule, atomIndex) {
  let bonds = 0;
  for (const k in attempt.bonds) {
    const [a, b] = k.split("-").map(Number);
    if (a === atomIndex || b === atomIndex) bonds += attempt.bonds[k];
  }
  return bonds * 2 + (attempt.lonePairs[atomIndex] || 0) * 2;
}

// per-atom state classification: under | full | over
export function atomState(attempt, molecule, atomIndex) {
  const target = molecule.atoms[atomIndex].target;
  const count = atomShellCount(attempt, molecule, atomIndex);
  if (count === target) return "full";
  if (count > target) return "over";
  return "under";
}

// validation: compare attempt to molecule.target.
// returns { match: bool, issues: [{ kind, atomIndex?, edge?, msg }] }
export function validate(attempt, molecule) {
  const issues = [];

  // check bond orders
  for (const [i, j] of molecule.edges) {
    const k = edgeKey(i, j);
    const want = molecule.target.bonds[k] ?? 0;
    const have = attempt.bonds[k] ?? 0;
    if (have !== want) {
      issues.push({
        kind: "bond",
        edge: [i, j],
        msg: `bond ${molecule.atoms[i].sym}-${molecule.atoms[j].sym} should be order ${want}, you have ${have}`,
        want, have,
      });
    }
  }

  // check lone pairs
  for (let a = 0; a < molecule.atoms.length; a++) {
    const want = molecule.target.lonePairs[a];
    const have = attempt.lonePairs[a];
    if (have !== want) {
      issues.push({
        kind: "lone",
        atomIndex: a,
        msg: `${molecule.atoms[a].sym} should have ${want} lone pair${want === 1 ? "" : "s"}, you have ${have}`,
        want, have,
      });
    }
  }

  return { match: issues.length === 0, issues };
}

// overall completeness: all atoms full, all electrons placed, structure matches target.
export function evaluate(attempt, molecule, totalAvailable) {
  const placed = electronsPlaced(attempt);
  const allAtomsOK = molecule.atoms.every((_, i) =>
    atomState(attempt, molecule, i) === "full");
  const electronsOK = placed === totalAvailable;
  const v = validate(attempt, molecule);

  return {
    placed,
    available: totalAvailable,
    allAtomsFull: allAtomsOK,
    electronsExact: electronsOK,
    structureMatch: v.match,
    issues: v.issues,
    won: allAtomsOK && electronsOK && v.match,
  };
}

// craft a single-issue hint message in a corrective tone.
// preference: bond issues first, then lone pair, then "everything is fine".
export function hintFor(attempt, molecule) {
  const v = validate(attempt, molecule);
  if (v.match) return "structure looks right — check the electron count and atom shells.";
  // prefer "over" issues (visually loud) then "under"
  const overs = v.issues.filter((iss) => {
    if (iss.kind === "lone") return iss.have > iss.want;
    if (iss.kind === "bond") return iss.have > iss.want;
    return false;
  });
  const unders = v.issues.filter((iss) => {
    if (iss.kind === "lone") return iss.have < iss.want;
    if (iss.kind === "bond") return iss.have < iss.want;
    return false;
  });
  const target = overs.length ? overs[0] : unders[0];
  if (!target) return "looks close.";
  if (target.kind === "bond") {
    const [i, j] = target.edge;
    const dir = target.have > target.want ? "too high" : "too low";
    return `bond order between ${molecule.atoms[i].sym} and ${molecule.atoms[j].sym} is ${dir} — try ${target.want}.`;
  }
  // lone pair
  const a = molecule.atoms[target.atomIndex];
  const dir = target.have > target.want ? "too many" : "too few";
  return `${a.sym} has ${dir} lone pair${target.have === 1 ? "" : "s"} — should be ${target.want}.`;
}
