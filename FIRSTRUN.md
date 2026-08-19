# Zero — first run (a variation on Sanjay's nav lab)

**Live:** https://design706.github.io/zero-nav-lab/

This is **Sanjay's `zero-nav-lab` build**, plus one folder (`firstrun/`), three
lines in `index.html`, and a scripted patch to his bundle's fixtures. None of his
components were rewritten — the flow drives them.

## The flow

**Welcome to Zero, Ada.** → *Next* → **Your journey**, twelve weeks as horizontal
glass cards → *Next…* → *Let's begin* → the card marks fly into the dock, the
world comes back into focus, the camera drops into week one, and his scenario
card and tether land on it.

The world map is **blurred, not hidden**, from the first frame. A modal is
something you dismiss and the world behind it is scenery; blurring the actual
world says you are already inside this place, it is just not in focus yet. Which
is why the last beat *unblurs* rather than closing anything.

## One dataset

The journey is the **onboarding roadmap** — 8 briefs, 12 weeks, named managers,
tools, "you hand in", with the portfolio unlock where the onboarding authors it
(inside week 3) and the job portal as the finale.

That data is not duplicated in the overlay. `firstrun/patch-bundle.py` writes it
into the bundle's own `businessAnalystRoadmap` fixture, so **his** dock, **his**
scenario card, **his** tether and **his** camera all read the same eight stops.
The dock reads `Week 1 · Stripe … Weeks 11-12 · Amplitude`; the card reads
`POSITION 1 of 8`. Cards and navigation cannot drift, because they are the same
list.

## What the patch does, and why

Sanjay's source was never pushed — the repo is build output with no sourcemaps —
so driving his components means editing the fixtures they read. Every target is
asserted unique before replacement and the script refuses to run twice.

| Patch | Why |
|---|---|
| `businessAnalystRoadmap` replaced | the onboarding journey becomes the product's journey |
| `completedCount: 0` | the single progress input; makes brief 1 current and the rest locked — the genuine first-time-user dock |
| `CURRENT_SEQUENCE 6 → 1` | a second, independent fixture feeding the user store; without it the screen disagrees with itself |
| `afterCategories 5 → 8` | Job Portal is the finale of eight categories |
| `COMPANY_LOGOS` + 3 | DoorDash, Salesforce and Amplitude are not in his map, and a company with no logo renders as a blank chip |
| `window.__navlab` | `flyToCompany` / `releaseCamera` are module-scoped with no bridge; the overlay cannot move the camera without it |
| `streak 6 → 0` | a first-time learner has no streak |

Re-run after restoring the bundle from git:

```bash
python3 firstrun/patch-bundle.py
```

## Files

| File | What |
|---|---|
| `firstrun/patch-bundle.py` | the fixture patch, idempotent and self-verifying |
| `firstrun/roadmap-data.js` | CURRICULUM / MFACE / ZFR_LOGO / RM_FINALE, lifted verbatim from `zero-onboarding-mvp.html` |
| `firstrun/firstrun.js` | the four beats and the morph |
| `firstrun/firstrun-shell.css` | layout, the blur, the reveal choreography — the only authored styles |

Card and chip appearance reuses the classes already compiled into his stylesheet
(`rounded-[42px]`, `font-stk-bureau-serif`, `bg-white/10`, his glass
`CARD_SURFACE`) so a journey card and his scenario card are the same object.

## Two gotchas worth keeping

- **Only the arbitrary values Sanjay used exist in his CSS.** Tailwind emits what
  it sees, so `text-[74px]`, `p-[26px]` and `leading-[1.06]` are absent — a class
  that does not exist fails silently and a heading renders at body size. The four
  sizes this flow needs are defined in `firstrun-shell.css` instead.
- **`backdrop-filter` dies under an ancestor with `will-change` or `filter`.** The
  blur layer is therefore a *sibling* of the card stage, never its parent, and
  nothing on the path to a card gets a `will-change` hint.
