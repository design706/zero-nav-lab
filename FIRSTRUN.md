# Zero — first run (a variation on Sanjay's nav lab)

**Live:** https://design706.github.io/zero-nav-lab/

Sanjay's `zero-nav-lab` build, plus one folder (`firstrun/`), three lines in
`index.html`, and a scripted patch to his bundle's fixtures. None of his
components were rewritten — the flow drives them.

## The beats

| | |
|---|---|
| **1 · welcome** | Lands on the **sharp** world, blurs it, *then* speaks. "Welcome to Zero, Ada." / "We've mapped out your journey." / **Next** |
| **2 · journey** | Title banded across the top, CTA pinned at the bottom, city visible between. The twelve weeks as glass cards **grouped inside labelled category containers**, staggered in left→right on a full-bleed rail with fading edges. Free scroll. One CTA: **Let's begin** |
| **3 · morph** | Each card's mark flies **on an arc** onto its own dock chip while the groups sink and the dock fades up underneath, then the world comes back into focus |
| **4 · landing** | Camera flies into week one's building → the card lands as the city settles → his tether draws the line |

The blur is an *event*, not a backdrop: a modal is something you dismiss, and
the world behind it is scenery. Blurring the actual world says you are already
inside this place, it is just not in focus yet — which is why the last beat
unblurs rather than closing anything.

## Weeks belong to the roadmap. Categories belong to the navigation.

A card says **Week 1**; the **container it sits in** says Growth & Revenue
Optimization — once, for all of its cards. (A per-card category chip was tried
and dropped: repeating the same label three times inside one category is what
made it read as noise.) The dock groups by the same four categories, in the same
order, so the journey and the navigation are one arrangement seen twice.

| Category | Briefs |
|---|---|
| Growth & Revenue Optimization | Stripe · Notion · Shopify |
| Operational Efficiency & Cost Reduction | Salesforce |
| Product & KPI Architecture | Uber · Amplitude |
| *Portfolio* | after three categories |
| Market Entry & Strategic Expansion | DoorDash · Airbnb |
| *Job Portal* | the finale |

`ai-enablement` — his fifth category — is absent: none of the eight onboarding
briefs is AI work, and an empty cluster renders as a dead node.

## What the patch does, and why

His source was never pushed (build output, no sourcemaps), so driving his
components means editing the fixtures they read. Every target is asserted unique
before replacement; the script refuses to run twice.

| Patch | Why |
|---|---|
| `businessAnalystRoadmap` replaced | the onboarding journey becomes the product's journey, grouped by his categories |
| `completedCount: 0` | the single progress input — brief 1 current, the rest locked: the genuine first-run dock |
| `CURRENT_SEQUENCE 6 → 1` | a second, independent fixture feeding the user store; without it the screen disagrees with itself |
| `afterCategories 5 → 4` | Job Portal closes a four-category rail |
| `COMPANY_LOGOS` +3 | DoorDash, Salesforce, Amplitude — a company with no logo renders as a blank chip |
| `COMPANY_IDS` +2 | **Stripe and Uber had no map id**, so they got no building marker and his tether had nothing to anchor to. The ids come from his own `worldMapPoints` |
| `CategoryGroup` collapsed title | its `maxWidth: 0` title button still owned a **5px flex-gap slot**, so every cluster's first chip sat 5px further from the left edge than the last sat from the right. Collapsed `marginLeft: -5` cancels the phantom slot |
| `window.__navlab` | camera handle + the roadmap object, both module-scoped with no bridge |
| `streak 6 → 0` | a first-time learner has no streak |

```bash
git checkout <pristine> -- assets/index-CswphSY3.js
python3 firstrun/patch-bundle.py
```

## Motion contract

One decelerate curve for entrances (`cubic-bezier(0.16, 1, 0.3, 1)`), one
accelerate for exits. Entrances run 30–50% longer than exits. Total stagger
stays under 500ms — the step is derived from the card count, not fixed. Nothing
animates on opacity alone.

## Four traps worth keeping

- **`backdrop-filter` dies under an ancestor with `will-change`, `filter` or
  `mask`.** The blur layer is a *sibling* of the card stage; the rail's edge-fade
  mask sits on a wrapper, one level above the scroller that holds the glass.
- **Only the arbitrary values Sanjay used exist in his CSS.** `text-[74px]`,
  `p-[26px]`, `leading-[1.06]` are absent — a missing class fails silently and a
  heading renders at body size. Ours are defined in `firstrun-shell.css`.
- **A flex column will stretch to its scroller's content.** Without `min-width: 0`
  on every ancestor, the card row pushed the stage to 4492px in a 1280px viewport
  and carried the header chip and CTA off screen.
- **His tether only tracks for a moment after a map transform.** Reveal the card
  *inside* the camera flight, not after it settles, or his tracker has already
  given up and no line is ever drawn.
- **An inline SVG is not a standalone SVG.** These logos were authored for inline
  injection, where the HTML parser supplies the namespace, so most omit `xmlns`.
  Dropped into `<img src="data:image/svg+xml…">` they are documents, and without
  the namespace they fail silently — `complete` true, `naturalWidth` 0, broken
  glyph. `patch-bundle.py` injects it.
- **A clip line severs SHADOWS, not just corners — and that is what a stray
  "crop" band usually is.** `overflow-x: auto` forces the cross axis to clip.
  Two separate things were being cut at that line: the group's 54px corner
  radius when its box sat flush to it, and — the one that survived the first
  fix — each card's `CARD_SURFACE` shadow, `0 44px 90px -24px`, which falls
  **65px** below the card. With only 34px of room the shadow was guillotined
  mid-falloff: darkened above the line, abruptly clean below, full width. The
  scroller now bleeds (`padding: 80px … 96px` with `margin: -66px 0 -78px`) so
  the shadow finishes inside the clip box while the layout contributes exactly
  the same space as before. Measure `cardBottom → clipLine ≥ shadow extent`
  before believing a band is fixed.
- **Kill fixed card heights in every rule, including the media query.** The base
  rule lost `height: 54vh` but `@media (max-height: 820px)` still set `56vh`, so
  every card measured exactly 403px and the last line of "you hand in" stayed
  shaved. Heights are auto; `align-items: stretch` evens them per group.
