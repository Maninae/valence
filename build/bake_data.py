"""Bake data/elements.json and data/subshell_energies.json from the
Bowserinator Periodic-Table-JSON dataset (build/raw_periodic.json).

elements.json        — per-element fields the site needs (Z, symbol, configs,
                       EN, IE1, block, table position, Slater Zeff + radius proxy)
subshell_energies.json — Slater's-rules orbital energy per subshell per Z,
                       for the chapter-2 energy-crossing explorer.

Run: python3 build/bake_data.py   (from repo root or build/)
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw_periodic.json")
OUT_DIR = os.path.join(HERE, "..", "data")

RYDBERG_EV = 13.6057

# Slater effective principal quantum number
N_STAR = {1: 1.0, 2: 2.0, 3: 3.0, 4: 3.7, 5: 4.0, 6: 4.2, 7: 4.3}

# Slater group ordering: (1s)(2s,2p)(3s,3p)(3d)(4s,4p)(4d)(4f)(5s,5p)(5d)...
GROUP_ORDER = [
    ("1s",), ("2s", "2p"), ("3s", "3p"), ("3d",), ("4s", "4p"),
    ("4d",), ("4f",), ("5s", "5p"), ("5d",), ("5f",), ("6s", "6p"),
    ("6d",), ("7s", "7p"),
]
GROUP_OF = {sub: i for i, grp in enumerate(GROUP_ORDER) for sub in grp}

SUBSHELL_RE = re.compile(r"(\d)([spdf])(\d+)")


def parse_config(cfg):
    """'1s2 2s2 2p6 ...' -> ordered list of (subshell, count)."""
    out = []
    for tok in cfg.split():
        m = SUBSHELL_RE.fullmatch(tok)
        if m:
            out.append((m.group(1) + m.group(2), int(m.group(3))))
    return out


def slater_energy(subshell, occupancy, z):
    """Energy (eV) of one electron in `subshell`, with `occupancy` a dict
    subshell -> electron count (including this electron), nuclear charge z."""
    n = int(subshell[0])
    kind = subshell[1]
    g = GROUP_OF[subshell]
    same_group = sum(c for s, c in occupancy.items() if GROUP_OF[s] == g) - 1
    shield = same_group * (0.30 if subshell == "1s" else 0.35)
    if kind in "sp":
        for s, c in occupancy.items():
            if GROUP_OF[s] == g:
                continue
            sn = int(s[0])
            if sn == n - 1:
                shield += 0.85 * c
            elif sn <= n - 2:
                shield += 1.00 * c
            # same-n d/f electrons sit in *later* Slater groups and do not
            # shield the s,p group; higher groups never shield lower ones
            elif GROUP_OF[s] < g and sn == n:
                shield += 0.85 * c  # unreachable for s/p, kept for clarity
    else:  # d or f: everything in lower groups shields fully
        for s, c in occupancy.items():
            if GROUP_OF[s] < g:
                shield += 1.00 * c
    zeff = max(z - shield, 0.1)
    return -RYDBERG_EV * (zeff / N_STAR[n]) ** 2, zeff


def main():
    raw = json.load(open(RAW))
    elements = [e for e in raw["elements"] if e["number"] <= 118]

    configs = {}  # Z -> ordered [(subshell, count)]
    baked = []
    for e in elements:
        z = e["number"]
        cfg = parse_config(e["electron_configuration"])
        configs[z] = cfg
        occ = dict(cfg)
        # valence = outermost shell's s/p subshell (highest n in config)
        max_n = max(int(s[0]) for s, _ in cfg)
        valence_count = sum(c for s, c in cfg if int(s[0]) == max_n)
        # differentiating subshell = last token of the aufbau-ordered string
        diff_sub = cfg[-1][0] if cfg else None
        zeff = None
        radius_proxy = None
        if diff_sub:
            # Zeff felt by the outermost s/p electron (chemistry-facing value)
            outer = max((s for s, _ in cfg if s[1] in "sp"),
                        key=lambda s: (int(s[0]), s[1]))
            _, zeff = slater_energy(outer, occ, z)
            n_out = int(outer[0])
            radius_proxy = round(N_STAR[n_out] ** 2 / zeff * 0.529, 3)  # Å-ish
        ies = e.get("ionization_energies") or []
        baked.append({
            "z": z,
            "symbol": e["symbol"],
            "name": e["name"],
            "mass": round(e["atomic_mass"], 3) if e.get("atomic_mass") else None,
            "config": e["electron_configuration"],
            "configSemantic": e.get("electron_configuration_semantic"),
            "shells": e["shells"],
            "block": e["block"],
            "group": e.get("group"),
            "period": e.get("period"),
            "xpos": e["xpos"],
            "ypos": e["ypos"],
            "en": e.get("electronegativity_pauling"),
            "ie1": round(ies[0] / 96.485, 2) if ies else None,  # kJ/mol -> eV
            "category": e.get("category"),
            "zeff": round(zeff, 2) if zeff else None,
            "radiusProxy": radius_proxy,
        })

    # --- subshell energy curves for the crossing explorer (Z = 1..40) ---
    PLOT_SUBSHELLS = ["1s", "2s", "2p", "3s", "3p", "3d", "4s", "4p", "5s"]
    curves = {s: [] for s in PLOT_SUBSHELLS}
    for z in range(1, 41):
        cfg = configs[z]
        occ = dict(cfg)
        diff_sub = cfg[-1][0]
        for s in PLOT_SUBSHELLS:
            if s in occ:
                energy, _ = slater_energy(s, occ, z)
            else:
                # probe: move the differentiating electron into s instead
                probe_occ = dict(occ)
                probe_occ[diff_sub] -= 1
                if probe_occ[diff_sub] == 0:
                    del probe_occ[diff_sub]
                probe_occ[s] = 1
                energy, _ = slater_energy(s, probe_occ, z)
            curves[s].append(round(energy, 3))

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "elements.json"), "w") as f:
        json.dump(baked, f, indent=1)
    with open(os.path.join(OUT_DIR, "subshell_energies.json"), "w") as f:
        json.dump({"zMin": 1, "zMax": 40, "curves": curves}, f, indent=1)

    # sanity checks
    k = {s: e for s, e in zip(PLOT_SUBSHELLS,
         [curves[s][18] for s in PLOT_SUBSHELLS])}
    sc = {s: curves[s][20] for s in PLOT_SUBSHELLS}
    assert k["4s"] < k["3d"], f"K: expected 4s below 3d, got {k}"
    assert sc["3d"] < sc["4s"], f"Sc: expected 3d below 4s, got {sc}"
    print(f"Baked {len(baked)} elements.")
    print(f"K  (Z=19): 4s={k['4s']:.2f} eV, 3d={k['3d']:.2f} eV  (4s wins)")
    print(f"Sc (Z=21): 4s={sc['4s']:.2f} eV, 3d={sc['3d']:.2f} eV  (3d dives)")


if __name__ == "__main__":
    main()
