/* Believers Choice Ministries: motion layer.
   Lenis smooth scroll + GSAP ScrollTrigger, driving the 3D scene (js/scene.js) and the page choreography.
   Everything degrades: no JS/WebGL/GSAP, or reduced motion, gives the plain, fully readable site. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  if (typeof SplitText !== 'undefined') gsap.registerPlugin(SplitText);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var GL = window.BCMScene, S = GL && GL.supported ? GL.state : null;
  var narrow = function () { return innerWidth <= 1000; };
  var ctx = null, lenis = null, first = true, mood = null;

  /* ---------- scene presets ---------- */
  function presets() {
    var n = narrow();
    return {
      calm:   { ax: n ? 0.55 : 0.8, ay: 0.02, cs: n ? 0.5 : 0.62, cz: 0, cop: n ? 0.3 : 0.55, ry: 0, rays: 0.16, flare: 0.22, ring: 0.8, bloom: 0.8, motes: 0.25, moteSpeed: 1, flash: 0, light: 1, sway: 1, tilt: 1 },
      glow:   { ax: n ? 0.5 : 0.72, ay: 0, cs: n ? 0.55 : 0.8, cz: 0, cop: n ? 0.28 : 0.5, rays: 0.3, flare: 0.4, ring: 1, bloom: 1, motes: 0.3, moteSpeed: 1.2, flash: 0, light: 1, sway: 1, tilt: 1 },
      finale: { ax: 0, ay: 0.05, cs: n ? 0.85 : 1.0, cz: 0, cop: 0.5, rays: 0.5, flare: 0.25, ring: 1, bloom: 1.15, motes: 0.35, moteSpeed: 1.8, flash: 0, light: 1, sway: 1, tilt: 1 },
      sub:    { ax: n ? 0.55 : 0.82, ay: 0.0, cs: n ? 0.45 : 0.56, cz: 0, cop: n ? 0.14 : 0.26, rays: 0.1, flare: 0.2, ring: 0.7, bloom: 0.75, motes: 0.35, moteSpeed: 1, flash: 0, light: 1, sway: 1, tilt: 1 }
    };
  }
  function setScene(name, dur) {
    if (!S) return;
    var p = presets()[name]; if (!p) return;
    gsap.to(S, Object.assign({ duration: dur == null ? 1.6 : dur, ease: 'power2.inOut', overwrite: 'auto' }, p));
  }
  function jumpScene(name) { if (!S) return; Object.assign(S, presets()[name]); }

  /* ---------- smooth scroll ---------- */
  if (!reduce && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', function (e) { ScrollTrigger.update(); if (GL) GL.velocity = e.velocity; bar(); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    var menu = $('#menu');
    if (menu) new MutationObserver(function () { menu.classList.contains('open') ? lenis.stop() : lenis.start(); }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  } else {
    addEventListener('scroll', bar, { passive: true });
  }
  function bar() {
    var h = document.documentElement.scrollHeight - innerHeight;
    var p = $('#prog'); if (p) p.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
  }

  /* ---------- per-page choreography ---------- */
  function build(page) {
    if (ctx) ctx.revert();
    var pg = $('.page.show'); if (!pg) return;
    root.classList.toggle('motion', !reduce);
    if (reduce) { if (GL && GL.renderOnce) { jumpScene('calm'); GL.renderOnce(); } return; }
    ctx = gsap.context(function () {
      var mm = presets();

      /* hero intro: pinned cross fly-through */
      var intro = $('.intro', pg);
      if (intro && S) {
        var title = $('.i-h', intro), cue = $('.i-cue', intro);
        Object.assign(S, { ax: 0, ay: narrow() ? 0.35 : 0.3, cs: narrow() ? 0.55 : 0.66, cz: 0, cop: 1, ry: 0, rays: 0.55, flare: 0.3, ring: 1, bloom: 0.7, motes: 0.5, moteSpeed: 1, flash: 0, sway: 0, tilt: 0 });
        var tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: intro, start: 'top top', end: '+=150%', pin: true, scrub: 0.6, anticipatePin: 1 }
        });
        tl.fromTo([cue], { opacity: 1, y: 0 }, { opacity: 0, y: -30, duration: 0.18 }, 0)
          .fromTo(title, { scale: 1, opacity: 1, y: 0, letterSpacing: '0em' }, { scale: 1.5, opacity: 0, letterSpacing: '0.2em', duration: 0.4 }, 0.04)
          .to(S, { cz: 6.3, ry: Math.PI * 2, rays: 1.1, bloom: 1.1, moteSpeed: 4, duration: 0.7, ease: 'power2.in' }, 0)
          .to(S, { ay: 0.04, duration: 0.5, ease: 'power1.inOut' }, 0)
          .to(S, { flash: 1, duration: 0.14, ease: 'power1.in' }, 0.62)
          .to(S, { cz: 0, cop: mm.calm.cop, cs: mm.calm.cs, ax: mm.calm.ax, ay: mm.calm.ay, ry: 0, rays: mm.calm.rays, flare: mm.calm.flare, moteSpeed: 1, sway: 1, tilt: 1, duration: 0.01 }, 0.78)
          .to(S, { flash: 0, duration: 0.22, ease: 'power2.out' }, 0.78);
      } else if (S) {
        jumpScene(page === 'home' ? 'calm' : 'sub');
      }

      /* scene mood by section */
      $$('.sec.navy, .cta, [data-cta]', pg).forEach(function (el) {
        var name = el.matches('.cta, [data-cta]') ? 'finale' : 'glow';
        ScrollTrigger.create({ trigger: el, start: 'top 60%', end: name === 'finale' ? '+=99999' : 'bottom 40%',
          onToggle: function (self) {
            if (self.isActive) { mood = name; setScene(name); }
            else if (mood === name) { mood = null; setScene(page === 'home' ? 'calm' : 'sub'); }
          } });
      });

      /* headlines: masked line reveal */
      if (typeof SplitText !== 'undefined') {
        $$('.h2.rv, .phero h1.rv', pg).forEach(function (h) {
          if (h.classList.contains('shine') || h.querySelector('.shine')) return;
          h.classList.add('in');
          SplitText.create(h, {
            type: 'lines', mask: 'lines', autoSplit: true,
            onSplit: function (self) {
              return gsap.from(self.lines, { yPercent: 115, rotate: 2, duration: 1.1, stagger: 0.1, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
            }
          });
        });
      }

      /* image reveals */
      $$('.lit', pg).forEach(function (el) {
        gsap.fromTo(el, { clipPath: 'inset(12% 9% 12% 9% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 4px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 50%', scrub: 0.6 } });
      });

      /* counters */
      $$('.facts b', pg).forEach(function (b) {
        var m = /^(\d+)(\D*)$/.exec(b.textContent.trim()); if (!m) return;
        var end = +m[1], suf = m[2], o = { v: 0 };
        b.textContent = '0' + suf;
        ScrollTrigger.create({ trigger: b, start: 'top 90%', once: true, onEnter: function () { gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: function () { b.textContent = Math.round(o.v) + suf; } }); } });
      });

      /* horizontal rail (desktop) */
      var rail = $('.sec.rail-sec', pg);
      if (rail && !narrow()) {
        var track = $('.dims.rail', rail), wrap = $('.wrap', rail);
        $$('.dim', track).forEach(function (d) { d.classList.remove('rv'); d.classList.add('in'); });
        var dist = function () { return Math.max(0, track.scrollWidth - wrap.clientWidth + 24); };
        var tw = gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: rail, start: 'top top', end: function () { return '+=' + (dist() + innerHeight * 0.2); }, pin: true, scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1 } });
        gsap.from($$('.dim', track), { opacity: 0, y: 60, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: rail, start: 'top 70%', once: true } });
      }

      /* marquee speeds up with scroll velocity */
      var mq = $('[data-marquee]', pg);
      if (mq && mq.getAnimations) {
        gsap.ticker.add(function () {
          var a = mq.getAnimations()[0]; if (!a) return;
          var v = Math.abs((GL && GL.velocity) || 0), target = 1 + Math.min(9, v * 0.35);
          a.playbackRate += (target - a.playbackRate) * 0.08;
        });
      }

      /* cards: tilt toward the pointer */
      if (fine) $$('[data-glow], .verse', pg).forEach(function (c) {
        var rx = gsap.quickTo(c, 'rotationX', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(c, 'rotationY', { duration: 0.5, ease: 'power3' });
        gsap.set(c, { transformPerspective: 900 });
        c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 8); rx(-((e.clientY - r.top) / r.height - 0.5) * 8); });
        c.addEventListener('pointerleave', function () { rx(0); ry(0); });
      });
    }, pg);
    requestAnimationFrame(function () { ScrollTrigger.refresh(); bar(); });
  }

  function wipe() {
    var w = $('#wipe'); if (!w || reduce || first) return;
    gsap.fromTo(w, { yPercent: 0 }, { yPercent: -101, duration: 0.9, ease: 'power4.inOut', delay: 0.05 });
  }

  document.addEventListener('bcm:route', function (e) {
    var page = e.detail.page;
    wipe();
    if (lenis) lenis.scrollTo(0, { immediate: true });
    build(page);
    first = false;
  });
  /* app.js ran its first route() before this file loaded */
  var cur = $('.page.show');
  if (cur) { build(cur.getAttribute('data-page')); first = false; }
  document.fonts && document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
