/**
 * Zero — first run. A VARIATION ON SANJAY'S NAV LAB, not a rebuild of it.
 *
 * Everything the learner ends up looking at is his: the world map, the HUD, the
 * scenario card, the tether line and the capsule dock. This file adds four
 * beats on top and then deletes itself.
 *
 * The journey data is the onboarding roadmap (8 briefs / 12 weeks). It is NOT
 * duplicated here — `patch-bundle.py` writes it into the bundle's own
 * `businessAnalystRoadmap` fixture, grouped by the product's four categories.
 * WEEKS BELONG TO THE ROADMAP, CATEGORIES BELONG TO THE NAVIGATION: a card says
 * "Week 1" and "Growth & Revenue Optimization"; the dock groups by the second.
 * The learner meets their twelve weeks in onboarding, then recognises the same
 * work in the app organised the way the product organises it.
 *
 * ── The beats ──────────────────────────────────────────────────────────────
 *   1  welcome   land on the SHARP world, blur it, then the words arrive
 *   2  journey   the twelve weeks as glass cards, staggered in left to right
 *   3  morph     each card's mark flies onto its own chip as the dock rises
 *   4  settled   zoom to week one, THEN the card, THEN the line
 *
 * ── Motion contract ────────────────────────────────────────────────────────
 * One decelerate curve for entrances, one accelerate for exits; entrances run
 * 30-50% longer than exits, because people care about what appears. Total
 * stagger never exceeds 500ms. Nothing moves on opacity alone — every fade is
 * carried by a transform. No `filter` or `will-change` anywhere on the path to
 * a glass card, or its backdrop-filter is blanked and the glass reads flat.
 */
(function () {
  'use strict';

  var DOCK = 'nav[aria-label$="timeline"]';
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The build's fixture learner. Hardcoded because the bundle's own value is a
     frozen literal with no runtime handle — it cannot disagree with itself. */
  var LEARNER = 'Ada';

  /* Entrances decelerate, exits accelerate. Used everywhere, including in CSS. */
  var EASE_IN = 'cubic-bezier(0.16, 1, 0.3, 1)';

  /* His card's glass, verbatim from CARD_SURFACE in the bundle. Inline because
     it is inline there too — there is no Tailwind class for this blur. */
  var CARD_SURFACE =
    'background:rgba(0,0,0,0.5);' +
    'backdrop-filter:blur(16px) saturate(1.1);' +
    '-webkit-backdrop-filter:blur(16px) saturate(1.1);' +
    'box-shadow:0 44px 90px -24px rgba(0,0,0,0.5);';

  function mk(tag, cls, txt) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, REDUCE ? 0 : ms); }); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function sizeSvg(host, px) {
    var s = host.querySelector('svg');
    if (s) { s.setAttribute('width', px); s.setAttribute('height', px); s.style.display = 'block'; }
  }

  /* His dock mounts only after the map and fixtures resolve. Without it there
     is nothing to morph into, so the flow stays out of the way entirely. */
  function waitForDock(timeout) {
    var t0 = Date.now();
    return new Promise(function (resolve) {
      (function poll() {
        var el = document.querySelector(DOCK);
        if (el && el.getBoundingClientRect().width > 0) return resolve(el);
        if (Date.now() - t0 > timeout) return resolve(null);
        setTimeout(poll, 250);
      })();
    });
  }

  /* ── The journey ──────────────────────────────────────────────────────────
     Week labels derived here; category read from the patched fixture so the
     card and its dock cluster can never name the work differently. */
  /* Company -> category title, read from THE SAME roadmap object the dock
     groups by (exposed on `window.__navlab` by patch-bundle.py). A copy of the
     mapping here could drift from the fixture; a reference cannot. Populated
     lazily because the bundle defines it after this script parses. */
  var CATEGORY_OF = null;
  function categoryOf(company) {
    if (!CATEGORY_OF) {
      CATEGORY_OF = {};
      try {
        var rm = window.__navlab && window.__navlab.roadmap;
        (rm && rm.categories || []).forEach(function (cat) {
          (cat.scenarios || []).forEach(function (sc) {
            if (sc.company && sc.company.name) CATEGORY_OF[sc.company.name] = cat.title;
          });
        });
      } catch (e) { /* shape changed — cards simply omit the category chip */ }
    }
    return CATEGORY_OF[company];
  }

  function weeks() {
    var out = [], wk = 1;
    CURRICULUM.forEach(function (c, i) {
      var w0 = wk, w1 = wk + c.weeks - 1; wk += c.weeks;
      out.push({ c: c, seq: i + 1, label: w0 === w1 ? 'Week ' + w0 : 'Weeks ' + w0 + '–' + w1 });
    });
    return out;
  }
  var TOTAL_WEEKS = CURRICULUM.reduce(function (a, c) { return a + c.weeks; }, 0);

  /* ── Cards ────────────────────────────────────────────────────────────────
     Class strings are his, already compiled into his stylesheet — reused so a
     journey card and the scenario card are visibly the same object. */
  function briefCard(w) {
    var c = w.c;
    var el = mk('div', 'zfr-card relative flex flex-col overflow-hidden rounded-[42px] gap-[16px] shrink-0');
    el.setAttribute('style', CARD_SURFACE);

    /* Header: the company and its week on the left, the category on the right.
       Both vocabularies on one card is the point — this is the week you were
       promised AND the kind of work it counts as. */
    var head = mk('div', 'flex items-start justify-between gap-[12px] shrink-0');
    var who = mk('div', 'flex items-center gap-[12px] min-w-0');
    var plate = mk('span', 'grid size-[46px] shrink-0 place-items-center overflow-hidden rounded-full');
    plate.setAttribute('style', 'background:rgba(255,255,255,0.94)');
    plate.innerHTML = ZFR_LOGO[c.co] || '';
    sizeSvg(plate, '26');
    who.appendChild(plate);
    var heads = mk('span', 'flex flex-col gap-[2px] min-w-0');
    heads.appendChild(mk('span', 'font-pp-supply-mono text-[15px] uppercase tracking-[0.08em] text-white/70', c.co));
    heads.appendChild(mk('span', 'font-pp-supply-mono text-[13px] uppercase tracking-[0.08em] text-white/35', w.label));
    who.appendChild(heads);
    head.appendChild(who);

    var cat = categoryOf(c.co);
    if (cat) {
      var catChip = mk('span', 'zfr-cat shrink-0 rounded-full bg-white/10 px-[11px] py-[6px] font-pp-supply-mono text-[11px] uppercase tracking-[0.08em] text-white/50', cat);
      head.appendChild(catChip);
    }
    el.appendChild(head);
    el._logo = plate;

    /* The brief itself, in the display serif at card scale. */
    el.appendChild(mk('div', 'zfr-brief font-stk-bureau-serif tracking-[-0.02em] text-white/95', c.prob));

    el.appendChild(mk('div', 'h-px w-full shrink-0 bg-white/12'));

    /* Who you work with — the onboarding's manager, with their face. */
    var mgr = mk('div', 'flex items-center gap-[10px] shrink-0');
    var av = mk('span', 'zfr-av grid size-[30px] shrink-0 place-items-center overflow-hidden rounded-full');
    av.setAttribute('style', 'background:rgba(255,255,255,0.14)');
    /* Initial underneath, photo on top. `MFACE` only covers some of the cast,
       and an empty grey disc reads as a broken image. */
    av.innerHTML =
      '<span class="font-google-sans-flex text-[13px] text-white/70">' + esc(c.mgr[0].charAt(0)) + '</span>' +
      (MFACE[c.mgr[0]]
        ? '<img src="' + MFACE[c.mgr[0]] + '" alt="" onerror="this.remove()">'
        : '');
    mgr.appendChild(av);
    mgr.appendChild(mk('span', 'font-google-sans-flex text-[16px] text-white/80',
      'with ' + c.mgr[0] + ' · ' + c.mgr[1]));
    el.appendChild(mgr);

    /* Tools and skills, as his chips. */
    var chips = mk('div', 'flex flex-wrap gap-[7px]');
    c.tools.concat(c.skills).forEach(function (t) {
      var chip = mk('span', 'flex h-[32px] items-center gap-[7px] rounded-full bg-white/10 px-[13px] font-google-sans-flex text-[14px] text-white/85');
      if (ZFR_LOGO[t]) {
        var i = mk('span', 'grid size-[15px] shrink-0 place-items-center');
        i.innerHTML = ZFR_LOGO[t];
        sizeSvg(i, '15');
        chip.appendChild(i);
      }
      chip.appendChild(mk('span', null, t));
      chips.appendChild(chip);
    });
    el.appendChild(chips);

    /* What you walk away with. The onboarding's own phrasing. */
    var del = mk('div', 'mt-auto flex flex-col gap-[6px] shrink-0');
    del.appendChild(mk('span', 'font-pp-supply-mono text-[13px] uppercase tracking-[0.08em] text-white/45', 'You hand in'));
    del.appendChild(mk('span', 'font-google-sans-flex text-[16px] leading-[1.4] text-white/75', c.deliver));
    el.appendChild(del);

    return el;
  }

  /* The two unlocks. Rendered on his locked-CTA plate, which is exactly what
     they are: something that is not open yet. */
  function unlockCard(u, green) {
    var el = mk('div', 'zfr-card relative flex flex-col justify-center overflow-hidden rounded-[42px] gap-[16px] shrink-0');
    el.setAttribute('style', CARD_SURFACE);

    var mark = mk('span', 'grid size-[46px] shrink-0 place-items-center rounded-full text-[22px]');
    mark.setAttribute('style', green
      ? 'background:rgba(72,202,122,0.16);box-shadow:inset 0 0 0 1px rgba(72,202,122,0.42)'
      : 'background:rgba(255,255,255,0.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)');
    mark.textContent = u[0];
    el.appendChild(mark);
    el._logo = mark;

    el.appendChild(mk('div', 'zfr-brief font-stk-bureau-serif tracking-[-0.02em] text-white/95', u[1]));
    el.appendChild(mk('div', 'font-google-sans-flex text-[16px] leading-[1.4] text-white/70', u[2]));

    var plate = mk('div', 'mt-auto flex h-[58px] w-full shrink-0 items-center justify-center gap-[8px] rounded-[100px] bg-white/[0.08] px-[20px]');
    plate.appendChild(mk('span', 'text-center font-google-sans-flex text-[15px] text-white/55', 'Unlocks as you go'));
    el.appendChild(plate);
    return el;
  }

  /* ── Morph targets ────────────────────────────────────────────────────────
     Each brief flies to ITS OWN company chip, not to its cluster — the chips
     carry the logos, so a mark landing anywhere else would be landing on the
     wrong thing. His pills expose `aria-label="{title}, {company}"`. */
  function dockTargets(dock) {
    var kids = [].slice.call(dock.firstElementChild.children);
    var buttons = kids.filter(function (k) { return k.tagName === 'BUTTON'; });
    var milestone = function (re) {
      return buttons.filter(function (b) { return re.test(b.getAttribute('aria-label') || ''); })[0];
    };
    /* Company chips live inside the cluster DIVs. Matched on the aria-label's
       trailing company name so a title containing a comma cannot fool it. */
    var chipFor = function (company) {
      var hit = null;
      kids.filter(function (k) { return k.tagName === 'DIV'; }).forEach(function (cluster) {
        [].slice.call(cluster.querySelectorAll('[aria-label]')).forEach(function (el) {
          var label = el.getAttribute('aria-label') || '';
          if (!hit && new RegExp(',\\s*' + company + '\\s*$', 'i').test(label)) hit = el;
        });
      });
      return hit;
    };
    return { chipFor: chipFor, portfolio: milestone(/portfolio/i), jobportal: milestone(/job/i) };
  }

  function centre(el) {
    var b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
  }

  /**
   * Fly a card's mark onto its chip.
   *
   * The clone shrinks from the card's 46px plate to the chip's 26px mark, so
   * the start and end states are the same object at two sizes rather than two
   * different things crossing paths. It fades out over the last quarter of the
   * flight while the dock is fading in underneath — that overlap is what makes
   * it read as arriving rather than as a second copy sitting on top, which is
   * how the previous version failed.
   */
  function fly(sourceEl, targetEl, delay) {
    if (!sourceEl || !targetEl) return;
    var a = centre(sourceEl), b = centre(targetEl);
    if (!a.w || !b.w) return;
    var clone = sourceEl.cloneNode(true);
    clone.style.cssText += ';position:fixed;left:' + (a.x - a.w / 2) + 'px;top:' + (a.y - a.h / 2) +
      'px;width:' + a.w + 'px;height:' + a.h + 'px;margin:0;z-index:100000;pointer-events:none;';
    document.body.appendChild(clone);
    var scale = Math.max(0.3, Math.min(1, (b.h || 26) / (a.h || 46)));
    clone.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.75 },
      { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px) scale(' + scale + ')',
        opacity: 0, offset: 1 }
    ], {
      duration: REDUCE ? 0 : 720, delay: REDUCE ? 0 : delay,
      easing: EASE_IN, fill: 'forwards'
    }).onfinish = function () { clone.remove(); };
  }

  /* ── The flow ─────────────────────────────────────────────────────────────*/
  var root, blur, stage, cards = [];

  function setBeat(b) { root.dataset.beat = b; document.documentElement.dataset.zfrBeat = b; }

  function buildJourney() {
    var wrap = mk('div', 'zfr-journey');

    var head = mk('div', 'zfr-jhead');
    head.appendChild(mk('h2', 'zfr-h2 font-stk-bureau-serif tracking-[-0.02em] text-white', 'Your journey'));
    var chip = mk('span', 'flex h-[40px] shrink-0 items-center gap-[9px] rounded-full bg-white/10 px-[18px] font-pp-supply-mono text-[15px] uppercase tracking-[0.06em] text-white/80');
    chip.innerHTML = ZFR_CLOCK + '<span>' + TOTAL_WEEKS + ' weeks to build</span>';
    sizeSvg(chip, '15');
    head.appendChild(chip);
    wrap.appendChild(head);

    /* Full-bleed rail. The mask is applied to a WRAPPER, never to the scroller
       that holds the glass — a mask on an ancestor of a backdrop-filter element
       blanks its backdrop the same way `filter` does. */
    var rail = mk('div', 'zfr-rail');
    var scroller = mk('div', 'zfr-scroller');
    scroller.id = 'zfrScroller';

    weeks().forEach(function (w) {
      var card = briefCard(w);
      scroller.appendChild(card);
      cards.push({ el: card, kind: 'co', company: w.c.co });
      /* The portfolio unlock is authored INSIDE a brief in CURRICULUM, so it
         renders where the onboarding puts it — right after that week. */
      if (w.c.unlock) {
        var u = unlockCard(w.c.unlock, false);
        scroller.appendChild(u);
        cards.push({ el: u, kind: 'portfolio' });
      }
    });
    var fin = unlockCard(RM_FINALE, true);
    scroller.appendChild(fin);
    cards.push({ el: fin, kind: 'jobportal' });

    rail.appendChild(scroller);
    wrap.appendChild(rail);
    return wrap;
  }

  /* Stagger budget: 10 cards must finish arriving inside 500ms, so the step is
     derived from the count rather than fixed. */
  function staggerStep(n) { return Math.min(46, Math.floor(440 / Math.max(1, n))); }

  async function morph(dock) {
    setBeat('morph');
    var t = dockTargets(dock);
    var step = staggerStep(cards.length);

    /* 1. Header and CTA leave first — they have no counterpart on the dock, so
          holding them while the marks travel just adds noise. */
    stage.classList.add('zfr-chrome-out');
    await wait(140);

    /* 2. The marks fly, in journey order, while their cards sink away. The dock
          fades up underneath during the same window (CSS, keyed on the beat),
          so each mark lands on a chip that is already there. */
    stage.classList.add('zfr-cards-out');
    cards.forEach(function (c, i) {
      var target = c.kind === 'co' ? t.chipFor(c.company)
                 : c.kind === 'portfolio' ? t.portfolio : t.jobportal;
      fly(c.el._logo, target, i * step);
      c.el.style.transitionDelay = (i * step) + 'ms';
    });

    await wait(step * cards.length + 420);

    /* 3. Only now does the world come back into focus. Dock first, world
          second: the navigation has to visibly exist before the map sharpens,
          or the unblur steals the moment the morph just earned. */
    setBeat('unblur');
    await wait(700);

    /* 4. Landing, strictly in order. His camera animator runs ~1s. */
    try {
      if (window.__navlab && window.__navlab.flyToCompany) window.__navlab.flyToCompany(CURRICULUM[0].co);
    } catch (e) { /* a missing map marker must never strand the flow */ }

    /* 5. The card arrives while the city is still settling — not after it has
          stopped. That is deliberate and load-bearing: his `BuildingLink` only
          tracks for a short window after a map transform, so a card revealed
          once everything is still finds a tracker that has already given up,
          and no line is ever drawn. Landing it inside the flight keeps his
          tracker live, and it also reads better — the card arrives with the
          city rather than after an empty pause. */
    await wait(620);
    setBeat('card');
    await wait(520);

    /* 6. …and only then does the line reach out and attach to it. */
    setBeat('settled');
    await wait(REDUCE ? 0 : 900);

    root.remove();
    delete document.documentElement.dataset.zfrBeat;
    releaseChrome();
  }

  /**
   * Hand his chrome back, and make sure nothing was left mid-entrance.
   *
   * The scenario card is a framer element whose `initial` is
   * `opacity: 0; transform: translateY(14px) scale(0.97)`. While this flow holds
   * it hidden, that entrance can end up never running — and once our rules are
   * removed the inline `initial` is all that is left, so the card stays
   * invisible on a screen that has no flow on it any more. Its tether then
   * hides itself too, because his tracking will not draw a line to a card it
   * does not consider present.
   *
   * So this checks rather than assumes: if the card is still transparent a beat
   * after we let go, finish the entrance ourselves. It is a no-op on every
   * normal run — which is exactly when a repair should do nothing.
   */
  function releaseChrome() {
    setTimeout(function () {
      var slot = document.querySelector('div[class*="right-[90px]"][class*="z-30"]');
      if (!slot) return;
      if (parseFloat(getComputedStyle(slot).opacity || '1') > 0.9) return;
      slot.style.opacity = '1';
      slot.style.transform = 'none';
    }, 120);
  }

  async function boot() {
    var dock = await waitForDock(40000);
    if (!dock) return;                    // no dock, no flow — leave his lab alone

    root = mk('div'); root.id = 'zfr';
    /* `inset: 0`, not a measured or `100vw/100vh` box.
     *
     * A viewport-unit box is resolved ONCE, so a resize — or a tab that reports
     * a stale viewport while it is being restored — leaves the overlay frozen
     * at the wrong size, rendering as a panel in the corner. `inset: 0` is
     * re-resolved by the engine on every layout, so it cannot go stale.
     *
     * It is safe here specifically because `html` and `body` carry no
     * transform: the transformed wrapper his bundle paints inside is deeper in
     * the tree, so it never becomes the containing block for this element. */
    root.style.cssText =
      'position:fixed;inset:0;z-index:9000;display:grid;place-items:center;';

    /* SIBLING of the stage, never its parent — an ancestor owning
       backdrop-filter blanks the backdrop of every glass card inside it. */
    blur = mk('div', 'zfr-blur');
    stage = mk('div', 'zfr-stage');
    root.appendChild(blur);
    root.appendChild(stage);
    document.body.appendChild(root);

    /* Start where a first-time learner starts: the whole world in frame. */
    try { if (window.__navlab && window.__navlab.releaseCamera) window.__navlab.releaseCamera(); } catch (e) {}

    var w = mk('div', 'zfr-welcome');
    /* No eyebrow. "WELCOME TO ZERO" above "Welcome to Zero, Ada." said the same
       thing twice, and the headline says it better. */
    w.appendChild(mk('h1', 'zfr-h1 font-stk-bureau-serif tracking-[-0.02em] text-white',
      'Welcome to Zero, ' + LEARNER + '.'));
    w.appendChild(mk('p', 'font-google-sans-flex text-[22px] leading-[1.4] text-white/70',
      "We've mapped out your journey."));
    var next1 = mk('button', 'zfr-cta', 'Next');
    w.appendChild(next1);
    stage.appendChild(w);

    /* The blur is an EVENT, not a backdrop. The learner lands on the sharp
       world they just downloaded, watches it soften, and only then is spoken
       to — arriving somewhere, rather than finding a screen already over it. */
    setBeat('sharp');
    await wait(520);
    setBeat('welcome');

    next1.onclick = function () {
      /* Welcome leaves before the journey arrives — never a crossfade, or the
         two states smear through each other. */
      stage.classList.add('zfr-swap');
      setTimeout(function () {
        stage.classList.remove('zfr-swap');
        stage.innerHTML = '';
        stage.appendChild(buildJourney());
        var bar = mk('div', 'zfr-bar');
        /* One CTA, and it is the last one. The rail scrolls; a Next button that
           pages a scroller is a worse scrollbar. */
        var go = mk('button', 'zfr-cta', "Let's begin");
        bar.appendChild(go);
        stage.appendChild(bar);
        setBeat('journey');

        var step = staggerStep(cards.length);
        cards.forEach(function (c, i) { c.el.style.animationDelay = (120 + i * step) + 'ms'; });

        go.onclick = function () { morph(dock); };
      }, REDUCE ? 0 : 260);
    };
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
