(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- data ---------- */
  var VERSES = [
    { t: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', r: 'John 3:16', big: 1 },
    { t: 'I can do all things through Christ which strengtheneth me.', r: 'Philippians 4:13' },
    { t: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.', r: 'Jeremiah 29:11' },
    { t: 'The LORD is my shepherd; I shall not want.', r: 'Psalm 23:1' },
    { t: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.', r: 'Proverbs 3:5\u20136' },
    { t: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', r: 'Isaiah 40:31' },
    { t: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.', r: 'Matthew 6:33', big: 1 }
  ];
  var MARQ = [
    ['I can do all things through Christ which strengtheneth me.', 'Philippians 4:13'],
    ['The LORD is my shepherd; I shall not want.', 'Psalm 23:1'],
    ['Be strong and of a good courage; be not afraid, neither be thou dismayed.', 'Joshua 1:9'],
    ['And we know that all things work together for good to them that love God.', 'Romans 8:28'],
    ['Trust in the LORD with all thine heart.', 'Proverbs 3:5'],
    ['But seek ye first the kingdom of God, and his righteousness.', 'Matthew 6:33'],
    ['Behold, I am doing a new thing; now it springs forth.', 'Isaiah 43:19 ESV'],
    ['For I know the thoughts that I think toward you, saith the LORD.', 'Jeremiah 29:11']
  ];
  var PAGES = ['home', 'story', 'pastor', 'first-lady', 'ministries', 'discipleship', 'watch', 'events', 'community', 'give', 'connect'];
  var TARGET = Date.UTC(2026, 10, 1, 16, 0, 0); /* Nov 1, 2026 11:00 AM EST (UTC-5) */

  /* ---------- build content ---------- */
  var mq = $('[data-marquee]');
  if (mq) {
    var one = MARQ.map(function (m) { return '<span>\u201c' + m[0] + '\u201d<em>' + m[1] + '</em></span><i></i>'; }).join('');
    mq.innerHTML = one + one;
  }
  var vs = $('[data-verses]');
  if (vs) {
    vs.innerHTML = VERSES.map(function (v, i) {
      return '<figure class="verse rv d' + (i % 3) + (v.big ? ' big' : '') + '" style="margin:0"><q>' + v.t + '</q><cite>' + v.r + '<span>KJV</span></cite></figure>';
    }).join('');
  }
  $$('[data-cta]').forEach(function (el) {
    el.outerHTML = '<section class="sec cta"><div class="wrap"><div class="eyebrow rv">Sunday, November 1, 2026 &middot; 11:00 AM ET</div><h2 class="rv d1">Be there when <span class="ital gold-text">it begins.</span></h2><div class="row rv d2"><a class="btn gold" href="#connect" data-magnet>Request an invitation <span class="arr"></span></a><a class="btn line" href="#events" data-magnet>See event details</a></div></div></section>';
  });

  /* statement word splitter */
  var statements = $$('[data-statement]').map(function (el) {
    var words = [];
    function wrap(node, g) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'w' + (g ? ' g' : ''); s.textContent = p; words.push(s); frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) { wrap(n, n.classList.contains('g')); }
      });
    }
    wrap(el, false);
    return { el: el, words: words };
  });
  function updateStatements() {
    var vh = innerHeight;
    statements.forEach(function (s) {
      if (!s.el.offsetParent) return;
      var r = s.el.getBoundingClientRect();
      var p = reduce ? 1.1 : (vh * 0.88 - r.top) / (r.height + vh * 0.3);
      var n = s.words.length;
      s.words.forEach(function (w, i) { w.classList.toggle('on', i / n < p); });
    });
  }

  /* ---------- routing ---------- */
  var current = null, io = null;
  function route() {
    var h = (location.hash || '#home').replace('#', '');
    if (PAGES.indexOf(h) < 0) h = 'home';
    $$('.page').forEach(function (p) { p.classList.toggle('show', p.getAttribute('data-page') === h); });
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === h); });
    if (current !== h) { window.scrollTo(0, 0); }
    current = h;
    closeMenu();
    observeReveals();
    updateStatements();
    heroInit();
    tick();
  }
  function observeReveals() {
    var page = $('.page.show'); if (!page) return;
    if (!('IntersectionObserver' in window)) { $$('.rv', page).forEach(function (e) { e.classList.add('in'); }); return; }
    if (!io) io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv:not(.in)', page).forEach(function (e) { io.observe(e); });
  }
  function heroInit() { /* hero reveals on load */ }
  addEventListener('hashchange', route);

  /* ---------- header + menu ---------- */
  var top = $('#top'), menu = $('#menu'), mb = $('#menuBtn');
  function openMenu() { menu.classList.add('open'); mb.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; }
  function closeMenu() { menu.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  mb.addEventListener('click', openMenu);
  $('#menuClose').addEventListener('click', closeMenu);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { setTimeout(closeMenu, 10); }); });

  /* ---------- countdown ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tick() {
    var left = TARGET - Date.now();
    $$('[data-countdown]').forEach(function (c) {
      if (left <= 0) { c.innerHTML = '<div style="padding:18px 28px"><b style="font-size:26px">We are live</b><span>Welcome home</span></div>'; return; }
      var s = Math.floor(left / 1000);
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      c.querySelector('[data-d]').textContent = d;
      c.querySelector('[data-h]').textContent = pad(h);
      c.querySelector('[data-m]').textContent = pad(m);
      c.querySelector('[data-s]').textContent = pad(sec);
    });
  }
  setInterval(tick, 1000);

  /* ---------- scroll ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      top.classList.toggle('solid', scrollY > 40);
      updateStatements();
      if (!reduce) $$('[data-parallax]').forEach(function (el) {
        if (!el.offsetParent) return;
        el.style.transform = 'translate3d(0,' + (scrollY * parseFloat(el.getAttribute('data-parallax'))) + 'px,0)';
      });
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- pointer-driven light ---------- */
  function setXY(el, e) {
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }
  var mouse = { x: -999, y: -999, px: -999, py: -999, on: false };
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
    var t = e.target.closest ? e.target : null; if (!t) return;
    var el = t.closest('[data-lit],[data-glow],[data-shine]'); if (el) setXY(el, e);
    $$('[data-magnet]').forEach(function (b) {
      var r = b.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy;
      if (Math.abs(dx) < r.width * 0.8 && Math.abs(dy) < r.height * 1.4 && b.offsetParent) {
        b.style.setProperty('--bx', (dx * 0.18).toFixed(1) + 'px'); b.style.setProperty('--by', (dy * 0.28).toFixed(1) + 'px');
      } else { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); }
    });
  }, { passive: true });

  /* ---------- cursor (cross) ---------- */
  var cur = $('#cur'), cx = -100, cy = -100, ang = 0;
  if (fine && !reduce) {
    document.body.classList.add('has-cursor');
    var lastX = 0;
    document.addEventListener('pointermove', function () { cur.style.opacity = 1; }, { once: true });
    document.addEventListener('mouseleave', function () { cur.style.opacity = 0; });
    document.addEventListener('mouseenter', function () { cur.style.opacity = 1; });
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      var hot = t.closest && t.closest('a,button,[data-hover],input,select,textarea,label');
      var img = !hot && t.closest && t.closest('[data-lit]');
      cur.classList.toggle('hot', !!hot);
      cur.classList.toggle('img', !!img);
    });
    document.addEventListener('mousedown', function () { cur.classList.add('down'); burst(mouse.x, mouse.y); });
    document.addEventListener('mouseup', function () { cur.classList.remove('down'); });
    (function loop() {
      cx += (mouse.x - cx) * 0.22; cy += (mouse.y - cy) * 0.22;
      var vx = mouse.x - cx; ang += (Math.max(-24, Math.min(24, vx * 0.6)) - ang) * 0.15;
      cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) rotate(' + ang + 'deg)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- canvas: embers, trail, bursts ---------- */
  var cv = $('#fx'), ctx = cv.getContext('2d'), W = 0, H = 0, DPR = Math.min(2, devicePixelRatio || 1);
  var embers = [], sparks = [];
  function size() { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  size(); addEventListener('resize', function () { size(); seed(); });
  function seed() {
    embers = []; var n = Math.round(Math.min(90, W * H / 18000));
    for (var i = 0; i < n; i++) embers.push(mkEmber(true));
  }
  function mkEmber(rand) {
    return { x: Math.random() * W, y: rand ? Math.random() * H : H + 10, vx: (Math.random() - .5) * .25, vy: -(.15 + Math.random() * .45), r: .6 + Math.random() * 1.8, a: .25 + Math.random() * .6, ph: Math.random() * 6.28 };
  }
  function cross(x, y, s, a, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalAlpha = a; ctx.fillStyle = '#f8e3a0';
    ctx.fillRect(-s * .18, -s, s * .36, s * 2); ctx.fillRect(-s * .7, -s * .45, s * 1.4, s * .36); ctx.restore();
  }
  function burst(x, y) {
    if (reduce) return;
    for (var i = 0; i < 26; i++) {
      var a = Math.random() * 6.28, sp = 1.5 + Math.random() * 4.5;
      sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, d: .018 + Math.random() * .02, r: 1 + Math.random() * 2, c: i % 5 === 0, rot: Math.random() * 3 });
    }
  }
  var lastSpawn = 0;
  document.addEventListener('pointermove', function (e) {
    if (reduce || e.pointerType === 'touch') return;
    var now = performance.now(); if (now - lastSpawn < 28) return; lastSpawn = now;
    var c = Math.random() < .22;
    sparks.push({ x: e.clientX + (Math.random() - .5) * 8, y: e.clientY + (Math.random() - .5) * 8, vx: (Math.random() - .5) * .8, vy: .2 + Math.random() * .8, life: 1, d: .022 + Math.random() * .02, r: c ? 5 + Math.random() * 3 : .8 + Math.random() * 1.6, c: c, rot: (Math.random() - .5) });
  }, { passive: true });
  seed();
  var run = true; document.addEventListener('visibilitychange', function () { run = !document.hidden; if (run) frame(); });
  function frame() {
    if (!run) return;
    ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    if (!reduce) {
      for (var i = 0; i < embers.length; i++) {
        var e = embers[i]; e.ph += .02;
        var dx = e.x - mouse.x, dy = e.y - mouse.y, d2 = dx * dx + dy * dy;
        if (mouse.on && d2 < 22000) { var d = Math.sqrt(d2) || 1, f = (1 - d / 148) * 1.6; e.x += dx / d * f; e.y += dy / d * f; }
        e.x += e.vx + Math.sin(e.ph) * .22; e.y += e.vy;
        if (e.y < -10 || e.x < -10 || e.x > W + 10) { embers[i] = mkEmber(false); continue; }
        var tw = .6 + .4 * Math.sin(e.ph * 2);
        var g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4);
        g.addColorStop(0, 'rgba(255,236,170,' + (e.a * tw) + ')'); g.addColorStop(1, 'rgba(217,172,69,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 4, 0, 6.283); ctx.fill();
      }
    }
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j]; s.x += s.vx; s.y += s.vy; s.vy += .02; s.vx *= .985; s.life -= s.d;
      if (s.life <= 0) { sparks.splice(j, 1); continue; }
      if (s.c) cross(s.x, s.y, s.r, s.life * .9, s.rot + (1 - s.life));
      else { ctx.globalAlpha = s.life; ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  frame();

  /* ---------- form ---------- */
  var form = $('#inviteForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fn = $('#fn').value.trim(), em = $('#em').value.trim(), err = $('#formErr');
    if (!fn) { err.textContent = 'Please enter your first name.'; $('#fn').focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { err.textContent = 'Please enter a valid email address.'; $('#em').focus(); return; }
    err.textContent = '';
    form.hidden = true;
    $('#thanksMsg').innerHTML = 'Thank you, ' + fn.replace(/[<>&]/g, '') + '. Your request is noted for our inaugural service on Sunday, November 1 at 11:00 AM ET.<br><span class="note">Preview note: this form is not yet connected to an inbox. Delivery is set up when the site goes live.</span>';
    $('#thanks').hidden = false;
    burst(innerWidth / 2, innerHeight / 2);
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-scroll]'); if (!b) return;
    var t = document.getElementById(b.getAttribute('data-scroll')); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- go ---------- */
  document.body.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href') === location.hash) { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  route(); onScroll();
})();
