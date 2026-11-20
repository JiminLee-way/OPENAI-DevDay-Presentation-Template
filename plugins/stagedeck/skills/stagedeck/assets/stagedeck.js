/* ==========================================================================
   StageDeck engine — keynote-stage slides with spring ("chewy") motion.
   No dependencies. Include after the .deck markup:
     <script src="assets/stagedeck.js"></script>
   ========================================================================== */
(function () {
  'use strict';
  const W = 1920, H = 1080;
  const root = document.documentElement;
  root.classList.add('sd-ready');
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ math */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const ease = {
    linear: t => t,
    out: t => 1 - Math.pow(1 - t, 3),
    out5: t => 1 - Math.pow(1 - t, 5),
    expo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    in: t => t * t * t,
  };

  /* ---------------------------------------------------------------- spring
     Apple-style parameters: perceptual duration (s) + bounce (0 = critically damped).
     stiffness = (2π/d)², damping ratio ζ = 1 − bounce.  Returns {f(t)->0..1(+overshoot), T}. */
  const springCache = new Map();
  function spring(duration = .6, bounce = .25, v0 = 0) {
    const key = duration + '|' + bounce + '|' + v0;
    if (springCache.has(key)) return springCache.get(key);
    const w0 = 2 * Math.PI / duration;
    const z = bounce >= 0 ? 1 - bounce : 1 / (1 - bounce);
    let f;
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z), B = (v0 - z * w0) / wd;
      f = t => 1 + Math.exp(-z * w0 * t) * (-Math.cos(wd * t) + B * Math.sin(wd * t));
    } else if (z === 1) {
      f = t => 1 + Math.exp(-w0 * t) * (-1 + (v0 - w0) * t);
    } else {
      const s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s);
      const C2 = (v0 + r1) / (r2 - r1), C1 = -1 - C2;
      f = t => 1 + C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t);
    }
    let T = 0;
    for (let t = 0; t < 6; t += 1 / 240) if (Math.abs(f(t) - 1) > 0.0012) T = t;
    T = Math.max(T + 1 / 240, .05);
    const out = { f: t => (t >= T ? 1 : f(Math.max(0, t))), T, duration, bounce };
    springCache.set(key, out);
    return out;
  }
  /* Presets. "chewy" (쫀득) = fast attack, ~4–5% overshoot, long sticky settle. */
  const SPRINGS = {
    smooth: [.55, 0],
    snappy: [.42, .14],
    chewy: [.62, .3],
    soft: [.85, .16],
    bouncy: [.6, .46],
    heavy: [1.0, .2],
    jellyX: [.5, .38],
    jellyY: [.64, .38],
  };
  const sp = name => (Array.isArray(name) ? spring(name[0], name[1]) : name && name.f ? name : spring(...(SPRINGS[name] || SPRINGS.chewy)));
  function linearEasing(s, n = 64) {
    const v = [];
    for (let i = 0; i <= n; i++) v.push(+s.f(s.T * i / n).toFixed(4));
    return `linear(${v.join(', ')})`;
  }
  if (window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)')) {
    for (const name of ['chewy', 'snappy', 'soft', 'bouncy', 'smooth']) {
      const s = sp(name);
      root.style.setProperty(`--sd-ease-${name}`, linearEasing(s));
      root.style.setProperty(`--sd-dur-${name}`, Math.round(s.T * 1000) + 'ms');
    }
  }

  /* play: sample fn(t seconds) -> style object into WAAPI keyframes */
  function play(el, fn, T, o = {}) {
    if (REDUCE || o.instant) { const end = fn(T); Object.assign(el.style, {}); return finishInstant(el, end, o); }
    const n = Math.max(24, Math.min(90, Math.round(T * 60)));
    const kf = [];
    for (let i = 0; i <= n; i++) { const t = T * i / n; kf.push(Object.assign({ offset: i / n }, fn(t))); }
    const a = el.animate(kf, { duration: T * 1000, delay: o.delay || 0, fill: 'both', easing: 'linear' });
    (el._anims || (el._anims = [])).push(a);
    if (!o.keep) a.finished.then(() => { if (!o.keep) { a.cancel(); } }).catch(() => {});
    return a;
  }
  function finishInstant(el, end, o) {
    if (o.keep) { const a = el.animate([end, end], { duration: 1, fill: 'both' }); (el._anims || (el._anims = [])).push(a); return a; }
    return null;
  }
  function cancelAnims(el) { if (el._anims) { el._anims.forEach(a => a.cancel()); el._anims = []; } if (el._raf) { cancelAnimationFrame(el._raf); el._raf = 0; } if (el._timers) { el._timers.forEach(clearTimeout); el._timers = []; } }
  const later = (el, ms, fn) => { const id = setTimeout(fn, ms); (el._timers || (el._timers = [])).push(id); return id; };

  /* ------------------------------------------------------------- effects */
  const attr = (el, k) => { if (el.dataset[k] !== undefined) return el.dataset[k]; const p = el.parentElement; return p && p.dataset.animChildren !== undefined ? p.dataset[k] : undefined; };
  const blurIn = (t, px, dur = .45) => `blur(${((1 - ease.expo(clamp(t / dur))) * px).toFixed(2)}px)`;
  const FX = {
    none(el) { return null; },
    fade(el, o) { return play(el, t => ({ opacity: ease.out(clamp(t / .4)) }), .4, o); },
    rise(el, o) {
      const s = sp(o.spring || attr(el, 'spring') || 'chewy'), d = +(attr(el, 'dist') || o.dist || clamp((el.offsetHeight || 80) * .32, 12, 56));
      return play(el, t => ({ opacity: ease.out(clamp(t / .3)), transform: `translate3d(0,${((1 - s.f(t)) * d).toFixed(2)}px,0)`, filter: blurIn(t, d < 20 ? 6 : 12) }), s.T, o);
    },
    /* UI-mockup element: plain fade + 4px blur, ~0.2s, no movement (measured on keynote UI) */
    ui(el, o) { return play(el, t => ({ opacity: ease.out(clamp(t / .18)), filter: blurIn(t, 4, .2) }), .22, o); },
    /* screenshot focus: blur 10 -> 0 with opacity, no scale (frames never move) */
    focus(el, o) { return play(el, t => ({ opacity: ease.out(clamp(t / .3)), filter: blurIn(t, 10, .32) }), .34, o); },
    /* tall content scrolls inside its frame with motion blur (trigger with data-scroll-step) */
    scroll(el, o) {
      const frame = el.parentElement, dist = +(el.dataset.to || Math.max(0, el.scrollHeight - frame.clientHeight)), T = +(el.dataset.duration || 1100) / 1000;
      return play(el, t => { const k = ease.inOut(clamp(t / T)), v = Math.abs(ease.inOut(clamp((t + .016) / T)) - k) / .016; return { transform: `translate3d(0,${(-dist * k).toFixed(1)}px,0)`, filter: `blur(${Math.min(10, v * dist * .004).toFixed(2)}px)` }; }, T, Object.assign({ keep: true }, o));
    },
    /* film-title open: soft bokeh disc collapses to a point, letters resolve outward from data-seed */
    bokeh(el, o) { return bokehOpen(el, o); },
    /* chat thread: children appear at data-at (ms), data-hide-at removes (typing dots); older messages slide up */
    chat(el, o) { return chatPlay(el, o); },
    /* live counter: "{n}" in data-format replaced every second, starting at data-from */
    tick(el, o) {
      el.style.opacity = 1;
      const fmt = el.dataset.format || '{n}'; let n = +(el.dataset.from || 0);
      el.textContent = fmt.replace('{n}', n);
      if (o.instant || REDUCE) return;
      const step = () => { n++; el.textContent = fmt.replace('{n}', n); later(el, 1000, step); };
      later(el, (o.delay || 0) + 1000, step);
    },
    drop(el, o) {
      const s = sp(o.spring || el.dataset.spring || 'chewy'), d = +(el.dataset.dist || 64);
      return play(el, t => ({ opacity: ease.out(clamp(t / .3)), transform: `translate3d(0,${(-(1 - s.f(t)) * d).toFixed(2)}px,0)`, filter: blurIn(t, 12) }), s.T, o);
    },
    left(el, o) { return slideX(el, o, -1); },
    right(el, o) { return slideX(el, o, 1); },
    zoom(el, o) {
      const s = sp(o.spring || el.dataset.spring || 'chewy');
      return play(el, t => ({ opacity: ease.out(clamp(t / .28)), transform: `scale(${(.82 + .18 * s.f(t)).toFixed(4)})`, filter: blurIn(t, 10) }), s.T, o);
    },
    /* jelly pop: x/y scales on slightly different springs -> one squash/stretch wobble */
    pop(el, o) {
      const sx = sp('jellyX'), sy = sp('jellyY'), T = Math.max(sx.T, sy.T), from = +(el.dataset.from || 0);
      return play(el, t => ({ opacity: ease.out(clamp(t / .14)), transform: `scale(${lerp(from, 1, sx.f(t)).toFixed(4)}, ${lerp(from, 1, sy.f(t)).toFixed(4)})` }), T, o);
    },
    /* focus pull: blurred & slightly large -> sharp */
    blur(el, o) {
      const s = sp(o.spring || el.dataset.spring || 'soft');
      return play(el, t => ({ opacity: ease.out(clamp(t / .45)), transform: `scale(${(1 + (1 - s.f(t)) * .07).toFixed(4)})`, filter: blurIn(t, 28, .8) }), Math.max(s.T, .8), o);
    },
    /* line mask reveal; lines = <br>-separated or direct child elements */
    mask(el, o) {
      const lines = splitLines(el), s = sp(o.spring || el.dataset.spring || 'chewy'), st = +(el.dataset.lineStagger || 90);
      el.style.opacity = 1;
      lines.forEach((ln, i) => play(ln, t => ({ transform: `translate3d(0,${((1 - s.f(t)) * 108).toFixed(2)}%,0)` }), s.T, { delay: (o.delay || 0) + i * st, instant: o.instant }));
      return null;
    },
    /* word-by-word rise with blur */
    words(el, o) {
      const words = splitWords(el), s = sp(o.spring || 'chewy'), st = +(el.dataset.wordStagger || 55);
      el.style.opacity = 1;
      words.forEach((w, i) => play(w, t => ({ opacity: ease.out(clamp(t / .3)), transform: `translate3d(0,${((1 - s.f(t)) * 42).toFixed(2)}px,0)`, filter: blurIn(t, 14) }), s.T, { delay: (o.delay || 0) + i * st, instant: o.instant }));
      return null;
    },
    /* number count-up + rise */
    count(el, o) {
      const raw = el.dataset.raw || (el.dataset.raw = el.textContent.trim());
      const m = raw.match(/^(\D*?)(\d[\d,]*\.?\d*)(.*)$/);
      FX.rise(el, o);
      if (!m || o.instant || REDUCE) { el.textContent = raw; return; }
      const [, pre, num, post] = m, dec = (num.split('.')[1] || '').length, comma = num.includes(','), target = parseFloat(num.replace(/,/g, ''));
      const fmt = v => pre + (comma ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)) + post;
      const dur = +(el.dataset.duration || 1500), start = performance.now() + (o.delay || 0);
      el.textContent = fmt(0);
      const tick = now => { const p = clamp((now - start) / dur); el.textContent = fmt(target * ease.expo(p)); if (p < 1) el._raf = requestAnimationFrame(tick); else el.textContent = raw; };
      el._raf = requestAnimationFrame(tick);
    },
    /* typewriter */
    type(el, o) {
      const raw = el.dataset.raw || (el.dataset.raw = el.textContent);
      el.style.opacity = 1;
      if (o.instant || REDUCE) { el.textContent = raw; return; }
      el.textContent = ''; el.classList.add('sd-typing');
      const cps = +(el.dataset.cps || 38), start = performance.now() + (o.delay || 0);
      const tick = now => { const n = Math.floor(Math.max(0, now - start) / 1000 * cps); el.textContent = raw.slice(0, n); if (n < raw.length) el._raf = requestAnimationFrame(tick); else later(el, 1600, () => el.classList.remove('sd-typing')); };
      el._raf = requestAnimationFrame(tick);
    },
    /* svg stroke draw (any <path>/<line>/<polyline> inside) */
    draw(el, o) {
      el.style.opacity = 1;
      el.querySelectorAll('path,line,polyline,circle,rect').forEach((p, i) => {
        if (p.getAttribute('data-nodraw') !== null || !p.getTotalLength) return;
        const L = p.getTotalLength(); p.style.strokeDasharray = L;
        play(p, t => ({ strokeDashoffset: (L * (1 - ease.expo(clamp(t / 1.6)))).toFixed(1) }), 1.6, { delay: (o.delay || 0) + i * 120, instant: o.instant });
      });
      return null;
    },
    /* kinetic word: flies in with motion blur + stretch, then drifts */
    fly(el, o) {
      const s = sp([.95, .2]), dir = el.dataset.from === 'left' ? -1 : 1, dist = +(el.dataset.dist || 1300), drift = +(el.dataset.drift || 26);
      const T = s.T + 3;
      return play(el, t => {
        const k = s.f(t), v = (s.f(t + .016) - k) / .016;
        const x = (1 - k) * dist * dir - dir * drift * Math.max(0, t - .2);
        return { opacity: ease.out(clamp(t / .15)), transform: `translate3d(${x.toFixed(1)}px,0,0) scaleX(${(1 + Math.min(.12, Math.abs(v) * .035)).toFixed(4)})`, filter: `blur(${Math.min(16, Math.abs(v) * 3.2).toFixed(2)}px)` };
      }, T, Object.assign({ keep: true }, o));
    },
    /* dot-matrix resolve: orange dots -> violet outline -> solid fill */
    dots(el, o) { return dotText(el, o); },
    /* giant dot zooms out to a small character (intro) */
    zoomout(el, o) {
      const s = sp([.8, .26]), from = +(el.dataset.from || 22), hold = +(el.dataset.hold || 1400) / 1000;
      if (!o.instant) {
        later(el, (o.delay || 0) + 480, () => wink(el, 420));
      }
      return play(el, t => {
        const pre = 1 - .08 * ease.inOut(clamp(t / hold));
        const k = s.f(Math.max(0, t - hold));
        const sc = t < hold ? from * pre : lerp(from * .92, 1, k);
        return { opacity: 1, transform: `scale(${sc.toFixed(4)})` };
      }, hold + s.T, o);
    },
    /* rolling dot: travels from data-from-x/y (px offset) to its place, rolling + motion-blur smear.
       With data-to-x/y it passes through and exits instead of landing. */
    roll(el, o) {
      const fx = +(el.dataset.fromX ?? -1500), fy = +(el.dataset.fromY ?? 0);
      const R = (el.offsetWidth || 240) / 2, deg = 180 / Math.PI;
      const pass = el.dataset.toX !== undefined || el.dataset.toY !== undefined;
      const tx = +(el.dataset.toX || 0), ty = +(el.dataset.toY || 0);
      const s = pass ? null : sp(el.dataset.spring || [.72, .26]);
      const T = pass ? +(el.dataset.duration || 700) / 1000 : s.T;
      const pos = t => { if (pass) { const k = ease.inOut(clamp(t / T)); return [lerp(fx, tx, k), lerp(fy, ty, k)]; } const k = s.f(t); return [fx * (1 - k), fy * (1 - k)]; };
      return play(el, t => {
        const [x, y] = pos(t), [x2, y2] = pos(t + .016);
        const vx = (x2 - x) / 16, vy = (y2 - y) / 16, v = Math.hypot(vx, vy), ang = Math.atan2(vy, vx) * deg;
        const st = Math.min(.32, v * .05);
        return { opacity: ease.out(clamp(t / .06)), transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${ang.toFixed(1)}deg) scale(${(1 + st).toFixed(3)},${(1 - st * .35).toFixed(3)}) rotate(${(-ang).toFixed(1)}deg) rotate(${(x / R * deg).toFixed(1)}deg)`, filter: `blur(${Math.min(16, v * 2.4).toFixed(2)}px)` };
      }, T, Object.assign({ keep: pass }, o));
    },
    /* height grows from 0 (list items that push their card taller) */
    grow(el, o) {
      const h = el.scrollHeight, s = sp(o.spring || 'chewy');
      el.style.overflow = 'hidden';
      const a = play(el, t => ({ height: (Math.max(0, s.f(t)) * h).toFixed(1) + 'px', opacity: ease.out(clamp((t - .06) / .3)), transform: `translate3d(0,${((1 - s.f(t)) * 16).toFixed(2)}px,0)` }), s.T, o);
      if (a) a.finished.then(() => { el.style.overflow = ''; }).catch(() => {}); else el.style.overflow = '';
      return a;
    },
    /* particles swirl in and assemble into the element's shape (text or <img>/<svg>) */
    assemble(el, o) { return assemble(el, o); },
    /* character typing that keeps gradients intact: clips each line at measured glyph edges */
    typein(el, o) {
      const lines = splitLines(el), cps = +(el.dataset.cps || (/[\uac00-\ud7a3]/.test(el.textContent) ? 12 : 18));
      el.style.opacity = 1;
      let t0 = o.delay || 0;
      lines.forEach(ln => {
        if (o.instant || REDUCE) return;
        const base = ln.getBoundingClientRect(), k = base.width / Math.max(1, ln.offsetWidth), W = ln.offsetWidth;
        const edges = [], range = document.createRange(), walker = document.createTreeWalker(ln, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) for (let i = 0; i < node.length; i++) {
          range.setStart(node, i); range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect(); if (r.width > 0.5 || /\s/.test(node.data[i])) edges.push((r.right - base.left) / k);
        }
        if (!edges.length) return;
        const N = edges.length, kf = [{ offset: 0, clipPath: `inset(-10% ${W + 40}px -30% -10px)`, easing: 'step-end' }];
        edges.forEach((x, i) => kf.push({ offset: (i + 1) / N, clipPath: `inset(-10% ${Math.max(-40, W - x - 2).toFixed(1)}px -30% -10px)`, easing: 'step-end' }));
        kf[kf.length - 1].clipPath = 'inset(-10% -40px -30% -10px)';
        const dur = N / cps * 1000;
        const a = ln.animate(kf, { duration: dur, delay: t0, fill: 'both' });
        (ln._anims || (ln._anims = [])).push(a);
        a.finished.then(() => a.cancel()).catch(() => {});
        t0 += dur + 160;
      });
      return null;
    },
    /* dim -> bright: text that "fades up from gray" */
    glow(el, o) {
      return play(el, t => ({ opacity: (t < .2 ? ease.out(t / .2) * .3 : .3 + .7 * ease.inOut(clamp((t - .2) / .9))).toFixed(3), filter: blurIn(t, 6, 1) }), 1.1, o);
    },
    /* race card: progress bar + timer, content sharpens at the finish */
    race(el, o) {
      const T = +(el.dataset.time || 2000) / 1000, bar = el.querySelector('.sd-race__bar i'), media = el.querySelector('.sd-race__media'), time = el.querySelector('.sd-race__time');
      el.classList.remove('is-done');
      FX.rise(el, o);
      const d = (o.delay || 0) + 500;
      if (o.instant || REDUCE) { el.classList.add('is-done'); if (time) time.textContent = T.toFixed(1) + 's'; return; }
      if (bar) play(bar, t => ({ transform: `scaleX(${ease.inOut(clamp(t / T)).toFixed(4)})` }), T, { delay: d, keep: true });
      if (media) play(media, t => ({ opacity: (.25 + .75 * ease.in(clamp(t / T))).toFixed(3), filter: `blur(${(18 * (1 - ease.in(clamp(t / T)))).toFixed(2)}px) saturate(${(.3 + .7 * clamp(t / T)).toFixed(2)})` }), T, { delay: d, keep: true });
      const start = performance.now() + d;
      const tick = now => { const p = clamp((now - start) / 1000 / T); if (time) time.textContent = (p * T).toFixed(1) + 's'; if (p < 1) el._raf = requestAnimationFrame(tick); else { el.classList.add('is-done'); FX.pop(el.querySelector('.sd-race__done') || document.createElement('i'), {}); } };
      el._raf = requestAnimationFrame(tick);
      return null;
    },
    /* camera settle: lands slightly too close, eases back (use after a dive) */
    settle(el, o) {
      const s = sp(o.spring || el.dataset.spring || 'heavy'), from = +(el.dataset.from || 1.16);
      return play(el, t => ({ opacity: ease.out(clamp(t / .25)), transform: `scale(${lerp(from, 1, s.f(t)).toFixed(4)})`, filter: blurIn(t, 8, .6) }), s.T, o);
    },
    /* slow push for photos */
    kenburns(el, o) {
      return play(el, t => ({ opacity: ease.out(clamp(t / .8)), transform: `scale(${(1.08 - .08 * ease.out(clamp(t / 9))).toFixed(4)})` }), 9, Object.assign({ keep: true }, o));
    },
  };
  function slideX(el, o, dir) {
    const s = sp(o.spring || el.dataset.spring || 'chewy'), d = +(el.dataset.dist || 90) * dir;
    return play(el, t => ({ opacity: ease.out(clamp(t / .3)), transform: `translate3d(${((1 - s.f(t)) * d).toFixed(2)}px,0,0)`, filter: blurIn(t, 12) }), s.T, o);
  }

  /* ------------------------------------------------------------ text split */
  function splitLines(el) {
    if (el._lines) return el._lines;
    let parts;
    if (el.querySelector(':scope > br')) parts = el.innerHTML.split(/<br\s*\/?>/i);
    else {
      const kids = [...el.childNodes].filter(n => !(n.nodeType === 3 && !n.textContent.trim()));
      parts = kids.length > 1 && kids.every(n => n.nodeType === 1) ? kids.map(n => n.outerHTML) : [el.innerHTML];
    }
    el.innerHTML = parts.map(p => `<span class="sd-mask"><span class="sd-mask__in">${p}</span></span>`).join('');
    return (el._lines = [...el.querySelectorAll('.sd-mask__in')]);
  }
  function splitWords(el) {
    if (el._words) return el._words;
    const out = [];
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const sEl = document.createElement('span'); sEl.className = 'sd-word'; sEl.textContent = part;
            const g = n.parentElement.closest('.grad,.grad-warm,.grad-cool');
            if (g && el.contains(g)) sEl.classList.add([...g.classList].find(c => c.startsWith('grad')));
            frag.appendChild(sEl); out.push(sEl);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.querySelectorAll('.grad,.grad-warm,.grad-cool').forEach(g => { if (g.querySelector('.sd-word')) g.classList.remove('grad', 'grad-warm', 'grad-cool'); });
    return (el._words = out);
  }

  function splitChars(el) {
    if (el._chars) return el._chars;
    const out = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) { const f = document.createDocumentFragment(); [...n.textContent].forEach(ch => { if (/\s/.test(ch)) { f.appendChild(document.createTextNode(ch)); return; } const c = document.createElement('span'); c.className = 'sd-char'; c.textContent = ch; f.appendChild(c); out.push(c); }); n.replaceWith(f); }
      else if (n.nodeType === 1 && !n.classList.contains('sd-bokeh')) walk(n);
    });
    walk(el);
    return (el._chars = out);
  }
  function bokehOpen(el, o) {
    const chars = splitChars(el); el.style.opacity = 1;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    let disc = el._disc;
    if (!disc) { disc = document.createElement('span'); disc.className = 'sd-bokeh'; disc.innerHTML = '<i></i><i></i>'; el.appendChild(disc); el._disc = disc; }
    if (o.instant || REDUCE) { disc.style.opacity = 0; return; }
    const seed = clamp(+(el.dataset.seed || 0), 0, chars.length - 1), c = chars[seed];
    const size = el.offsetHeight * 1.25;
    Object.assign(disc.style, { left: (c.offsetLeft + c.offsetWidth / 2) + 'px', top: (c.offsetTop + c.offsetHeight / 2) + 'px', width: size + 'px', height: size + 'px' });
    const d0 = o.delay || 0;
    play(disc, t => { const sc = t < .07 ? ease.out(t / .07) : t < .37 ? 1 : 1 - ease.in(clamp((t - .37) / .16)); return { opacity: t < .54 ? 1 : 0, transform: `translate(-50%,-50%) scale(${Math.max(.02, sc).toFixed(3)})` }; }, .56, { delay: d0, keep: true });
    disc.querySelectorAll('i').forEach((sp_, k) => play(sp_, t => ({ opacity: t < .53 ? 0 : 1 - clamp((t - .9) / .2), transform: `translate(${k ? 26 : -18}px, ${k ? -12 : 10}px)` }), 1.1, { delay: d0, keep: true }));
    chars.forEach((ch, i) => play(ch, t => ({ opacity: ease.out(clamp(t / .3)), filter: blurIn(t, 12, .35), textShadow: `${(-5 * (1 - clamp(t / .35))).toFixed(1)}px 0 rgba(255,80,170,${(.7 * (1 - clamp(t / .35))).toFixed(2)}), ${(5 * (1 - clamp(t / .35))).toFixed(1)}px 0 rgba(80,170,255,${(.7 * (1 - clamp(t / .35))).toFixed(2)})` }), .38, { delay: d0 + 560 + Math.abs(i - seed) * 40 }));
    return null;
  }
  function smearOut(el) {
    const chars = splitChars(el).slice().reverse();
    chars.forEach((ch, i) => play(ch, t => { const k = ease.out(clamp(t / .2)); return { opacity: 1 - k, transform: `scaleX(${(1 + .15 * k).toFixed(3)})`, filter: `blur(${(6 * k).toFixed(2)}px)`, textShadow: `${(-12 * k).toFixed(1)}px 0 currentColor, ${(12 * k).toFixed(1)}px 0 currentColor` }; }, .22, { delay: i * 70, keep: true }));
    return chars.length * 70 + 220;
  }
  function chatPlay(el, o) {
    el.style.opacity = 1;
    const items = [...el.children], d0 = o.delay || 0;
    items.forEach(it => { cancelAnims(it); it.classList.remove('is-shown'); it.style.transform = ''; });
    if (o.instant || REDUCE) { items.forEach(it => { if (!it.dataset.hideAt) it.classList.add('is-shown'); }); return; }
    const show = (it, on) => {
      const vis = items.filter(x => x.classList.contains('is-shown')), r0 = new Map(vis.map(x => [x, x.getBoundingClientRect().top]));
      it.classList.toggle('is-shown', on);
      const k = stageScale || 1, s = sp('snappy');
      vis.forEach(x => { if (x === it) return; const dy = (r0.get(x) - x.getBoundingClientRect().top) / k; if (Math.abs(dy) > .5) play(x, t => ({ transform: `translate3d(0,${(dy * (1 - s.f(t))).toFixed(2)}px,0)` }), s.T, {}); });
      if (on) (FX[it.dataset.anim || (el.classList.contains('is-phone') ? 'rise' : 'ui')] || FX.ui)(it, { dist: 10, spring: 'smooth' });
    };
    items.forEach(it => {
      later(el, d0 + +(it.dataset.at || 0), () => show(it, true));
      if (it.dataset.hideAt) later(el, d0 + +it.dataset.hideAt, () => show(it, false));
    });
    return null;
  }
  function setupCam(cam) {
    const map = {}; (cam.dataset.cam || '').split('|').forEach(p => { const m = p.trim().match(/^(\d+)\s*:\s*([\d.]+)%?\s+([\d.]+)%?\s+([\d.]+)$/); if (m) map[+m[1]] = [+m[2] / 100, +m[3] / 100, +m[4]]; });
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    const target = st => { let v = [.5, .5, 1]; keys.forEach(k => { if (k <= st) v = map[k]; }); return v; };
    const tf = (v, W, H) => { const [px, py, sc] = v; return [clamp(W / 2 - px * W * sc, W - W * sc, 0), clamp(H / 2 - py * H * sc, H - H * sc, 0), sc]; };
    let cur = null;
    const apply = (st, inst) => {
      const W = cam.offsetWidth, H = cam.offsetHeight, to = tf(target(st), W, H), from = cur || to;
      cancelAnims(cam); cur = to;
      const css = v => `translate3d(${v[0].toFixed(1)}px,${v[1].toFixed(1)}px,0) scale(${v[2].toFixed(4)})`;
      if (inst || (from[0] === to[0] && from[1] === to[1] && from[2] === to[2])) { play(cam, () => ({ transform: css(to) }), .05, { keep: true, instant: true }); cam.style.transform = css(to); return; }
      const s = sp(cam.dataset.spring || 'heavy');
      play(cam, t => { const k = s.f(t), v = [0, 1, 2].map(i => lerp(from[i], to[i], k)); return { transform: css(v), filter: `blur(${(Math.sin(Math.PI * clamp(t / (s.T * .55))) * Math.min(8, Math.abs(to[2] - from[2]) * 5)).toFixed(2)}px)` }; }, s.T, { keep: true });
    };
    cam.style.transformOrigin = '0 0';
    return { max: keys.length ? keys[keys.length - 1] : 0, enter(st, inst) { cur = null; apply(st, true); }, step(st, dir, inst) { apply(st, inst); }, reset() { cancelAnims(cam); cur = null; } };
  }
  function Flythrough(box, slide) {
    const cards = [...box.children];
    return () => {
      const t = (performance.now() - (slide._enteredAt || performance.now())) / 1000;
      cards.forEach(c => { const z = +(c.dataset.z || 1), v = +(box.dataset.speed || 34) * (.6 + z * .45); c.style.translate = `${(-v * t).toFixed(1)}px 0`; });
      box.style.scale = (1 + Math.min(.15, t * .025)).toFixed(4);
    };
  }

  /* -------------------------------------------------------- dot-matrix text */
  function setupDotText(el) {
    if (el._dot) return el._dot;
    const text = el.textContent.trim();
    el.textContent = '';
    const wrap = document.createElement('span'); wrap.className = 'sd-dottext';
    const fill = document.createElement('span'); fill.className = 'sd-dottext__fill'; fill.textContent = text;
    const stroke = document.createElement('span'); stroke.className = 'sd-dottext__stroke'; stroke.textContent = text; stroke.setAttribute('aria-hidden', 'true');
    const cv = document.createElement('canvas');
    wrap.append(fill, stroke, cv); el.append(wrap);
    return (el._dot = { wrap, fill, stroke, cv, text, pts: null });
  }
  function sampleDots(d) {
    const cs = getComputedStyle(d.fill), w = Math.ceil(d.fill.offsetWidth), h = Math.ceil(d.fill.offsetHeight), fs = parseFloat(cs.fontSize);
    const oc = document.createElement('canvas'); oc.width = w; oc.height = h;
    const ctx = oc.getContext('2d', { willReadFrequently: true });
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    try { if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing; } catch (e) { /* older browsers */ }
    const m = ctx.measureText(d.text), sx = m.width ? w / m.width : 1;
    const asc = m.fontBoundingBoxAscent || fs * .82, desc = m.fontBoundingBoxDescent || fs * .22;
    ctx.setTransform(sx, 0, 0, 1, 0, 0); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#000';
    ctx.fillText(d.text, 0, (h - (asc + desc)) / 2 + asc);
    const data = ctx.getImageData(0, 0, w, h).data, gap = Math.max(6, Math.round(fs / 10)), pts = [];
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : data[((y | 0) * w + (x | 0)) * 4 + 3];
    const st = gap * .55, nb = gap * .55, taken = [];
    for (let y = st / 2; y < h; y += st) for (let x = st / 2; x < w; x += st) {
      if (A(x, y) < 110) continue;
      if (A(x - nb, y) > 110 && A(x + nb, y) > 110 && A(x, y - nb) > 110 && A(x, y + nb) > 110) continue; // interior
      if (taken.some(q => Math.abs(q.x - x) < gap * .8 && Math.abs(q.y - y) < gap * .8)) continue;
      const q = { x, y }; taken.push(q); pts.push(q);
    }
    pts.forEach(p => { const u = p.x / w; p.t0 = .02 + u * .42 + rand(0, .1); p.ox = 0; p.tOut = .86 + u * .5 + rand(0, .06); if (Math.random() < .08) { p.ox = rand(30, 90); p.t0 -= .06; } p.hue = rand(-8, 8); });
    d.pts = pts; d.gap = gap; d.w = w; d.h = h;
  }
  function dotText(el, o) {
    const d = setupDotText(el);
    el.style.opacity = 1;
    const finish = () => { d.wrap.style.setProperty('--sd-ps', '130%'); d.wrap.style.setProperty('--sd-pf', '130%'); d.wrap.classList.add('is-done'); const c = d.cv.getContext('2d'); c && c.clearRect(0, 0, d.cv.width, d.cv.height); };
    d.wrap.classList.remove('is-done');
    if (o.instant || REDUCE) { finish(); return; }
    d.wrap.style.setProperty('--sd-ps', '-15%'); d.wrap.style.setProperty('--sd-pf', '-15%');
    const startAt = performance.now() + (o.delay || 0);
    const run = () => {
      if (!d.pts || d.w !== Math.ceil(d.fill.offsetWidth)) sampleDots(d);
      const pad = 100, dpr = Math.min(2, window.devicePixelRatio || 1) * Math.max(.5, stageScale);
      const cw = d.w + pad * 2, ch = d.h + pad * 2;
      Object.assign(d.cv.style, { left: -pad + 'px', top: -pad + 'px', width: cw + 'px', height: ch + 'px' });
      d.cv.width = Math.round(cw * dpr); d.cv.height = Math.round(ch * dpr);
      const ctx = d.cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
      const R = d.gap * .4, pop = spring(.34, .42), color = getComputedStyle(el).getPropertyValue('--dot-color').trim() || '#ff8a3a';
      const frame = now => {
        const t = (now - startAt) / 1000;
        if (t < 0) { el._raf = requestAnimationFrame(frame); return; }
        d.wrap.style.setProperty('--sd-ps', lerp(-12, 112, ease.inOut(clamp((t - .34) / .56))).toFixed(2) + '%');
        d.wrap.style.setProperty('--sd-pf', lerp(-12, 116, ease.out(clamp((t - .8) / .62))).toFixed(2) + '%');
        ctx.clearRect(-pad, -pad, cw, ch);
        ctx.fillStyle = color; ctx.beginPath();
        for (const p of d.pts) {
          if (t < p.t0) continue;
          const k = t - p.t0, s = pop.f(k), out = t > p.tOut ? 1 - ease.out(clamp((t - p.tOut) / .22)) : 1, r = R * s * out;
          if (r < .15) continue;
          const x = p.x + p.ox * (1 - ease.expo(clamp(k / .5)));
          ctx.moveTo(x + r, p.y); ctx.arc(x, p.y, r, 0, Math.PI * 2);
        }
        ctx.fill();
        if (t < 1.75) el._raf = requestAnimationFrame(frame); else finish();
      };
      el._raf = requestAnimationFrame(frame);
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(run);
    return null;
  }

  /* ------------------------------------------------- particle assemble */
  function assemble(el, o) {
    el.style.opacity = 1;
    let cv = el._asmCv;
    const target = el.querySelector('img,svg') || el;
    if (!cv) {
      cv = el._asmCv = document.createElement('canvas'); cv.className = 'sd-assemble';
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(cv);
    }
    const kids = [...el.children].filter(c => c !== cv);
    const solid = v => kids.forEach(k => { k.style.opacity = v; });
    const textNodes = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (textNodes.length && !el._asmWrapped) { const sEl = document.createElement('span'); sEl.className = 'sd-assemble__text'; textNodes.forEach(n => sEl.appendChild(n)); el.insertBefore(sEl, cv); el._asmWrapped = sEl; kids.push(sEl); }
    if (o.instant || REDUCE) { solid(''); const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); return; }
    solid(0);
    const run = async () => {
      const w = Math.ceil(el.offsetWidth), h = Math.ceil(el.offsetHeight);
      if (!el._asmPts || el._asmW !== w) {
        const oc = document.createElement('canvas'); oc.width = w; oc.height = h;
        const ctx = oc.getContext('2d', { willReadFrequently: true });
        let img = el.querySelector('img'), box = null;
        const svg = el.querySelector('svg');
        const er = el.getBoundingClientRect(), k = er.width / Math.max(1, el.offsetWidth);
        if (svg && !img) {
          const r = svg.getBoundingClientRect(), c = svg.cloneNode(true); c.style.opacity = '';
          c.setAttribute('width', r.width / k); c.setAttribute('height', r.height / k); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c));
          try { await img.decode(); } catch (e) { img = null; }
          box = [(r.left - er.left) / k, (r.top - er.top) / k, r.width / k, r.height / k];
        } else if (img) { const r = img.getBoundingClientRect(); box = [(r.left - er.left) / k, (r.top - er.top) / k, r.width / k, r.height / k]; }
        const drawText = () => { const t = el._asmWrapped || el, cs = getComputedStyle(t); ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; try { ctx.letterSpacing = cs.letterSpacing; } catch (e) { } ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t.textContent.trim(), w / 2, h / 2 + parseFloat(cs.fontSize) * .04); };
        try { if (img && img.complete && box) ctx.drawImage(img, ...box); else drawText(); } catch (e) { drawText(); }
        let data; try { data = ctx.getImageData(0, 0, w, h).data; } catch (e) { solid(''); return; }
        const gap = Math.max(5, Math.round(Math.min(w, h) / (+(el.dataset.density || 54)))), pts = [];
        const pal = COLORS(), cols = (el.dataset.colors || 'blue,violet,green,orange,cyan,white').split(',').map(c => pal[c.trim()] || c.trim());
        for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) if (data[((y | 0) * w + (x | 0)) * 4 + 3] > 90) {
          const a0 = rand(0, 6.283), r0 = el.dataset.from === 'center' ? rand(0, 24) : rand(380, 1100);
          pts.push({ x, y, a0, r0, d: rand(0, .35), c: cols[(Math.random() * cols.length) | 0], s: rand(.7, 1.3) });
        }
        el._asmPts = pts; el._asmW = w; el._asmH = h; el._asmGap = gap;
      }
      const pts = el._asmPts, gap = el._asmGap, pad = 900, dpr = Math.min(2, window.devicePixelRatio || 1) * Math.max(.5, stageScale);
      const cw = w + pad * 2, ch = h + pad * 2;
      Object.assign(cv.style, { left: -pad + 'px', top: -pad + 'px', width: cw + 'px', height: ch + 'px' });
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
      const cx = w / 2, cy = h / 2, D = +(el.dataset.duration || 2000) / 1000, startAt = performance.now() + (o.delay || 0);
      const frame = now => {
        const t = (now - startAt) / 1000;
        if (t < 0) { el._raf = requestAnimationFrame(frame); return; }
        ctx.clearRect(-pad, -pad, cw, ch);
        const fadeSolid = clamp((t - D) / .5);
        for (const p of pts) {
          const k = ease.out5(clamp((t - p.d) / (D - .35)));
          const a1 = Math.atan2(p.y - cy, p.x - cx), r1 = Math.hypot(p.x - cx, p.y - cy);
          const ang = lerp(p.a0, a1 + (a1 < p.a0 ? 6.283 : 0), k) - (1 - k) * 2.2, r = lerp(p.r0, r1, k);
          const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
          ctx.globalAlpha = clamp(t * 3) * (1 - fadeSolid) * (.55 + .45 * k);
          ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y, gap * .4 * p.s * (1.5 - .6 * k), 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
        solid(fadeSolid.toFixed(3));
        if (t < D + .55) el._raf = requestAnimationFrame(frame); else { ctx.clearRect(-pad, -pad, cw, ch); solid(''); }
      };
      el._raf = requestAnimationFrame(frame);
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(run);
    return null;
  }

  /* ---------------------------------------------------------- carousel */
  function setupCarousel(car) {
    const items = [...car.children];
    const set = (i, inst) => items.forEach((it, j) => {
      if (inst) it.style.transition = 'none';
      it.classList.toggle('is-cur', j === i); it.classList.toggle('is-prev', j === i - 1);
      it.classList.toggle('is-next', j > i); it.classList.toggle('is-far', j < i - 1);
      if (inst) { void it.offsetWidth; it.style.transition = ''; }
    });
    return { max: items.length - 1, enter(step, inst) { set(clamp(step, 0, items.length - 1), true); }, step(step, dir, inst) { set(clamp(step, 0, items.length - 1), inst); }, reset() { } };
  }

  /* ---------------------------------------------------------- dot faces */
  function setupFace(dot) {
    if (dot.querySelector('i')) return;
    const face = (dot.dataset.face || 'o o').split(' ');
    dot.innerHTML = face.map(c => `<i>${c}</i>`).join('');
  }
  function wink(dot, ms = 400) {
    const eyes = dot.querySelectorAll('i'); if (eyes.length < 2) return;
    const e = eyes[eyes.length - 1], prev = e.textContent;
    e.textContent = '<'; e.style.transform = 'rotate(-6deg) scale(1.05)';
    setTimeout(() => { e.textContent = prev; e.style.transform = ''; }, ms);
  }
  function blinkLoop(slide) {
    const dots = [...slide.querySelectorAll('.sd-dot')];
    if (!dots.length) return () => {};
    let alive = true;
    const one = d => { if (!alive) return; d.classList.add('is-blink'); setTimeout(() => d.classList.remove('is-blink'), 130); setTimeout(() => one(d), rand(2400, 5200)); };
    dots.forEach(d => setTimeout(() => one(d), rand(900, 3200)));
    return () => { alive = false; };
  }

  /* ------------------------------------------------------------ tickers */
  const tickers = new Set();
  let last = performance.now();
  function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; tickers.forEach(fn => fn(dt, now)); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  /* starfield on the persistent background */
  function Stars(cv, stage) {
    const ctx = cv.getContext('2d'), N = 420, stars = [];
    let dpr = 1, warp = 0;
    const reset = (s, init) => { s.x = rand(0, W); s.y = rand(0, H); s.z = Math.pow(Math.random(), 2.2); s.tw = rand(0, 6.28); s.r = .4 + s.z * 1.5; if (!init) { s.x = W / 2 + rand(-80, 80); s.y = H / 2 + rand(-50, 50); } };
    for (let i = 0; i < N; i++) { const s = {}; reset(s, true); if (i < 16) { s.z = 1; s.r = rand(2.4, 4.6); s.big = true; } stars.push(s); }
    const size = () => { dpr = Math.min(2, window.devicePixelRatio || 1) * Math.max(.5, stageScale); cv.width = W * dpr; cv.height = H * dpr; };
    size(); window.addEventListener('resize', size);
    return function tick(dt, now) {
      const on = stage.classList.contains('bg-stars') || stage.classList.contains('bg-warp');
      if (!on && !cv._fading) return;
      warp = lerp(warp, stage.classList.contains('bg-warp') ? 1 : 0, 1 - Math.pow(.02, dt));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.tw += dt * (1 + s.z * 2);
        const vx = -(6 + s.z * 22) * (1 - warp);
        let dx = s.x - W / 2, dy = s.y - H / 2;
        const k = warp * (0.4 + s.z * 2.8) * dt;
        const px = s.x, py = s.y;
        s.x += vx * dt + dx * k; s.y += dy * k;
        if (s.x < -20) s.x = W + 20;
        if (s.x > W + 40 || s.y < -40 || s.y > H + 40) reset(s, warp < .2);
        const a = (.25 + .75 * s.z) * (.65 + .35 * Math.sin(s.tw));
        ctx.globalAlpha = a; ctx.fillStyle = '#fff';
        if (warp > .05) { ctx.strokeStyle = '#fff'; ctx.lineWidth = s.r; ctx.beginPath(); ctx.moveTo(px - dx * k * 6 * warp, py - dy * k * 6 * warp); ctx.lineTo(s.x, s.y); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); if (s.big) { const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(s.x - s.r * 5, s.y - s.r * 5, s.r * 10, s.r * 10); ctx.fillStyle = '#fff'; } }
      }
      ctx.globalAlpha = 1;
    };
  }

  /* spiral galaxy canvas (bento micro-loop) */
  function Spiral(cv) {
    const ctx = cv.getContext('2d'), N = +(cv.dataset.count || 1400), arms = +(cv.dataset.arms || 3), P = [];
    for (let i = 0; i < N; i++) { const r = Math.pow(Math.random(), .75); P.push({ r, a: (i % arms) * 6.283 / arms + r * 5.4 + rand(-.45, .45) * (1 - r * .3), s: rand(.6, 1.8), al: rand(.3, 1) }); }
    let rot = 0;
    return dt => {
      const w = cv.offsetWidth, h = cv.offsetHeight; if (!w) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1) * Math.max(.5, stageScale);
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      rot += dt * .22;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .62;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .35); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff';
      for (const p of P) { const a = p.a + rot * (1.7 - p.r); ctx.globalAlpha = p.al * (1 - p.r * .55); ctx.fillRect(cx + Math.cos(a) * p.r * R, cy + Math.sin(a) * p.r * R * .64, p.s, p.s); }
      ctx.globalAlpha = 1;
    };
  }

  /* --------------------------------------------------------------- charts */
  const COLORS = () => { const cs = getComputedStyle(root); const c = n => cs.getPropertyValue('--sd-' + n).trim(); return { blue: c('blue'), cyan: c('cyan'), green: c('green'), orange: c('orange'), red: c('red'), violet: c('violet'), lav: c('lav'), yellow: c('yellow'), white: c('white') }; };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
  function buildChart(el) {
    if (el._chart) return el._chart;
    const type = el.dataset.type || 'line', pal = COLORS();
    const series = (el.dataset.values || '').split('|').map(s => s.split(',').map(Number));
    const labels = (el.dataset.labels || '').split(',').filter(Boolean);
    const colors = (el.dataset.colors || el.dataset.color || 'blue').split(',').map(c => pal[c.trim()] || c.trim());
    const hi = el.dataset.highlight !== undefined ? +el.dataset.highlight : -1;
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const w = el.offsetWidth || 900, h = el.offsetHeight || 500;
    const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}` }, el);
    const max = +(el.dataset.max || Math.max(...series.flat()) * 1.12), min = +(el.dataset.min || 0);
    const parts = { draw: [], pop: [], bars: [], fade: [], wipe: [] };
    if (type === 'stack') {
      const n = series[0].length, padB = labels.length ? 56 : 16, top = 24, cum = [];
      series.forEach((vals, si) => cum.push(vals.map((v, i) => v + (si ? cum[si - 1][i] : 0))));
      const mx = +(el.dataset.max || Math.max(...cum[cum.length - 1]) * 1.08);
      const X = i => w * i / (n - 1), Y = v => h - padB - v / mx * (h - padB - top);
      const line = (vals, rev) => { const P = vals.map((v, i) => [X(i), Y(v)]); if (rev) P.reverse(); let d = ''; P.forEach((p, i) => { if (!i) { d += (rev ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); return; } const p0 = P[i - 2] || P[i - 1], p1 = P[i - 1], p3 = P[i + 1] || p; const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6], c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6]; d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }); return d; };
      const scol = (el.dataset.colors || '#6e7ce8,#44d3e8,#fccb86,#7fe0b5').split(',').map(c => pal[c.trim()] || c.trim());
      const cid = 'c' + Math.random().toString(36).slice(2, 7), defs = svgEl('defs', {}, svg), cp = svgEl('clipPath', { id: cid }, defs);
      const cr = svgEl('rect', { x: 0, y: 0, width: w, height: h }, cp); cr.style.transformBox = 'view-box'; cr.style.transformOrigin = '0 0'; parts.wipe.push(cr);
      const g = svgEl('g', { 'clip-path': `url(#${cid})` }, svg);
      for (let si = cum.length - 1; si >= 0; si--) {
        const lower = si ? cum[si - 1] : cum[0].map(() => 0);
        svgEl('path', { d: line(cum[si]) + ' ' + line(lower, true) + ' Z', fill: scol[si % scol.length], opacity: .95 }, g);
      }
      labels.forEach((l, i) => { const t = svgEl('text', { x: X(Math.round(i * (n - 1) / Math.max(1, labels.length - 1))), y: h - 14, 'text-anchor': i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle' }, svg); t.textContent = l; parts.fade.push(t); });
    } else if (type === 'bar') {
      const vals = series[0], n = vals.length, padB = 60, top = 50, slot = w / n, bw = Math.min(150, slot * .56);
      vals.forEach((v, i) => {
        const bh = (v - min) / (max - min) * (h - padB - top), x = slot * i + (slot - bw) / 2, y = h - padB - bh;
        const col = hi === -1 || hi === i ? (colors[i] || colors[0]) : 'rgba(255,255,255,.16)';
        const g = svgEl('g', {}, svg);
        const r = svgEl('rect', { x, y, width: bw, height: bh, rx: 12, fill: col }, g);
        r.style.transformOrigin = `${x + bw / 2}px ${h - padB}px`; r.style.transformBox = 'view-box';
        parts.bars.push(r);
        const t = svgEl('text', { x: x + bw / 2, y: y - 18, 'text-anchor': 'middle', class: 'val' }, g); t.textContent = pre + v + suf; parts.pop.push(t);
        if (hi !== -1 && hi !== i) t.style.fill = 'var(--sd-ink-3)';
        if (labels[i]) { const l = svgEl('text', { x: x + bw / 2, y: h - padB + 40, 'text-anchor': 'middle' }, g); l.textContent = labels[i]; parts.fade.push(l); }
      });
      svgEl('line', { x1: 0, x2: w, y1: h - padB, y2: h - padB, class: 'grid' }, svg);
    } else {
      const padL = 10, padB = labels.length ? 56 : 16, top = 40, n = series[0].length;
      for (let g = 0; g <= 4; g++) { const y = top + (h - padB - top) * g / 4; const ln = svgEl('line', { x1: padL, x2: w, y1: y, y2: y, class: 'grid' }, svg); parts.fade.push(ln); }
      const X = i => padL + (w - padL - 20) * i / (n - 1), Y = v => h - padB - (v - min) / (max - min) * (h - padB - top);
      for (let q = 0; q < +(el.dataset.scatter || 0); q++) { const c = svgEl('circle', { cx: rand(padL, w - 20), cy: rand(top, h - padB), r: rand(1.5, 3.2), fill: 'rgba(255,255,255,.16)' }, svg); parts.fade.push(c); }
      series.forEach((vals, si) => {
        const col = series.length > 1 && hi !== -1 && hi !== si ? 'rgba(255,255,255,.35)' : (colors[si] || colors[0]);
        const d = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
        if (si === (hi === -1 ? series.length - 1 : hi) && el.dataset.area !== 'false') {
          const id = 'g' + Math.random().toString(36).slice(2, 7), defs = svgEl('defs', {}, svg), lg = svgEl('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
          svgEl('stop', { offset: 0, 'stop-color': col, 'stop-opacity': .28 }, lg); svgEl('stop', { offset: 1, 'stop-color': col, 'stop-opacity': 0 }, lg);
          const area = svgEl('path', { d: d + ` L${X(n - 1)} ${h - padB} L${X(0)} ${h - padB} Z`, fill: `url(#${id})` }, svg); parts.fade.push(area);
        }
        const p = svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': series.length > 1 && hi !== si ? 3 : 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
        parts.draw.push(p);
        if (si === (hi === -1 ? series.length - 1 : hi)) {
          const c = svgEl('circle', { cx: X(n - 1), cy: Y(vals[n - 1]), r: 11, fill: col }, svg); c.style.transformOrigin = `${X(n - 1)}px ${Y(vals[n - 1])}px`; c.style.transformBox = 'view-box'; parts.pop.push(c);
          if (el.dataset.endLabel !== 'false') { const t = svgEl('text', { x: X(n - 1) - 20, y: Y(vals[n - 1]) - 26, 'text-anchor': 'end', class: 'val' }, svg); t.textContent = pre + vals[n - 1] + suf; parts.pop.push(t); }
        }
      });
      labels.forEach((l, i) => { const t = svgEl('text', { x: X(Math.round(i * (n - 1) / Math.max(1, labels.length - 1))), y: h - 14, 'text-anchor': i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle' }, svg); t.textContent = l; parts.fade.push(t); });
    }
    return (el._chart = parts);
  }
  FX.chart = (el, o) => {
    const c = buildChart(el), d0 = o.delay || 0, inst = o.instant;
    el.style.opacity = 1;
    c.fade.forEach(n => play(n, t => ({ opacity: ease.out(clamp(t / .6)) }), .6, { delay: d0, instant: inst }));
    const DD = +(el.dataset.duration || 1500) / 1000;
    c.draw.forEach((p, i) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; play(p, t => ({ strokeDashoffset: (L * (1 - (DD > 3 ? clamp(t / DD) : ease.inOut(clamp(t / DD))))).toFixed(1) }), DD, { delay: d0 + 200 + i * 150, instant: inst }); });
    c.wipe.forEach(r => play(r, t => ({ transform: `scaleX(${ease.inOut(clamp(t / DD)).toFixed(4)})` }), DD, { delay: d0 + 150, instant: inst, keep: true }));
    const bs = sp('chewy');
    c.bars.forEach((b, i) => play(b, t => ({ transform: `scaleY(${Math.max(0, bs.f(t)).toFixed(4)})` }), bs.T, { delay: d0 + 150 + i * 110, instant: inst }));
    const popAt = c.bars.length ? 350 + c.bars.length * 110 : 200 + DD * 1000;
    c.pop.forEach((n, i) => FX.pop(n, { delay: d0 + popAt + i * 60, instant: inst }));
  };

  /* --------------------------------------------------------- quote cloud */
  function setupCloud(cloud) {
    const sets = [...cloud.querySelectorAll(':scope > [data-set]')].sort((a, b) => +a.dataset.set - +b.dataset.set);
    sets.forEach(set => set.querySelectorAll('.sd-qcard').forEach(c => { const z = +(c.dataset.z || 0); c.style.zIndex = 10 - z; }));
    let cur = -1;
    const end = z => ({ opacity: 1 - z * .26, transform: `translate3d(0,0,0) scale(${1 - z * .07})`, filter: `blur(${z * 5}px)` });
    const show = (set, dir, inst) => {
      set.style.visibility = '';
      const s = sp('soft');
      [...set.querySelectorAll('.sd-qcard')].forEach((c, i) => {
        cancelAnims(c); const z = +(c.dataset.z || 0), e = end(z), from = (dir >= 0 ? 1 : -1) * (190 + z * 90);
        play(c, t => { const k = s.f(t); return { opacity: lerp(0, e.opacity, ease.out(clamp(t / .45))), transform: `translate3d(0,${((1 - k) * from).toFixed(1)}px,0) scale(${lerp(1 - z * .07 + .04, 1 - z * .07, k).toFixed(4)})`, filter: `blur(${lerp(22, z * 5, ease.expo(clamp(t / .7))).toFixed(2)}px)` }; }, s.T, { delay: i * 45, keep: true, instant: inst });
      });
      set.querySelectorAll('.sd-cloud__label').forEach(l => { cancelAnims(l); l.style.opacity = ''; FX.rise(l, { delay: 260, instant: inst }); });
    };
    const hide = (set, dir, inst) => {
      const s = sp('smooth');
      set.querySelectorAll('.sd-cloud__label').forEach(l => { cancelAnims(l); play(l, t => ({ opacity: 1 - ease.out(clamp(t / .2)), filter: `blur(${t * 30}px)` }), .25, { keep: true, instant: inst }); });
      [...set.querySelectorAll('.sd-qcard')].forEach((c, i) => {
        cancelAnims(c); const z = +(c.dataset.z || 0), e = end(z), to = -(dir >= 0 ? 1 : -1) * (150 + z * 120);
        play(c, t => { const k = s.f(t); return { opacity: lerp(e.opacity, 0, ease.out(clamp(t / .5))), transform: `translate3d(0,${(k * to).toFixed(1)}px,0) scale(${1 - z * .07})`, filter: `blur(${lerp(z * 5, 18 + z * 6, k).toFixed(2)}px)` }; }, s.T, { delay: i * 25, keep: true, instant: inst });
      });
    };
    return {
      max: sets.length - 1,
      enter(step, inst) { sets.forEach(s => { s.style.visibility = 'hidden'; s.querySelectorAll('.sd-qcard,.sd-cloud__label').forEach(n => { cancelAnims(n); n.style.opacity = 0; }); }); cur = clamp(step, 0, sets.length - 1); show(sets[cur], 1, inst); },
      step(step, dir, inst) { const nx = clamp(step, 0, sets.length - 1); if (nx === cur) return; hide(sets[cur], dir, inst); show(sets[nx], dir, inst); cur = nx; },
      reset() { sets.forEach(s => { s.style.visibility = ''; s.querySelectorAll('.sd-qcard,.sd-cloud__label').forEach(n => { cancelAnims(n); n.style.opacity = ''; }); }); cur = -1; },
    };
  }

  /* ------------------------------------------------------------- deck */
  let stageScale = 1;
  const deck = document.querySelector('.deck');
  if (!deck) { console.warn('[StageDeck] no .deck element'); return; }
  const viewport = document.createElement('div'); viewport.className = 'sd-viewport';
  const stage = document.createElement('div'); stage.className = 'sd-stage';
  stage.innerHTML = '<div class="sd-bg"><div class="sd-bg__base"></div><canvas class="sd-bg__stars"></canvas><div class="sd-glow sd-glow--top"></div><div class="sd-glow sd-glow--left"></div><div class="sd-glow sd-glow--horizon"></div><div class="sd-bg__white"></div><div class="sd-bg__grain"></div><div class="sd-dip"></div></div>';
  deck.parentNode.insertBefore(viewport, deck); viewport.appendChild(stage); stage.appendChild(deck);
  const progress = document.createElement('div'); progress.className = 'sd-progress'; document.body.appendChild(progress);
  const counter = document.createElement('div'); counter.className = 'sd-counter'; document.body.appendChild(counter);

  function fit() {
    if (document.body.classList.contains('is-overview')) { stage.style.transform = ''; stage.style.zoom = (innerWidth / (4 * W + 3 * 80 + 160)).toFixed(4); return; }
    stage.style.zoom = '';
    stageScale = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `scale(${stageScale})`;
  }
  fit(); window.addEventListener('resize', fit);
  tickers.add(Stars(stage.querySelector('.sd-bg__stars'), stage));

  const slides = [...deck.querySelectorAll(':scope > .slide, :scope > section')];
  slides.forEach(s => s.classList.add('slide'));

  /* per-slide preparation */
  slides.forEach(slide => {
    slide.querySelectorAll('[data-anim-children]').forEach(p => [...p.children].forEach(c => { if (!c.dataset.anim) c.dataset.anim = p.dataset.animChildren; }));
    slide.querySelectorAll('.sd-dot').forEach(setupFace);
    slide.querySelectorAll('.sd-qcard,.sd-float').forEach(c => {
      c.style.setProperty('--fd', rand(7, 12).toFixed(1) + 's'); c.style.setProperty('--fdl', (-rand(0, 8)).toFixed(1) + 's');
      c.style.setProperty('--fx', rand(-12, 12).toFixed(0) + 'px'); c.style.setProperty('--fy', rand(-24, -8).toFixed(0) + 'px');
    });
    slide.querySelectorAll('[data-anim="dots"]').forEach(setupDotText);
    slide.querySelectorAll('[data-anim="mask"],[data-anim="typein"]').forEach(splitLines);
    if ((slide.dataset.bg || '').includes('white')) slide.classList.add('on-white');
    slide._steppers = [];
    slide.querySelectorAll('.sd-cloud').forEach(c => slide._steppers.push(setupCloud(c)));
    slide.querySelectorAll('.sd-carousel').forEach(c => slide._steppers.push(setupCarousel(c)));
    slide.querySelectorAll('.sd-cam[data-cam]').forEach(c => slide._steppers.push(setupCam(c)));
    slide.querySelectorAll('.sd-swap').forEach(c => c.setAttribute('data-focus-group', ''));
    slide.querySelectorAll('.sd-chart').forEach(c => { try { buildChart(c); } catch (e) { console.warn('[StageDeck] chart', e); } });
    slide._tick = [];
    slide.querySelectorAll('canvas.sd-spiral').forEach(c => slide._tick.push(Spiral(c)));
    slide.querySelectorAll('.sd-flythrough').forEach(b => slide._tick.push(Flythrough(b, slide)));
    const nums = [];
    slide.querySelectorAll('[data-step]').forEach(e => nums.push(+e.dataset.step));
    slide.querySelectorAll('[data-focus]').forEach(e => e.dataset.focus.split(/[\s,]+/).forEach(n => nums.push(+n)));
    slide.querySelectorAll('[data-done]').forEach(e => nums.push(+e.dataset.done));
    [slide, ...slide.querySelectorAll('[data-step-class]')].forEach(e => { if (e.dataset.stepClass) e.dataset.stepClass.split(/\s+/).forEach(p => nums.push(+p.split(':')[0])); });
    slide.querySelectorAll('[data-until]').forEach(e => nums.push(+e.dataset.until));
    slide.querySelectorAll('[data-scroll-step]').forEach(e => nums.push(+e.dataset.scrollStep));
    slide._steppers.forEach(s => nums.push(s.max));
    slide._max = Math.max(0, ...nums.filter(n => !isNaN(n)));
  });

  const ownStep = (el, slide) => { const s = el.closest('[data-step]'); return s && slide.contains(s) ? s : null; };
  function delayOf(el) {
    let d = +(el.dataset.delay || 0);
    const p = el.parentElement;
    if (p && p.dataset.stagger) {
      const sibs = [...p.children].filter(c => c.dataset.anim);
      let idx = sibs.indexOf(el);
      if (p.dataset.staggerOrder === 'random') { if (!p._order || p._order.length !== sibs.length) { p._order = sibs.map((_, i) => i).sort(() => Math.random() - .5); } idx = p._order[idx]; }
      d += idx * +p.dataset.stagger + (p.dataset.anim ? 0 : +(p.dataset.delay || 0));
    }
    return d;
  }
  function runAnim(el, extraDelay, instant) {
    if (el._keepInstant) { instant = true; el._keepInstant = false; }
    const name = el.dataset.anim || 'rise';
    el.classList.add('is-in');
    cancelAnims(el);
    (FX[name] || FX.rise)(el, { delay: delayOf(el) + (extraDelay || 0), instant });
  }
  function revealGroup(rootEl, slide, extraDelay, instant) {
    // animate rootEl (a [data-step] or the slide) and every [data-anim] whose nearest step owner is rootEl
    const isSlide = rootEl === slide;
    if (!isSlide) {
      if (rootEl.dataset.anim) runAnim(rootEl, extraDelay, instant);
      else { rootEl.classList.add('is-in'); const hasKids = rootEl.querySelector('[data-anim]'); if (!hasKids) runAnim(rootEl, extraDelay, instant); }
    }
    rootEl.querySelectorAll('[data-anim]').forEach(el => {
      if (el === rootEl) return;
      if (ownStep(el, slide) !== (isSlide ? null : rootEl)) return;
      runAnim(el, extraDelay, instant);
    });
  }
  function hideStepEl(el, instant) {
    cancelAnims(el);
    if (instant) { el.classList.remove('is-in'); return; }
    const a = el.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(10px)' }], { duration: 220, easing: 'ease-out', fill: 'both' });
    a.finished.then(() => { el.classList.remove('is-in'); a.cancel(); }).catch(() => {});
  }

  function flipCapture(slide) {
    const m = new Map();
    slide.querySelectorAll('[data-flip]').forEach(el => { const r = el.getBoundingClientRect(); if (r.width || r.height) m.set(el, r); });
    return m;
  }
  function flipPlay(m) {
    m.forEach((r0, el) => {
      cancelAnims(el);
      const r1 = el.getBoundingClientRect(), dx = (r0.left - r1.left) / stageScale, dy = (r0.top - r1.top) / stageScale;
      if (Math.abs(dx) + Math.abs(dy) < 1) return;
      const s = sp(el.dataset.spring || 'chewy');
      play(el, t => { const k = 1 - s.f(t); return { transform: `translate3d(${(dx * k).toFixed(2)}px,${(dy * k).toFixed(2)}px,0)` }; }, s.T, {});
    });
  }
  function applyStep(slide, step, dir, instant) {
    const flips = instant ? null : flipCapture(slide);
    slide.querySelectorAll('[data-until]').forEach(el => el.classList.toggle('is-gone', step >= +el.dataset.until));
    slide.querySelectorAll('[data-step]').forEach(el => {
      const n = +el.dataset.step, isIn = el.classList.contains('is-in');
      if (n <= step && !isIn) revealGroup(el, slide, 0, instant);
      else if (n > step && isIn) {
        hideStepEl(el, instant || el.hasAttribute('data-collapse'));
        el.querySelectorAll('[data-anim]').forEach(c => { if (ownStep(c, slide) === el) { cancelAnims(c); c.classList.remove('is-in'); } });
      }
    });
    slide.querySelectorAll('[data-focus-group]').forEach(g => {
      let any = false;
      [...g.querySelectorAll('[data-focus]')].forEach(it => { const on = it.dataset.focus.split(/[\s,]+/).map(Number).includes(step); it.classList.toggle('is-focus', on); any = any || on; });
      g.classList.toggle('has-focus', any);
    });
    slide.querySelectorAll('[data-done]').forEach(el => el.classList.toggle('is-done', step >= +el.dataset.done));
    slide.querySelectorAll('[data-scroll-step]').forEach(el => { const on = step >= +el.dataset.scrollStep; if (on && !el._scrolled) { el._scrolled = true; FX.scroll(el, { instant }); } else if (!on && el._scrolled) { el._scrolled = false; cancelAnims(el); } });
    [slide, ...slide.querySelectorAll('[data-step-class]')].forEach(el => { if (el.dataset.stepClass) el.dataset.stepClass.split(/\s+/).forEach(p => { const [n, cls] = p.split(':'); el.classList.toggle(cls, step >= +n); }); });
    slide._steppers.forEach(s => s.step(step, dir, instant));
    if (flips) flipPlay(flips);
  }

  function resetSlide(slide) {
    slide.querySelectorAll('[data-anim],[data-step],.sd-mask__in,.sd-word,.sd-char,.sd-bokeh,.sd-bokeh i,svg *').forEach(el => { cancelAnims(el); el.classList.remove('is-in'); });
    slide.querySelectorAll('[data-scroll-step]').forEach(el => { cancelAnims(el); el._scrolled = false; });
    slide.querySelectorAll('[data-keep]').forEach(k => { if (k._keepHidden) { k.style.visibility = ''; k._keepHidden = false; } });
    slide.querySelectorAll('[data-anim]').forEach(el => { if (['mask', 'words', 'dots', 'type', 'draw', 'chart', 'assemble'].includes(el.dataset.anim)) el.style.opacity = ''; });
    slide.querySelectorAll('.is-done,.is-focus,.has-focus,.is-gone').forEach(el => el.classList.remove('is-done', 'is-focus', 'has-focus', 'is-gone'));
    slide._steppers.forEach(s => s.reset());
    if (slide._stopBlink) slide._stopBlink();
    if (slide._tickFns) slide._tickFns.forEach(f => tickers.delete(f));
  }

  let cur = -1, curStep = 0;
  function setBg(slide) {
    stage.className = 'sd-stage ' + (slide.dataset.bg || '').split(/\s+/).filter(Boolean).map(b => 'bg-' + b).join(' ');
  }
  function enter(slide, step, dir) {
    if (slide._leaveAnim) { slide._leaveAnim.cancel(); slide._leaveAnim = null; slide.classList.remove('is-leaving'); }
    resetSlide(slide);
    slide.classList.add('is-active');
    setBg(slide);
    const inst = dir < 0;
    const base = dir === 0 ? 0 : +(slide.dataset.enterDelay || 160);
    revealGroup(slide, slide, base, inst);
    slide.querySelectorAll('[data-autotick]').forEach(ul => { const iv = +ul.dataset.autotick || 600; [...ul.children].forEach((li, i) => later(ul, base + 700 + i * iv, () => li.classList.add('is-done'))); });
    slide._steppers.forEach(s => s.enter(step, inst));
    if (step > 0) applyStep(slide, step, 1, true);
    else applyStep(slide, 0, 1, inst);
    slide._stopBlink = blinkLoop(slide);
    slide._enteredAt = performance.now() + (dir === 0 ? 0 : +(slide.dataset.enterDelay || 160));
    slide._tickFns = slide._tick.slice(); slide._tickFns.forEach(f => tickers.add(f));
  }
  function leave(slide, dir) {
    slide.classList.remove('is-active'); slide.classList.add('is-leaving');
    const type = dir < 0 && slide.dataset.transition === 'dive' ? 'fade' : (slide.dataset.transition || 'fade');
    const to = type === 'push' ? `translate3d(0,${dir >= 0 ? -110 : 110}px,0)` : type === 'zoom' ? 'scale(1.07)' : 'scale(.985)';
    if (type === 'cut' || REDUCE) { slide.classList.remove('is-leaving'); resetSlide(slide); return; }
    let a, hold = 0;
    if (dir >= 0) slide.querySelectorAll('[data-exit="smear"]').forEach(el => { hold = Math.max(hold, smearOut(el) * .7); });
    if (type === 'dip') {
      const dip = stage.querySelector('.sd-dip');
      dip.animate([{ offset: 0, opacity: 0, easing: 'cubic-bezier(.45,0,.55,1)' }, { offset: .39, opacity: 1 }, { offset: .74, opacity: 1, easing: 'cubic-bezier(.22,1,.36,1)' }, { offset: 1, opacity: 0 }], { duration: 1530 });
      a = slide.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards', delay: hold });
    } else if (type === 'dive') {
      slide.style.transformOrigin = slide.dataset.origin || '50% 50%';
      a = slide.animate([
        { offset: 0, opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
        { offset: .55, opacity: 1, filter: 'blur(0px)', transform: 'scale(2.2)' },
        { offset: 1, opacity: 0, filter: 'blur(10px)', transform: `scale(${slide.dataset.diveScale || 7})` }], { duration: 760, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' });
    } else if (type === 'fade' || type === 'beat') {
      a = slide.animate([
        { offset: 0, opacity: 1, filter: 'blur(0px) saturate(1)', transform: 'none' },
        { offset: .45, opacity: .38, filter: 'blur(1.5px) saturate(.25)', transform: 'scale(.995)' },
        { offset: 1, opacity: 0, filter: 'blur(10px) saturate(0)', transform: 'scale(.985)' }], { duration: type === 'beat' ? 350 : 320, easing: 'cubic-bezier(.3,0,.3,1)', fill: 'forwards', delay: hold });
    } else a = slide.animate([{ opacity: 1, filter: 'blur(0px)', transform: 'none' }, { opacity: 0, filter: 'blur(14px)', transform: to }], { duration: type === 'push' ? 420 : 300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    slide._leaveAnim = a;
    a.finished.then(() => { if (slide._leaveAnim !== a) return; slide._leaveAnim = null; a.cancel(); slide.classList.remove('is-leaving'); if (!slide.classList.contains('is-active')) resetSlide(slide); }).catch(() => {});
  }
  function go(i, step = 0, dir) {
    i = clamp(i, 0, slides.length - 1);
    if (dir === undefined) dir = i >= cur ? 1 : -1;
    if (i !== cur) {
      const from = cur >= 0 ? slides[cur] : null;
      if (from) leave(from, dir);
      cur = i; curStep = step === 'end' ? slides[i]._max : step;
      const nxt = slides[i];
      if (from && dir !== 0) {
        const olds = new Map([...from.querySelectorAll('[data-keep]')].map(k => [k.dataset.keep, k]));
        nxt.querySelectorAll('[data-keep]').forEach(k => { const old = olds.get(k.dataset.keep); if (!old) return; old.style.visibility = 'hidden'; old._keepHidden = true; k._keepInstant = true; k.querySelectorAll('[data-anim]').forEach(c => { c._keepInstant = true; }); });
      }
      const seq = { dive: 520, beat: 750, dip: 1130 }[from && dir > 0 ? from.dataset.transition : ''];
      if (seq && !nxt.dataset.enterDelay) { nxt.dataset.enterDelay = seq; nxt._autoDelay = true; }
      enter(nxt, curStep, cur === 0 && dir === 0 ? 0 : dir);
      if (nxt._autoDelay) { delete nxt.dataset.enterDelay; nxt._autoDelay = false; }
    } else if (step !== curStep) {
      const d = step > curStep ? 1 : -1; curStep = step; applyStep(slides[i], curStep, d, false);
    }
    const url = `#${cur + 1}${curStep ? '.' + curStep : ''}`;
    if (location.hash !== url) history.replaceState(null, '', url);
    progress.style.width = ((cur + 1) / slides.length * 100) + '%';
    counter.textContent = `${cur + 1} / ${slides.length}${slides[cur]._max ? ` · ${curStep}/${slides[cur]._max}` : ''}`;
  }
  const next = () => { if (curStep < slides[cur]._max) go(cur, curStep + 1); else if (cur < slides.length - 1) go(cur + 1, 0, 1); };
  const prev = () => { if (curStep > 0) go(cur, curStep - 1); else if (cur > 0) go(cur - 1, 'end', -1); };

  /* input */
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter', 'n'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0, 0, -1);
    else if (k === 'End') go(slides.length - 1, 'end', 1);
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
    else if (k === 'c' || k === 'C') document.body.classList.toggle('show-chrome');
    else if (k === 'o' || k === 'O' || k === 'Escape') { if (k === 'Escape' && !document.body.classList.contains('is-overview')) return; document.body.classList.toggle('is-overview'); fit(); }
    else if (k === 'r' || k === 'R') { const s = slides[cur]; resetSlide(s); s.classList.remove('is-active'); const c = cur; cur = -1; go(c, 0, 1); }
  });
  stage.addEventListener('click', e => {
    if (document.body.classList.contains('is-overview')) { const s = e.target.closest('.slide'); if (s) { document.body.classList.remove('is-overview'); fit(); go(slides.indexOf(s), 0, 1); } return; }
    if (e.target.closest('a,button,input,video,[data-noclick]')) return;
    const r = stage.getBoundingClientRect();
    (e.clientX - r.left) / r.width < .25 ? prev() : next();
  });
  let tx = 0, ty = 0;
  stage.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)(); }, { passive: true });
  window.addEventListener('hashchange', () => { const [a, b] = location.hash.slice(1).split('.'); const i = (+a || 1) - 1, st = +b || 0; if (i !== cur || st !== curStep) go(i, st); });
  window.addEventListener('beforeprint', () => slides.forEach(s => s.querySelectorAll('[data-anim="dots"]').forEach(el => dotText(el, { instant: true }))));

  /* living corner bug: <div class="sd-bug" data-text="Event 2026"> — mark -> color dot -> words type on -> hold -> dot deletes -> mark */
  document.querySelectorAll('.sd-bug').forEach(bug => {
    stage.appendChild(bug);
    bug.innerHTML = '<span class="sd-bug__mark"></span><span class="sd-bug__text"></span><span class="sd-bug__dot"></span>';
    const mark = bug.querySelector('.sd-bug__mark'), txt = bug.querySelector('.sd-bug__text'), dot = bug.querySelector('.sd-bug__dot');
    const words = (bug.dataset.text || '').split(' '), cols = ['var(--sd-violet)', 'var(--sd-green)', 'var(--sd-blue)', 'var(--sd-orange)', 'var(--sd-white)'];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let ci = 0; const cyc = setInterval(() => { dot.style.background = cols[ci++ % cols.length]; }, 130);
    (async function run() {
      if (REDUCE) { txt.textContent = bug.dataset.text || ''; return; }
      for (;;) {
        bug.className = 'sd-bug is-mark'; txt.textContent = '';
        await wait(+(bug.dataset.markHold || 9000));
        bug.className = 'sd-bug is-morph'; await wait(300);
        bug.className = 'sd-bug is-dot'; await wait(900);
        for (let i = 1; i <= words.length; i++) { txt.textContent = words.slice(0, i).join(' '); await wait(130); }
        await wait(+(bug.dataset.hold || 12000));
        const full = txt.textContent;
        for (let n = full.length; n >= 0; n--) { txt.textContent = full.slice(0, n); await wait(36); }
        bug.className = 'sd-bug is-unmorph'; await wait(280);
      }
    })();
  });

  /* start */
  const startDeck = () => { const [a, b] = location.hash.slice(1).split('.'); go(((+a || 1) - 1), +b || 0, 0); };
  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
  fontsReady.then(startDeck);

  window.StageDeck = { go: (n, s) => go(n - 1, s || 0), next, prev, spring, SPRINGS, linearEasing, play, FX, ease, slides };
})();
