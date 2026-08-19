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

   The briefs are GROUPED BY CATEGORY, using the product's own four category
   ids and titles — see `CATEGORY_TITLES` for why weeks belong to the roadmap
   and categories belong to the navigation.

2. `completedCount` — 0. It is the single progress input; `scenarioStatus`
   derives everything from it, so 0 makes brief 1 `current` and the rest
   `locked`. This is what makes the dock show its genuine first-time-user state
   rather than the mid-journey demo state.

3. `CURRENT_SEQUENCE=6` -> 1. A SECOND, independent fixture that feeds the React
   user store. Patching only the roadmap leaves the store still claiming five
   completed scenarios; both must move together or the screen disagrees with
   itself.

4. `JOURNEY_MILESTONES` afterCategories 5 -> 4. Portfolio stays at 3 — the
   onboarding authors its unlock inside brief 3 ("three scenarios in, recruiters
   can see it"), and three categories still precede it. Job Portal is the
   finale, which is category 4 now that four categories carry the eight briefs.

5. `COMPANY_LOGOS` — extended with DoorDash, Salesforce and Amplitude as inline
   data-URI SVGs. His map covers 16 companies but not these three, and a company
   with no logo renders as a blank grey chip. The SVGs are the onboarding
   prototype's own, already extracted into roadmap-data.js. Extending his map is
   better than post-hoc DOM fixing: the chips, the scenario card and any future
   surface all resolve the logo through the same lookup he already wrote.

6. `window.__navlab` — the camera handle, plus the roadmap itself.
   `flyToCompany` / `releaseCamera` are module-scoped with no window bridge and
   no CustomEvent, so an overlay cannot drive the map without this insertion.
   `roadmap` is exposed alongside them so the overlay's cards can read their
   category from THE SAME OBJECT the dock groups by — a copy of the mapping in
   the overlay could drift from the one in the fixture; a reference cannot.

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
    """One company SVG out of ZFR_LOGO, as a data URI.

    The xmlns injection is load-bearing, not hygiene. These SVGs were authored
    for INLINE injection, where the HTML parser supplies the namespace — so
    most of them omit `xmlns`. An `<img src="data:image/svg+xml...">` is a
    STANDALONE SVG document, and without the namespace the browser refuses to
    render it: `img.complete` goes true with `naturalWidth === 0`, and the chip
    shows the broken-image glyph. That is exactly what the DoorDash and
    Salesforce dock chips did.
    """
    src = read(DATA)
    i = src.index("const ZFR_LOGO=")
    logos = json.loads(brace_match(src, src.index("{", i)))
    svg = logos.get(name)
    if not svg:
        return None
    if "xmlns=" not in svg:
        svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ', 1)
    return "data:image/svg+xml;base64," + __import__("base64").b64encode(svg.encode()).decode()


def map_point_ids(bundle):
    """company label -> map placement UUID, read from his own `worldMapPoints`."""
    i = bundle.index("worldMapPoints=[")
    lit = brace_match(bundle, bundle.index("[", i))
    return {m.group(2): m.group(1)
            for m in re.finditer(r'\{id:"([^"]+)",label:"([^"]+)"', lit)}


def week_label(w0, w1):
    return f"Week {w0}" if w0 == w1 else f"Weeks {w0}-{w1}"


# ── The navigation's grouping ────────────────────────────────────────────────
#
# WEEKS ARE FOR THE ROADMAP; CATEGORIES ARE FOR THE NAVIGATION.
#
# v2 made each brief its own category, so the dock read "Week 1 · Week 2 · …".
# That was wrong twice over: it threw away the grouping the original nav bar
# had, and it made the dock a second copy of the roadmap instead of the thing
# the roadmap resolves into. A learner should see their twelve weeks during
# onboarding, then recognise the SAME work in the app organised the way the
# product organises it — by the kind of problem it is.
#
# So these four ids and titles are VERBATIM from the roadmap fixture being
# replaced (`git show dffa647:assets/index-CswphSY3.js`). The onboarding's
# eight briefs are mapped onto them by what each brief actually asks for.
#
# `ai-enablement` — the fifth original category — is deliberately absent: none
# of the eight briefs is AI-enablement work, and an empty cluster renders as a
# dead node on the rail. Adding it needs a ninth brief, which is an authoring
# decision, not a patching one.
CATEGORY_TITLES = {
    "growth-revenue": "Growth & Revenue Optimization",
    "operational-efficiency": "Operational Efficiency & Cost Reduction",
    "product-kpi-architecture": "Product & KPI Architecture",
    "market-entry": "Market Entry & Strategic Expansion",
}

# Rail order, mirroring the original nav. The milestones land between them by
# `afterCategories`, so this order also decides where Portfolio sits.
CATEGORY_ORDER = [
    "growth-revenue",
    "operational-efficiency",
    "product-kpi-architecture",
    "market-entry",
]

# Company -> category. Keyed by company because that is the stable identifier
# across the onboarding data and the bundle.
BRIEF_CATEGORY = {
    "Stripe": "growth-revenue",              # churn diagnosis, funnel + cohort
    "DoorDash": "market-entry",              # which city do we launch next
    "Notion": "growth-revenue",              # activation experiment
    "Salesforce": "operational-efficiency",  # renewal at risk, brief the room
    "Shopify": "growth-revenue",             # month-two retention leak
    "Uber": "product-kpi-architecture",      # experiment read-out, ship/kill
    "Airbnb": "market-entry",                # pick our next market
    "Amplitude": "product-kpi-architecture", # funnel teardown, metric trees
}


def build_roadmap(curriculum):
    """The onboarding journey, grouped the way the navigation groups work.

    Sequence order stays WEEK order 1..8 — the journey is still the twelve
    weeks the learner was shown, and `scenarioStatus` still makes brief 1
    current and the rest locked. Only the grouping changes, which is exactly
    what the dock renders.
    """
    weeks_by_company = {}
    week = 1
    for i, c in enumerate(curriculum):
        w0, w1 = week, week + c["weeks"] - 1
        week += c["weeks"]
        weeks_by_company[c["co"]] = (i + 1, w0, w1, c)

    buckets = {cid: [] for cid in CATEGORY_ORDER}
    for co, (seq, w0, w1, c) in weeks_by_company.items():
        cid = BRIEF_CATEGORY.get(co)
        if not cid:
            sys.exit(f"no category mapped for {co} — refusing to guess")
        difficulty = "Beginner" if seq <= 3 else ("Intermediate" if seq <= 6 else "Advanced")
        mgr_name, mgr_role = c["mgr"][0], c["mgr"][1]
        buckets[cid].append(
            {
                "id": f"wk-{seq:02d}",
                "sequence_order": seq,
                "title": c["prob"],
                # The card's description slot. The onboarding's own metadata —
                # who you work with and what you hand in — is what belongs there.
                "problem_statement": f"With {mgr_name}, {mgr_role}. You hand in {c['deliver']}.",
                "user_role": "Business Analyst",
                "estimated_minutes": c["weeks"] * 150,
                "difficulty": difficulty,
                "skills": c["skills"],
                "tools": c["tools"],
                "deliverables": [c["deliver"], "Final Proposal Presentation"],
                "company": {"name": co},
            }
        )

    categories = []
    for cid in CATEGORY_ORDER:
        scenarios = sorted(buckets[cid], key=lambda s: s["sequence_order"])
        if not scenarios:
            continue
        # Concepts are DERIVED from the briefs in the cluster rather than
        # re-authored, so they can never describe work the cluster does not hold.
        concepts, seen = [], set()
        for s_ in scenarios:
            for k in s_["skills"]:
                if k.lower() not in seen:
                    seen.add(k.lower())
                    concepts.append(k)
        categories.append(
            {
                "id": cid,
                "title": CATEGORY_TITLES[cid],
                "concepts": concepts,
                "scenarios": scenarios,
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
    print(f"journey: {len(curriculum)} briefs, {sum(c['weeks'] for c in curriculum)} weeks, "
          f"{len(roadmap['categories'])} categories")
    for cat in roadmap["categories"]:
        print("   ", cat["title"], "->", ", ".join(x["company"]["name"] for x in cat["scenarios"]))

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
    # Job Portal closes the rail. Four categories now, not five (see CATEGORY_TITLES).
    s = replace_once(s, "afterCategories:5", "afterCategories:4", "JOURNEY_MILESTONES job_portal")

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

    # 5b — map ids, so the journey's companies actually appear on the map.
    #
    # `COMPANY_IDS` maps a company name to the UUID his map placements are keyed
    # by. It covers only six companies, and `MapViewport` renders a marker ONLY
    # for ids in `focusCompanyIds` — so a journey company missing from this map
    # gets no building marker, and `BuildingLink` then draws no tether at all,
    # because it anchors on `[title="<company>"]`.
    #
    # Stripe is week one, so with it missing the very first thing the flow lands
    # on had no line to its building. The ids are not invented: they are read out
    # of his own `worldMapPoints`, which already carries Stripe and Uber. A
    # company with no point on the map (DoorDash, Salesforce, Amplitude) is left
    # out — it has no building in the city, and a line to nowhere is worse than
    # no line.
    point_ids = map_point_ids(s)
    missing = []
    for co in sorted({c["co"] for c in curriculum}):
        if f"{co}:" in s[s.index("COMPANY_IDS=") : s.index("COMPANY_IDS=") + 800]:
            continue
        if co in point_ids:
            missing.append(f'{co}:"{point_ids[co]}"')
        else:
            print(f"  note: {co} has no point on the map — no marker, no tether")
    if missing:
        s = replace_once(
            s,
            "COMPANY_IDS={Notion:",
            "COMPANY_IDS={" + ",".join(missing) + ",Notion:",
            "COMPANY_IDS (+%d)" % len(missing),
        )

    # 5c — the cluster's phantom left inset.
    #
    # `CategoryGroup` is a `gap-[5px]` flex row whose FIRST child is the
    # collapsed category-title button: `maxWidth: 0`, invisible — but still in
    # flow, so it owns a 5px gap slot. Every cluster therefore starts its first
    # chip 13px from the left edge (8 padding + 0 button + 5 gap) against 8px on
    # the right. Atul circled the asymmetry on every cluster.
    #
    # The fix keeps the button in flow (his hover-expand depends on it) and
    # cancels only the phantom slot: collapsed marginLeft -5 that returns to 0
    # when open, with "margin" added to his own slide() transition so the
    # expand stays smooth.
    s = replace_once(
        s,
        "maxWidth:$?240:0,opacity:$?1:0,paddingLeft:$?10:0",
        "marginLeft:$?0:-5,maxWidth:$?240:0,opacity:$?1:0,paddingLeft:$?10:0",
        "CategoryGroup collapsed-title gap slot",
    )
    s = replace_once(
        s,
        'transition:slide(Zn,["max-width","opacity","padding"])},children:Vn.title}',
        'transition:slide(Zn,["max-width","opacity","padding","margin"])},children:Vn.title}',
        "CategoryGroup title transition (+margin)",
    )

    # 6 — the camera handle.
    anchor = "function releaseCamera(){setMapCamera(null)}"
    s = replace_once(
        s,
        anchor,
        anchor + f"{MARKER}{{flyToCompany,releaseCamera,setMapCamera,roadmap:businessAnalystRoadmap}};",
        "window.__navlab camera handle + roadmap",
    )

    # 7 — cosmetic.
    s = replace_once(s, "streak:6", "streak:0", "streak")

    with open(BUNDLE, "w", encoding="utf-8", errors="surrogatepass") as f:
        f.write(s)
    print(f"\nwrote {BUNDLE}")


if __name__ == "__main__":
    main()
