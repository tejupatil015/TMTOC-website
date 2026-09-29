/* =====================================================================
   MADHAVI BHABHI — PAPAD & ACHAR  |  Interaction & animation system
   Sections: helpers · loader · flashlight · sound · scroll · nav ·
             reveal · cards · cursor · embers · blood · ghosts ·
             modals · basket · spice meter
   ===================================================================== */
(() => {
  'use strict';

  const root = document.documentElement, body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Cinematic loader ---------- */
  function endLoad() {
    if (body.classList.contains('ready')) return;
    body.classList.add('ready');
    body.classList.remove('loading');
    setTimeout(() => { const l = $('#loader'); if (l) l.remove(); }, 1500);
  }
  const minWait = new Promise(r => setTimeout(r, reduce ? 0 : 1800));
  const pageLoaded = new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }));
  Promise.all([minWait, pageLoaded]).then(endLoad);
  setTimeout(endLoad, 5000); // safety net

  /* ---------- Flashlight + whispers ---------- */
  const whispers = $$('.whisper');
  let mx = innerWidth / 2, my = innerHeight * .4;
  function move(x, y) {
    mx = x; my = y;
    root.style.setProperty('--x', x + 'px');
    root.style.setProperty('--y', y + 'px');
    whispers.forEach(w => {
      const r = w.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
      w.style.opacity = d < 190 ? 1 - d / 190 : 0;
    });
  }
  addEventListener('mousemove', e => move(e.clientX, e.clientY));
  addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  addEventListener('touchstart', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  move(mx, my);

  const lightbtn = $('#lightbtn');
  lightbtn.onclick = function () {
    body.classList.toggle('lights');
    const on = body.classList.contains('lights');
    this.textContent = on ? 'Lights on' : 'Lights off';
    this.setAttribute('aria-pressed', on);
  };

  /* ---------- Sound (synthesised, opt-in only — never autoplays) ---------- */
  let ac = null, soundOn = false, wind = null, pulseT = 0;
  const sbtn = $('#soundbtn'), slabel = $('#soundlabel');

  // visual reaction to sound: equaliser bars + red vignette flash
  function pulse(strong) {
    body.classList.add('sound-hit');
    body.classList.toggle('sound-strong', !!strong);
    clearTimeout(pulseT);
    pulseT = setTimeout(() => body.classList.remove('sound-hit', 'sound-strong'), strong ? 1500 : 450);
  }

  function tone(type, f1, f2, dur, vol, delay = 0) {
    if (!soundOn || !ac) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * .25);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur + .05);
  }
  function wail() { if (!soundOn) return; pulse(true); tone('sine', 300, 700, 1.4, .18); tone('sine', 305, 720, 1.4, .12, .05); tone('triangle', 150, 90, 1.4, .08); }
  function boo() { if (!soundOn) return; pulse(true); tone('sawtooth', 180, 70, .45, .16); }
  function blip() { if (!soundOn) return; pulse(false); tone('sine', 880, 1320, .15, .1); }

  function startWind() {
    if (wind || !ac) return;
    const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = .8;
    const g = ac.createGain(); g.gain.value = .05;
    const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = .15; lg.gain.value = .03;
    l.connect(lg).connect(g.gain); l.start();
    s.connect(f).connect(g).connect(ac.destination); s.start();
    wind = { s, g };
  }

  function growl() {
    if (!soundOn || !ac) return; pulse(true);
    const t = ac.currentTime, d = 1.8;
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(85, t); o.frequency.linearRampToValueAtTime(55, t + d);
    o2.type = 'square'; o2.frequency.setValueAtTime(42, t); o2.frequency.linearRampToValueAtTime(30, t + d);
    f.type = 'lowpass'; f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(520, t + d * .4); f.frequency.linearRampToValueAtTime(200, t + d); f.Q.value = 6;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 26; lg.gain.value = .22;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32, t + .3); g.gain.linearRampToValueAtTime(.22, t + d * .7); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    lfo.connect(lg).connect(g.gain); o.connect(f); o2.connect(f); f.connect(g).connect(ac.destination);
    [o, o2, lfo].forEach(n => { n.start(t); n.stop(t + d + .1); });
    const len = ac.sampleRate * d, b = ac.createBuffer(1, len, ac.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < len; i++) x[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(), bf = ac.createBiquadFilter(), ng = ac.createGain();
    s.buffer = b; bf.type = 'bandpass'; bf.frequency.value = 420; bf.Q.value = 1.2;
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(.1, t + .4); ng.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(bf).connect(ng).connect(ac.destination); s.start(t);
  }
  function howl() {
    if (!soundOn || !ac) return; pulse(true);
    const t = ac.currentTime, d = 3.2, o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(640, t + d * .35); o.frequency.setValueAtTime(640, t + d * .55); o.frequency.exponentialRampToValueAtTime(380, t + d);
    v.frequency.value = 5.5; vg.gain.value = 10; v.connect(vg).connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .8); g.gain.linearRampToValueAtTime(.07, t + d * .7); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); v.start(t); o.stop(t + d + .1); v.stop(t + d + .1);
  }
  function voice(base, delay, vol) {
    if (!soundOn || !ac) return;
    const t = ac.currentTime + delay, d = 3.6, o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1400;
    o.type = 'triangle'; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.9, t + d * .3); o.frequency.setValueAtTime(base * 1.9, t + d * .55); o.frequency.exponentialRampToValueAtTime(base * 1.1, t + d);
    v.frequency.value = 5 + Math.random() * 1.5; vg.gain.value = base * .03; v.connect(vg).connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 1); g.gain.linearRampToValueAtTime(vol * .8, t + d * .7); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(f).connect(g).connect(ac.destination); o.start(t); v.start(t); o.stop(t + d + .1); v.stop(t + d + .1);
  }
  function packHowl() { pulse(true); voice(300, 0, .09); voice(355, .7, .07); voice(260, 1.5, .06); }

  let wolfOn = false;
  function wolfLoop() {
    if (soundOn) { const r = Math.random(); (r < .45 ? growl : r < .7 ? howl : packHowl)(); }
    setTimeout(wolfLoop, 5000 + Math.random() * 6000);
  }

  sbtn.addEventListener('click', () => {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    ac.resume();
    soundOn = !soundOn;
    slabel.textContent = soundOn ? '🔊 Sound on' : '🔇 Sound off';
    sbtn.setAttribute('aria-pressed', soundOn);
    if (soundOn) {
      startWind(); wind.g.gain.value = .05; wail();
      growl(); setTimeout(packHowl, 2200);
      if (!wolfOn) { wolfOn = true; setTimeout(wolfLoop, 4500); }
    } else if (wind) wind.g.gain.value = 0;
  });

  /* ---------- Scroll: progress, parallax, active nav, creeping ghost ---------- */
  const bar = $('#bar'), gh = $('.ghost'), creep = $('#creep'), hero = $('.hero'), fogwrap = $('#fogwrap');
  let ticking = false, creepAt = .35;

  const links = $$('.nav-links a[href^="#"]:not(.nav-cta)');
  const navInd = $('#navind');
  const linkTargets = links.map(a => $(a.getAttribute('href')));
  let activeLink = null;
  function placeIndicator(a) {
    if (!a) { navInd.style.opacity = 0; return; }
    navInd.style.opacity = 1;
    navInd.style.width = a.offsetWidth + 'px';
    navInd.style.transform = 'translate(' + a.offsetLeft + 'px,' + (a.offsetTop + a.offsetHeight + 3) + 'px)';
  }
  function updateActive() {
    let cur = null;
    linkTargets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= innerHeight * .4) cur = links[i]; });
    if (cur !== activeLink) {
      links.forEach(a => a.removeAttribute('aria-current'));
      if (cur) cur.setAttribute('aria-current', 'true');
      activeLink = cur;
      placeIndicator(cur);
    }
  }
  addEventListener('resize', () => placeIndicator(activeLink));

  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? y / max : 0;
    bar.style.transform = 'scaleX(' + p + ')';
    root.style.setProperty('--sp', p.toFixed(3));
    if (!reduce && y < innerHeight * 1.6) {
      hero.style.setProperty('--hp', (y * .28).toFixed(1));
      gh.style.translate = (y * .12) + 'px ' + (y * -.25) + 'px';
      gh.style.opacity = Math.max(0, 1 - y / (innerHeight * .85));
    }
    if (!reduce) fogwrap.style.transform = 'translateY(' + (y * -.05).toFixed(1) + 'px)';
    root.style.setProperty('--dim', body.classList.contains('lights') ? 0 : Math.min(.92, (innerWidth <= 640 ? .72 : .86) + p * .06)); // darker as you go deeper
    if (p > creepAt && p < creepAt + .1 && !creep.classList.contains('go')) {
      creep.classList.add('go'); wail();
      setTimeout(() => {
        creep.classList.remove('go'); creep.style.transition = 'none'; creep.style.left = '-90px';
        setTimeout(() => creep.style.transition = '', 60);
      }, 1800);
      creepAt = 2;
    }
    updateActive();
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // sound hooks
  $$('[data-add]').forEach(b => b.addEventListener('click', blip));
  $('#spice').addEventListener('input', e => { if (+e.target.value >= 3) boo(); else blip(); });

  /* ---------- Scroll-triggered reveals ---------- */
  const revealSets = [
    ['.story>h2', 'blur'], ['.story>div', 'left'], ['.products>h2', 'blur'], ['.card', 'up'],
    ['.meter>*', 'zoom'], ['.order>*', 'up']
  ];
  revealSets.forEach(([sel, kind]) => $$(sel).forEach(el => {
    if (el.classList.contains('whisper')) return;
    el.classList.add('rv'); el.dataset.rv = kind;
  }));
  $$('.card').forEach((c, i) => c.style.transitionDelay = ((i % 3) * 140) + 'ms');

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    io.unobserve(el);
    if (el.classList.contains('card')) {
      // after the entrance finishes, hand control to the 3D tilt system
      setTimeout(() => { el.style.transitionDelay = ''; el.classList.add('settled'); }, 1300);
    }
  }), { threshold: .15 });
  $$('.rv').forEach(el => io.observe(el));

  /* ---------- 3D card tilt + glow ---------- */
  if (finePointer && !reduce) {
    $$('.card').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((px - .5) * 14).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((.5 - py) * 12).toFixed(2) + 'deg');
        c.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        c.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', () => {
        c.style.setProperty('--rx', '0deg');
        c.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Custom horror cursor (mouse users only) ---------- */
  if (finePointer && !reduce) {
    const dot = $('#cdot'), ring = $('#cring');
    let rx = mx, ry = my, dx = mx, dy = my;
    root.classList.add('has-cursor');
    addEventListener('mousemove', e => {
      dx = e.clientX; dy = e.clientY;
      dot.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)';
      dot.classList.remove('away'); ring.classList.remove('away');
    });
    (function loop() {
      rx += (dx - rx) * .16; ry += (dy - ry) * .16;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', e => {
      ring.classList.toggle('hot', !!(e.target.closest && e.target.closest('a,button,input,.card,.ghost')));
    });
    addEventListener('pointerdown', () => ring.classList.add('down'));
    addEventListener('pointerup', () => ring.classList.remove('down'));
    document.addEventListener('mouseleave', () => { dot.classList.add('away'); ring.classList.add('away'); });
  }

  /* ---------- Drifting embers / dust (canvas) ---------- */
  const cv = $('#embers');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, parts = [], running = true;
    const rand = (a, b) => a + Math.random() * (b - a);
    function makeParticle(anywhere) {
      const red = Math.random() < .6;
      return {
        x: rand(0, W), y: anywhere ? rand(0, H) : H + 10, r: rand(.6, 2.2),
        vx: rand(-.15, .15), vy: -rand(.12, .5), a: rand(.15, .6), t: rand(0, 6.28), ts: rand(.005, .02),
        c: red ? '255,42,61' : '236,229,218'
      };
    }
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = W < 640 ? 26 : 58;
      parts = Array.from({ length: n }, () => makeParticle(true));
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.t += p.ts; p.x += p.vx + Math.sin(p.t) * .25; p.y += p.vy;
        if (p.y < -10 || p.x < -10 || p.x > W + 10) Object.assign(p, makeParticle(false));
        const tw = .6 + Math.sin(p.t * 3) * .4;
        ctx.beginPath(); ctx.fillStyle = 'rgba(' + p.c + ',' + (p.a * tw * .18).toFixed(3) + ')';
        ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.fillStyle = 'rgba(' + p.c + ',' + (p.a * tw).toFixed(3) + ')';
        ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    size();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(frame);
    });
    requestAnimationFrame(frame);
  }

  /* ---------- Occasional blood drips along the header ---------- */
  const drips = $('#drips');
  if (drips && !reduce) {
    const n = innerWidth < 640 ? 5 : 10;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('span');
      d.className = 'drip';
      d.style.left = (4 + i * (92 / n) + Math.random() * 6).toFixed(1) + '%';
      d.style.setProperty('--w', (3 + Math.random() * 3).toFixed(1) + 'px');
      d.style.setProperty('--len', (24 + Math.random() * 64).toFixed(0) + 'px');
      d.style.setProperty('--dur', (13 + Math.random() * 10).toFixed(1) + 's');
      d.style.setProperty('--delay', (-Math.random() * 20).toFixed(1) + 's');
      drips.appendChild(d);
    }
  }

  /* ---------- Modals (offer + secret) ---------- */
  const offerBox = $('#offer'), secret = $('#secret');
  let lastFocus = null;
  function openModal(m, focusEl) { lastFocus = document.activeElement; m.classList.add('show'); focusEl.focus({ preventScroll: true }); }
  function closeModal(m) { m.classList.remove('show'); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }

  /* ---------- Flying ghost + special offer ---------- */
  const flyer = $('#flyer');
  let offer = false;
  if (reduce) {
    flyer.style.transform = 'translate(' + Math.max(0, innerWidth - 110) + 'px,' + Math.max(0, innerHeight - 150) + 'px)';
  } else {
    let fx = -100, fy = innerHeight * .35, ft = 0, fdir = 1, fl = performance.now();
    (function fly(now) {
      const dt = Math.min(.05, (now - fl) / 1000); fl = now; ft += dt;
      fx += fdir * (110 + Math.sin(ft * .7) * 40) * dt;
      const yy = fy + Math.sin(ft * 1.6) * 70 + Math.sin(ft * .5) * 40;
      if (fx > innerWidth + 80) { fdir = -1; fy = 60 + Math.random() * (innerHeight - 220); }
      if (fx < -100 && fdir < 0) { fdir = 1; fy = 60 + Math.random() * (innerHeight - 220); }
      flyer.style.transform = 'translate(' + fx + 'px,' + Math.max(30, Math.min(innerHeight - 120, yy)) + 'px)';
      requestAnimationFrame(fly);
    })(performance.now());
  }
  flyer.onclick = () => { openModal(offerBox, $('#claim')); wail(); boo(); };
  $('#claim').onclick = () => {
    offer = true; closeModal(offerBox); flyer.classList.add('done');
    $('#obadge').classList.add('on'); buildWA(); blip();
    $('#order').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  /* secret: type "bhoot" (or click the portrait on touch screens) */
  let typed = '';
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(offerBox); closeModal(secret); return; }
    if (e.key.length !== 1) return;
    typed = (typed + e.key).toLowerCase().slice(-5);
    if (typed === 'bhoot') { openModal(secret, $('#close')); wail(); boo(); }
  });
  $('#close').onclick = () => closeModal(secret);
  gh.addEventListener('click', () => { openModal(secret, $('#close')); wail(); });
  [offerBox, secret].forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModal(m); }));

  /* ---------- Basket + WhatsApp link ---------- */
  let n = 0; const items = [];
  function buildWA() {
    $('#wa').href = 'https://wa.me/910000000000?text=' + encodeURIComponent(
      'Namaste Madhavi Bhabhi, I want to order: ' + (items.join(', ') || 'achar and papad') + (offer ? '. Offer code: BHOOT20' : ''));
  }
  $$('[data-add]').forEach(b => b.onclick = () => {
    n++;
    items.push(b.closest('.card').querySelector('h3').textContent);
    $('#cnt').textContent = n;
    b.textContent = 'Added';
    buildWA();
  });

  /* ---------- Spice meter ---------- */
  const L = [
    ['😇', 'Friendly Ghost: mild', 'Try the Pret Aam Ka Achar.'],
    ['👻', 'Shy Ghost: medium', 'Churail Chatpata Papad is your pick.'],
    ['😈', 'Naughty Bhoot: hot', 'Daayan Lasun Achar. Keep water nearby.'],
    ['🥵', 'Churail: very hot', 'Bhoot Jolokia Achar, one spoon only.'],
    ['💀', 'Rakshas: extreme', 'Bhoot Jolokia with Masaan Papad. Good luck!']
  ];
  $('#spice').addEventListener('input', e => {
    const v = +e.target.value, d = L[v];
    $('#face').textContent = d[0];
    $('#mlabel').textContent = d[1];
    $('#mtip').textContent = d[2];
    body.classList.toggle('hot', v >= 3);
    body.classList.toggle('shake', v === 4 && !reduce);
    if (v === 4) setTimeout(() => body.classList.remove('shake'), 900);
  });
})();