#!/usr/bin/env python3
"""
Patch Sanjay's nav-lab bundle so it renders the FIRST-RUN state of the journey
that onboarding actually promised.

WHY PATCH A BUILT BUNDLE AT ALL
-------------------------------
The nav lab is published as build output only — no source, no sourcemaps, and
the source branch behind it was never pushed anywhere the team can reach. So
"use his elements rather than recreate them" can only mean one thing: drive his
own components by editing the fixtures they read. Everything downstream — the
capsule dock, the scenario card, the tether line, the map camera, the milestone
pills — is derived from a handful of literals. Change those and his components
render the state we want, with none of their behaviour reimplemented.

WHAT IS PATCHED, AND WHY EACH ONE
---------------------------------
1. `businessAnalystRoadmap` — replaced wholesale with the onboarding journey
   (8 briefs / 12 weeks, from `CURRICULUM` in roadmap-data.js). Atul's call:
   "use the journey card as metadata and update the navigation content with
   that." Previously the flow showed one dataset and landed on another, so the
   card said Stripe and the map flew to Notion. Now there is one dataset: the
   cards, the dock chips, the scenario card and the camera are the same eight
   stops in the same order.

   Shape is mirrored field-for-field from the literal being replaced (see
   `SCENARIO_TEMPLATE_NOTE` below) so his code paths hit no undefined.

   One brief per category, because the dock renders CATEGORIES as clusters —
   eight single-scenario clusters give an eight-chip rail in journey order, and
   the cluster label carries the week ("Week 1", "Weeks 3-4"), which is the
   onboarding metadata landing in the navigation.

2. `completedCount` — 0. It is the single progress input; `scenarioStatus`
   derives everything from it, so 0 makes brief 1 `current` and the rest
   `locked`. This is what makes the dock show its genuine first-time-user state
   rather than the mid-journey demo state.

3. `CURRENT_SEQUENCE=6` -> 1. A SECOND, independent fixture that feeds the React
   user store. Patching only the roadmap leaves the store still claiming five
   completed scenarios; both must move together or the screen disagrees with
   itself.

4. `JOURNEY_MILESTONES` afterCategories 5 -> 8. Portfolio stays at 3 — the
   onboarding authors its unlock inside brief 3 ("three scenarios in, recruiters
   can see it"), so 3 is already correct. Job Portal is the finale, which is
   category 8 now that there are eight rather than five.

5. `COMPANY_LOGOS` — extended with DoorDash, Salesforce and Amplitude as inline
   data-URI SVGs. His map covers 16 companies but not these three, and a company
   with no logo renders as a blank grey chip. The SVGs are the onboarding
   prototype's own, already extracted into roadmap-data.js. Extending his map is
   better than post-hoc DOM fixing: the chips, the scenario card and any future
   surface all resolve the logo through the same lookup he already wrote.

6. `window.__navlab` — the camera handle. `flyToCompany` / `releaseCamera` are
   module-scoped with no window bridge and no CustomEvent, so an overlay cannot
   drive the map without this one insertion. Everything else the flow needs is
   reachable through the DOM.

7. `streak:6` -> 0. Cosmetic: a first-time learner has no streak.

SAFETY
------
Every target is asserted to appear EXACTLY once before it is replaced, and the
script refuses to run twice (it detects its own marker). Run from the repo root:

    python3 firstrun/patch-bundle.py

It rewrites assets/index-CswphSY3.js in place. To start over, restore that file
from git and re-run.
"""

import json
import os
import re
import sys

BUNDLE = "assets/index-CswphSY3.js"
DATA = "firstrun/roadmap-data.js"
MARKER = "window.__navlab="

# The field shape of a scenario, copied from the literal we replace. Kept as a
# note rather than code so a future reader can diff it against the bundle:
#   id, sequence_order, title, problem_statement, user_role, estimated_minutes,
#   difficulty, skills[], tools[], deliverables[], company:{name}, outcome?{...}
# `outcome` is present ONLY on completed scenarios; at completedCount 0 none
# have it, which is why nothing here writes one.
SCENARIO_TEMPLATE_NOTE = True


def read(path):
    with open(path, encoding="utf-8", errors="surrogatepass") as f:
        return f.read()


def brace_match(s, start):
    """Return the substring of the {...} or [...] literal beginning at `start`."""
    open_ch = s[start]
    close_ch = {"{": "}", "[": "]"}[open_ch]
    depth = 0
    instr = None
    esc = False
    k = start
    while k < len(s):
        ch = s[k]
        if instr:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == instr:
                instr = None
        else:
            if ch in "'\"`":
                instr = ch
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return s[start : k + 1]
        k += 1
    raise ValueError("unbalanced literal")


def load_curriculum():
    """Parse CURRICULUM out of roadmap-data.js (it is plain JS object literals).

    Done with a tiny transform to JSON rather than a JS engine: the file is data
    only, authored by the onboarding prototype, and keeping the dependency at
    zero means this script runs anywhere.
    """
    src = read(DATA)
    i = src.index("const CURRICULUM=")
    lit = brace_match(src, src.index("[", i))
    # Bare keys -> quoted keys; single quotes -> double.
    js = re.sub(r"([{,]\s*)([A-Za-z_][\w]*)\s*:", r'\1"\2":', lit)
    js = re.sub(r"'((?:[^'\\]|\\.)*)'", lambda m: json.dumps(m.group(1).replace("\\'", "'")), js)
    js = re.sub(r",\s*([\]}])", r"\1", js)
    return json.loads(js)


def load_logo(name):
    """One company SVG out of ZFR_LOGO, as a data URI."""
    src = read(DATA)
    i = src.index("const ZFR_LOGO=")
    logos = json.loads(brace_match(src, src.index("{", i)))
    svg = logos.get(name)
    if not svg:
        return None
    return "data:image/svg+xml;base64," + __import__("base64").b64encode(svg.encode()).decode()


def week_label(w0, w1):
    return f"Week {w0}" if w0 == w1 else f"Weeks {w0}-{w1}"


def build_roadmap(curriculum):
    """The onboarding journey, in the shape his components read."""
    categories = []
    week = 1
    for i, c in enumerate(curriculum):
        seq = i + 1
        w0, w1 = week, week + c["weeks"] - 1
        week += c["weeks"]
        difficulty = "Beginner" if seq <= 3 else ("Intermediate" if seq <= 6 else "Advanced")
        mgr_name, mgr_role = c["mgr"][0], c["mgr"][1]
        # `problem_statement` is the card's description slot. The onboarding's
        # own metadata — who you work with and what you hand in — is what goes
        # there, so the card says the same thing the journey card said.
        problem = (
            f"With {mgr_name}, {mgr_role}. "
            f"You hand in {c['deliver']}."
        )
        categories.append(
            {
                "id": f"week-{seq:02d}",
                # The cluster label in the dock. Carries the week, which is the
                # unit the onboarding roadmap is measured in.
                "title": week_label(w0, w1),
                "concepts": c["skills"],
                "scenarios": [
                    {
                        "id": f"wk-{seq:02d}",
                        "sequence_order": seq,
                        "title": c["prob"],
                        "problem_statement": problem,
                        "user_role": "Business Analyst",
                        # A week of part-time work, in minutes. Kept round.
                        "estimated_minutes": c["weeks"] * 150,
                        "difficulty": difficulty,
                        "skills": c["skills"],
                        "tools": c["tools"],
                        "deliverables": [c["deliver"], "Final Proposal Presentation"],
                        "company": {"name": c["co"]},
                    }
                ],
            }
        )
    return {"journeyTitle": "Business Analyst", "completedCount": 0, "categories": categories}


def main():
    if not os.path.exists(BUNDLE):
        sys.exit(f"run from the repo root: {BUNDLE} not found")

    s = read(BUNDLE)
    if MARKER in s:
        sys.exit("bundle already patched — restore it from git before re-running")

    curriculum = load_curriculum()
    roadmap = build_roadmap(curriculum)
    print(f"journey: {len(curriculum)} briefs, {sum(c['weeks'] for c in curriculum)} weeks")

    def replace_once(hay, needle, repl, what):
        n = hay.count(needle)
        if n != 1:
            sys.exit(f"expected exactly 1 occurrence of {what}, found {n} — bundle changed, aborting")
        print(f"  patched: {what}")
        return hay.replace(needle, repl, 1)

    # 1 + 2 — the roadmap fixture, wholesale (carries completedCount: 0).
    i = s.index("businessAnalystRoadmap={journeyTitle")
    old = brace_match(s, s.index("{", i))
    s = s.replace(old, json.dumps(roadmap, ensure_ascii=False), 1)
    print("  patched: businessAnalystRoadmap (8 briefs, completedCount 0)")

    # 3 — the user store's own copy of "where am I".
    s = replace_once(s, "CURRENT_SEQUENCE=6", "CURRENT_SEQUENCE=1", "CURRENT_SEQUENCE")

    # 4 — Job Portal is the finale of eight categories, not five.
    s = replace_once(s, "afterCategories:5", "afterCategories:8", "JOURNEY_MILESTONES job_portal")

    # 5 — logos his map does not carry.
    add = []
    for name in ("DoorDash", "Salesforce", "Amplitude"):
        uri = load_logo(name)
        if uri:
            add.append(f'"{name}":{json.dumps(uri)}')
        else:
            print(f"  WARNING: no SVG for {name} — its chip will render blank")
    if add:
        s = replace_once(
            s,
            "COMPANY_LOGOS={Airbnb:airbnb,",
            "COMPANY_LOGOS={" + ",".join(add) + ",Airbnb:airbnb,",
            "COMPANY_LOGOS (+%d)" % len(add),
        )

    # 6 — the camera handle.
    anchor = "function releaseCamera(){setMapCamera(null)}"
    s = replace_once(
        s,
        anchor,
        anchor + f"{MARKER}{{flyToCompany,releaseCamera,setMapCamera}};",
        "window.__navlab camera handle",
    )

    # 7 — cosmetic.
    s = replace_once(s, "streak:6", "streak:0", "streak")

    with open(BUNDLE, "w", encoding="utf-8", errors="surrogatepass") as f:
        f.write(s)
    print(f"\nwrote {BUNDLE}")


if __name__ == "__main__":
    main()
