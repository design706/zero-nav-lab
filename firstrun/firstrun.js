/**
 * Zero — first run. A VARIATION ON SANJAY'S NAV LAB, not a rebuild of it.
 *
 * Everything the learner ends up looking at is his: the world map, the HUD, the
 * scenario card, the tether line and the capsule dock. This file adds four
 * beats on top and then deletes itself.
 *
 * The journey data is the onboarding roadmap (8 briefs / 12 weeks). It is NOT
 * duplicated here — `patch-bundle.py` writes it into the bundle's own
 * `businessAnalystRoadmap` fixture, so his dock, his card, his tether and his
 * camera all read the same eight stops this overlay shows. One dataset, one
 * order, no seam between the roadmap and what it becomes.
 *
 * ── The four beats ─────────────────────────────────────────────────────────
 *   1  welcome   world blurred and zoomed out, learner greeted by name
 *   2  journey   same blurred world, the 12 weeks as horizontal glass cards
 *   3  morph     card marks fly into the dock; the world unblurs and the
 *                camera flies down into week one
 *   4  settled   overlay removed; his screen, in its first-time-user state
 *
 * ── Why a blurred world rather than a modal ───────────────────────────────
 * A modal is something you dismiss, and the world behind it is scenery.
 * Blurring the actual world says the opposite: you are already inside this
 * place, it is just not in focus yet. Which is why beat 3 unblurs rather than
 * closing anything — there was never a surface to close.
 *
 * ── Glass rules, inherited from the product source ────────────────────────
 * `backdrop-filter` is blanked by any ancestor owning `will-change` or
 * `filter`. So: the blur layer is a SIBLING of the card stage, never its
 * parent; nothing on the path to a card gets `will-change`; and entrances
 * animate the stage as a unit rather than filtering individual cards.
 */
(function () {
  'use strict';

  var DOCK = 'nav[aria-label$="timeline"]';
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The build's fixture learner. Hardcoded because the bundle's own value is a
     frozen literal with no runtime handle — it cannot disagree with itself. */
  var LEARNER = 'Ada';

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

  /* Week labels derived exactly as patch-bundle.py derives them, so a card and
     its dock cluster always say the same thing. */
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
    var el = mk('div', 'zfr-card relative flex flex-col overflow-hidden rounded-[42px] gap-[18px] shrink-0');
    el.setAttribute('style', CARD_SURFACE);

    var head = mk('div', 'flex items-center gap-[12px] shrink-0');
    var plate = mk('span', 'grid size-[46px] shrink-0 place-items-center overflow-hidden rounded-full');
    plate.setAttribute('style', 'background:rgba(255,255,255,0.94)');
    plate.innerHTML = ZFR_LOGO[c.co] || '';
    sizeSvg(plate, '26');
    head.appendChild(plate);
    var heads = mk('span', 'flex flex-col gap-[2px]');
    heads.appendChild(mk('span', 'font-pp-supply-mono text-[15px] uppercase tracking-[0.08em] text-white/70', c.co));
    heads.appendChild(mk('span', 'font-pp-supply-mono text-[13px] uppercase tracking-[0.08em] text-white/35', w.label));
    head.appendChild(heads);
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
       and an empty grey disc reads as a broken image — the onboarding does the
       same initial-behind-portrait trick for exactly this reason. */
    av.innerHTML =
      '<span class="font-google-sans-flex text-[13px] text-white/70">' + esc(c.mgr[0].charAt(0)) + '</span>' +
      (MFACE[c.mgr[0]]
        ? '<img src="' + MFACE[c.mgr[0]] + '" alt="" class="size-full object-cover" onerror="this.remove()">'
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
    var el = mk('div', 'zfr-card zfr-card-unlock relative flex flex-col justify-center overflow-hidden rounded-[42px] gap-[18px] shrink-0');
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
     After the bundle patch the dock has exactly one cluster per brief in the
     same order, so this is a straight 1:1 zip rather than an approximation. */
  function dockTargets(dock) {
    var kids = [].slice.call(dock.firstElementChild.children);
    var pills = kids.filter(function (k) { return k.tagName === 'BUTTON'; });
    var find = function (re) {
      return pills.filter(function (p) { return re.test(p.getAttribute('aria-label') || ''); })[0];
    };
    return {
      clusters: kids.filter(function (k) { return k.tagName === 'DIV'; }),
      portfolio: find(/portfolio/i),
      jobportal: find(/job/i)
    };
  }

  function centre(el) {
    var b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
  }

  /* A cloned mark flown from a card to its place on the dock. Cloned so the
     card can keep dissolving behind it, and portalled to <body> so no ancestor
     clip or transform can cut the path short. */
  function fly(sourceEl, targetEl, delay) {
    if (!sourceEl || !targetEl) return;
    var a = centre(sourceEl), b = centre(targetEl);
    if (!a.w || !b.w) return;
    var clone = sourceEl.cloneNode(true);
    clone.style.cssText += ';position:fixed;left:' + (a.x - a.w / 2) + 'px;top:' + (a.y - a.h / 2) +
      'px;width:' + a.w + 'px;height:' + a.h + 'px;margin:0;z-index:100000;pointer-events:none;';
    document.body.appendChild(clone);
    var scale = Math.max(0.32, Math.min(1, (b.h || 26) / (a.h || 46)));
    clone.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px) scale(' + scale + ')', opacity: 0.95 }
    ], {
      duration: REDUCE ? 0 : 780, delay: REDUCE ? 0 : delay,
      easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards'
    }).onfinish = function () {
      clone.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: REDUCE ? 0 : 200, fill: 'forwards' })
        .onfinish = function () { clone.remove(); };
    };
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

    var scroller = mk('div', 'zfr-scroller');
    scroller.id = 'zfrScroller';
    weeks().forEach(function (w) {
      var card = briefCard(w);
      scroller.appendChild(card);
      cards.push({ el: card, kind: 'co' });
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
    wrap.appendChild(scroller);
    return wrap;
  }

  function scroller() { return document.getElementById('zfrScroller'); }
  /* Set once a page() produces no movement. Measurement alone is not enough to
     decide "there is no more journey": if every card already fits on screen
     there is nothing to scroll, and on a viewport that reports oddly the
     arithmetic can never reach its own threshold. Either way the CTA must
     still become "Let's begin" — a Next button that does nothing is a dead
     end with no way out of the flow. */
  var exhausted = false;

  function atEnd() {
    var sc = scroller();
    if (!sc) return true;
    if (exhausted) return true;
    if (sc.scrollWidth <= sc.clientWidth + 1) return true;   // nothing to page
    return sc.scrollLeft >= sc.scrollWidth - sc.clientWidth - 48;
  }
  /* Scroll is tweened by hand rather than with `behavior:'smooth'`.
     Chrome cancels a programmatic smooth scroll whenever scroll-snap is in
     play, which left the pager stuck on the first page — setting scrollLeft
     each frame is immune to that and gives the same easing. */
  function page() {
    var sc = scroller();
    if (!sc) return Promise.resolve();
    var max = sc.scrollWidth - sc.clientWidth;
    var from = sc.scrollLeft;
    var to = Math.max(0, Math.min(from + Math.max(320, sc.clientWidth * 0.86), max));
    if (to <= from + 1) { exhausted = true; return Promise.resolve(); }
    if (REDUCE) { sc.scrollLeft = to; return Promise.resolve(); }
    return new Promise(function (done) {
      var t0 = performance.now(), dur = 520;
      (function step(now) {
        var t = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - t, 4);            // quartic out, matches the flow
        sc.scrollLeft = from + (to - from) * e;
        if (t < 1) requestAnimationFrame(step);
        else { if (Math.abs(sc.scrollLeft - from) < 2) exhausted = true; done(); }
      })(t0);
    });
  }

  async function morph(dock) {
    setBeat('morph');
    var t = dockTargets(dock);

    /* 1. The marks fly. One brief, one cluster — the dock carries the same
          eight stops, so nothing has to be approximated. */
    var co = cards.filter(function (c) { return c.kind === 'co'; });
    co.forEach(function (c, i) { fly(c.el._logo, t.clusters[i], i * 52); });
    var pf = cards.filter(function (c) { return c.kind === 'portfolio'; })[0];
    var jp = cards.filter(function (c) { return c.kind === 'jobportal'; })[0];
    if (pf) fly(pf.el._logo, t.portfolio, co.length * 52);
    if (jp) fly(jp.el._logo, t.jobportal, co.length * 52 + 80);

    /* 2. The cards leave while the marks are still travelling, so the dock is
          what they arrive onto rather than what replaces them. */
    stage.classList.add('zfr-out');
    await wait(260);

    /* 3. The world comes back into focus. */
    setBeat('unblur');
    await wait(600);

    /* 4. …and the camera drops into week one. His animator: a 1s cinematic
          quintic that dips the zoom mid-flight. The tether and the scenario
          card are his too — they were only hidden, and they re-key on arrival. */
    try {
      if (window.__navlab && window.__navlab.flyToCompany) window.__navlab.flyToCompany(CURRICULUM[0].co);
    } catch (e) { /* a missing map marker must never strand the flow */ }
    await wait(500);

    setBeat('settled');
    await wait(950);
    root.remove();
    delete document.documentElement.dataset.zfrBeat;
  }

  async function boot() {
    var dock = await waitForDock(40000);
    if (!dock) return;                    // no dock, no flow — leave his lab alone

    root = mk('div'); root.id = 'zfr';
    /* Geometry inline and MEASURED, not `100vw/100vh`.
     *
     * Two problems with viewport units here. His bundle paints inside a
     * transformed wrapper, which becomes the containing block for any
     * `position: fixed` descendant, so `inset: 0` cannot be trusted on its own.
     * And a `vw`/`vh` box is resolved once at boot — if the window is resized,
     * or the tab is restored from a background state where the viewport
     * momentarily reads small, the overlay keeps the stale size forever and
     * renders as a box in the corner.
     *
     * `documentElement.clientWidth/Height` is the honest number, and re-reading
     * it on resize keeps the flow full-bleed for the whole session. */
    var fit = function () {
      var d = document.documentElement;
      root.style.width = (window.innerWidth || d.clientWidth) + 'px';
      root.style.height = (window.innerHeight || d.clientHeight) + 'px';
    };
    root.style.cssText =
      'position:fixed;top:0;left:0;z-index:9000;display:grid;place-items:center;';
    fit();
    addEventListener('resize', fit);

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
    w.appendChild(mk('span', 'font-pp-supply-mono text-[14px] uppercase tracking-[0.18em] text-white/55', 'WELCOME TO ZERO'));
    w.appendChild(mk('h1', 'zfr-h1 font-stk-bureau-serif tracking-[-0.02em] text-white',
      'Welcome to Zero, ' + LEARNER + '.'));
    w.appendChild(mk('p', 'font-google-sans-flex text-[22px] leading-[1.4] text-white/70',
      "We've mapped out your journey."));
    var next1 = mk('button', 'zfr-cta', 'Next');
    w.appendChild(next1);
    stage.appendChild(w);
    setBeat('welcome');

    next1.onclick = function () {
      stage.innerHTML = '';
      stage.appendChild(buildJourney());
      var bar = mk('div', 'zfr-bar');
      var go = mk('button', 'zfr-cta', 'Next');
      bar.appendChild(go);
      stage.appendChild(bar);
      setBeat('journey');

      var sync = function () { go.textContent = atEnd() ? "Let's begin" : 'Next'; };
      var sc = scroller();
      if (sc) sc.addEventListener('scroll', sync, { passive: true });
      sync();

      go.onclick = function () {
        if (atEnd()) morph(dock);
        else page().then(sync);
      };
    };
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
