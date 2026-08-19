# Zero — first run (a variation on Sanjay's nav lab)

**Live:** https://design706.github.io/zero-nav-lab/

Sanjay's `zero-nav-lab` build, plus one folder (`firstrun/`), three lines in
`index.html`, and a scripted patch to his bundle's fixtures. None of his
components were rewritten — the flow drives them.

## The beats

| | |
|---|---|
| **1 · welcome** | Lands on the **sharp** world, blurs it, *then* speaks. "Welcome to Zero, Ada." / "We've mapped out your journey." / **Next** |
| **2 · journey** | The twelve weeks as glass cards, staggered in left→right on a full-bleed rail with fading edges. Free scroll. One CTA: **Let's begin** |
| **3 · morph** | Each card's mark flies onto **its own** dock chip while the dock fades up underneath, then the world comes back into focus |
| **4 · landing** | Camera flies into week one's building → the card lands as the city settles → his tether draws the line |

The blur is an *event*, not a backdrop: a modal is something you dismiss, and
the world behind it is scenery. Blurring the actual world says you are already
inside this place, it is just not in focus yet — which is why the last beat
unblurs rather than closing anything.

## Weeks belong to the roadmap. Categories belong to the navigation.

A card says **Week 1** *and* **Growth & Revenue Optimization**. The dock groups
by the second, using the product's own four category ids and titles. The learner
meets their twelve weeks in onboarding, then recognises the same work in the app
organised the way the product organises it.

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
