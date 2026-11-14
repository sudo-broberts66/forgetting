(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = n => Math.floor(Math.random() * n);
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  const cite = (id, text) => `<a class="cite" href="#r-${id}">${text}</a>`;
  const CANCEL = Symbol('cancel');

  const store = {
    get(k, d) { try { const v = localStorage.getItem('firstshift.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('firstshift.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const S = { run: 0, voice: canSpeak && store.get('voice', true), sound: store.get('sound', true), tips: 0, best: store.get('best', 0), res: {}, layout: [] };

  /* ---------- sound and speech ---------- */
  let ac = null;
  function blip(freqs, dur = 0.09, type = 'sine', vol = 0.05) {
    if (!S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      let t = ac.currentTime;
      for (const f of freqs) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
        t += dur * 0.9;
      }
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    good: () => blip([660, 880]), bad: () => blip([220, 180], 0.12, 'triangle'),
    coin: () => blip([1040], 0.06), bell: () => blip([784, 1046], 0.14), tick: () => blip([520], 0.04)
  };
  function speak(text, pitch = 1, volume = 1) {
    if (!canSpeak) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1; u.pitch = pitch; u.volume = volume;
    speechSynthesis.speak(u);
  }
  function unlockSpeech() { if (canSpeak) { speechSynthesis.cancel(); speak(' ', 1, 0); } }

  /* ---------- content ---------- */
  const MENU = [
    { id: 'coffee', e: '☕', n: 'coffee' }, { id: 'donut', e: '🍩', n: 'donut' },
    { id: 'soup', e: '🍲', n: 'soup' }, { id: 'bread', e: '🍞', n: 'bread' },
    { id: 'burger', e: '🍔', n: 'burger' }, { id: 'fries', e: '🍟', n: 'fries' },
    { id: 'milk', e: '🥛', n: 'milk' }, { id: 'cookie', e: '🍪', n: 'cookie' },
    { id: 'tea', e: '🍵', n: 'tea' }, { id: 'bagel', e: '🥯', n: 'bagel' },
    { id: 'juice', e: '🧃', n: 'juice' }, { id: 'salad', e: '🥗', n: 'salad' }
  ];
  const ITEM = Object.fromEntries(MENU.map(m => [m.id, m]));
  const PAIRS = [['coffee', 'donut'], ['soup', 'bread'], ['burger', 'fries'], ['milk', 'cookie']];
  const paired = (a, b) => PAIRS.some(p => p.includes(a) && p.includes(b));
  function unrelated(n) {
    for (;;) {
      const o = shuffle(MENU).slice(0, n);
      if (!o.some((it, i) => i && paired(o[i - 1].id, it.id))) return o;
    }
  }
  const NAMES = ['Maya', 'Omar', 'Lena', 'Hugo', 'Priya', 'Sam', 'Nora', 'Felix', 'Ines', 'Kofi', 'Tess', 'Ravi'];

  const LOOKS = [
    { top: '#2a78d6', skin: '#f1c9a5', hair: '#3b2a20', acc: 'cap', accCol: '#e34948', pitch: 1.0, desc: 'blue top and a red cap' },
    { top: '#eb6834', skin: '#8d5a3a', hair: '#1d1512', acc: 'bun', accCol: '#1d1512', pitch: 1.25, desc: 'orange top and hair in a bun' },
    { top: '#1baf7a', skin: '#e0ac7e', hair: '#6b4a2b', acc: 'glasses', accCol: '#1c1c1c', pitch: 0.85, desc: 'green top and glasses' },
    { top: '#6250d6', skin: '#f6d7bd', hair: '#c9772e', acc: 'long', accCol: '#c9772e', pitch: 1.35, desc: 'purple top and long red hair' },
    { top: '#e34948', skin: '#b97c50', hair: '#111111', acc: 'beanie', accCol: '#eda100', pitch: 0.75, desc: 'red top and a yellow beanie' },
    { top: '#eda100', skin: '#f1c9a5', hair: '#d8c26a', acc: 'headphones', accCol: '#333333', pitch: 1.1, desc: 'yellow top and headphones' },
    { top: '#e87ba4', skin: '#7a4a2b', hair: '#111111', acc: 'short', accCol: '#111111', pitch: 0.95, desc: 'pink top and short dark hair' },
    { top: '#008300', skin: '#e0ac7e', hair: '#8a8a8a', acc: 'hat', accCol: '#52514e', pitch: 0.65, desc: 'dark green top and a grey hat' }
  ];
  function avatar(l) {
    const short = `<path d="M26 40 Q26 16 50 16 Q74 16 74 40 Q62 28 50 28 Q38 28 26 40 Z" fill="${l.hair}"/>`;
    const acc = {
      cap: `<path d="M26 36 Q26 14 50 14 Q74 14 74 36 Z" fill="${l.accCol}"/><rect x="58" y="31" width="30" height="6" rx="3" fill="${l.accCol}"/>`,
      bun: short + `<circle cx="50" cy="11" r="9" fill="${l.hair}"/>`,
      glasses: short + `<g fill="none" stroke="${l.accCol}" stroke-width="2.4"><circle cx="40" cy="43" r="7.5"/><circle cx="60" cy="43" r="7.5"/><path d="M47.5 43h5"/></g>`,
      long: short,
      beanie: `<path d="M25 37 Q25 11 50 11 Q75 11 75 37 Z" fill="${l.accCol}"/><rect x="23" y="31" width="54" height="9" rx="4.5" fill="${l.accCol}" stroke="rgba(0,0,0,.25)"/><circle cx="50" cy="9" r="6" fill="${l.accCol}"/>`,
      headphones: short + `<path d="M24 44 Q24 11 50 11 Q76 11 76 44" fill="none" stroke="${l.accCol}" stroke-width="5"/><rect x="17" y="36" width="11" height="17" rx="5" fill="${l.accCol}"/><rect x="72" y="36" width="11" height="17" rx="5" fill="${l.accCol}"/>`,
      short,
      hat: `<path d="M33 27 Q33 5 50 5 Q67 5 67 27 Z" fill="${l.accCol}"/><ellipse cx="50" cy="27" rx="36" ry="6.5" fill="${l.accCol}"/>`
    }[l.acc];
    const back = l.acc === 'long' ? `<path d="M23 44 Q23 14 50 14 Q77 14 77 44 L80 84 Q50 74 20 84 Z" fill="${l.hair}"/>` : '';
    return `<svg viewBox="0 0 100 120" role="img" aria-label="Customer with ${l.desc}">${back}
      <path d="M10 120 Q10 72 50 72 Q90 72 90 120 Z" fill="${l.top}"/>
      <rect x="43" y="58" width="14" height="18" fill="${l.skin}"/>
      <circle cx="50" cy="42" r="24" fill="${l.skin}"/>
      <circle cx="40" cy="43" r="2.7" fill="#1c1c1c"/><circle cx="60" cy="43" r="2.7" fill="#1c1c1c"/>
      <path d="M42 53 Q50 59 58 53" fill="none" stroke="#1c1c1c" stroke-width="2" stroke-linecap="round"/>${acc}</svg>`;
  }

  /* ---------- UI ---------- */
  const app = $('#app');
  const ui = { shift: $('#hud-shift'), tipsWrap: $('#hud-tips'), tips: $('#tips'), cust: $('#cust'), bubble: $('#bubble'), pips: $('#pips'), kicker: $('#kicker'), prompt: $('#prompt'), timer: $('#timer'), work: $('#work'), actions: $('#actions') };
  const PULSE = '<span class="pulse" aria-label="speaking"><i></i><i></i><i></i><i></i></span>';
  const idle = text => { ui.work.innerHTML = `<div class="wait">${text}</div>`; ui.actions.innerHTML = ''; };

  function show(id) { for (const s of $$('.screen')) s.hidden = s.id !== id; window.scrollTo(0, 0); }
  function say(k, p) { ui.kicker.textContent = k; ui.prompt.innerHTML = p; }
  function bubble(html) { ui.bubble.hidden = !html; ui.bubble.innerHTML = html || ''; }
  function enter(look) { ui.cust.innerHTML = avatar(look); ui.cust.classList.remove('out'); sfx.bell(); }
  function leave() { ui.cust.classList.add('out'); bubble(''); }
  function pips(n, i) { ui.pips.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join(''); }
  function setShift(n, name) { ui.shift.textContent = `${n}/3 · ${name}`; }
  function addTips(n) {
    if (!n) return;
    S.tips = Math.max(0, S.tips + n); ui.tips.textContent = S.tips;
    ui.tipsWrap.classList.remove('bump'); void ui.tipsWrap.offsetWidth; ui.tipsWrap.classList.add('bump');
    if (n > 0) sfx.coin();
  }
  function runTimer(secs) {
    const f = ui.timer.firstElementChild;
    ui.timer.classList.add('on');
    f.style.transition = 'none'; f.style.width = '100%';
    void f.offsetWidth;
    f.style.transition = `width ${secs}s linear`; f.style.width = '0%';
  }
  const stopTimer = () => ui.timer.classList.remove('on');

  function actions(btns) {
    ui.actions.innerHTML = '';
    return btns.map(b => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'btn' + (b.ghost ? ' ghost' : ''); el.textContent = b.label;
      el.addEventListener('click', b.on); ui.actions.append(el);
      return el;
    });
  }
  let keyHandler = null;
  document.addEventListener('keydown', e => { if (keyHandler && !$('dialog[open]')) keyHandler(e); });

  function next(label) {
    return new Promise(res => {
      keyHandler = null;
      const [b] = actions([{ label, on: () => { ui.actions.innerHTML = ''; res(); } }]);
      b.focus({ preventScroll: true });
    });
  }
  function intro(kicker, title, bullets, btn) {
    say('', ''); pips(0, 0); stopTimer();
    ui.work.innerHTML = `<div class="intro"><p class="kicker">${kicker}</p><h2>${title}</h2><ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul></div>`;
    return next(btn);
  }

  /* ---------- order: say it, recall it, score it ---------- */
  async function sayOrder(A, items, pitch) {
    bubble(S.voice ? PULSE : '<small>…</small>');
    await A(wait(650));
    for (const it of items) {
      if (S.voice) speak(it.n, pitch); else bubble(`<span class="em" aria-hidden="true">${it.e}</span>${it.n}`);
      await A(wait(750));
      if (!S.voice) bubble('<small>…</small>');
      await A(wait(250));
    }
    await A(wait(S.voice ? 450 : 100));
    bubble('');
  }

  function recall(n) {
    return new Promise(res => {
      const picked = [];
      ui.work.innerHTML = `<div class="tray" id="tray" aria-live="off"></div><div class="tiles">${S.layout.map(it =>
        `<button type="button" class="tile" data-id="${it.id}"><span class="em" aria-hidden="true">${it.e}</span><span class="nm">${it.n}</span></button>`).join('')}</div>`;
      const tray = $('#tray'), tiles = $$('.tile', ui.work);
      const done = () => { keyHandler = null; res([...picked]); };
      const [undo] = actions([{ label: 'Undo', ghost: true, on: () => { picked.pop(); draw(); } }, { label: 'Serve', on: done }]);
      function draw() {
        tray.innerHTML = '<span class="tray-label">Tray</span>' + Array.from({ length: n }, (_, i) => {
          const it = picked[i] && ITEM[picked[i]];
          return `<span class="slot${it ? ' full' : ''}"${it ? ` title="${it.n}"` : ''}>${it ? it.e : ''}</span>`;
        }).join('');
        tiles.forEach(t => t.setAttribute('aria-disabled', picked.includes(t.dataset.id) || picked.length >= n));
        undo.disabled = !picked.length;
      }
      tiles.forEach(t => t.addEventListener('click', () => {
        if (t.getAttribute('aria-disabled') === 'true') return;
        picked.push(t.dataset.id); sfx.tick(); draw();
      }));
      keyHandler = e => {
        if (e.key === 'Backspace') { e.preventDefault(); picked.pop(); draw(); }
        else if (e.key === 'Enter' && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) { e.preventDefault(); done(); }
      };
      draw();
    });
  }

  // longest common subsequence: how many items came back in the right order, and which ones
  function lcs(a, b) {
    const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
    const hits = new Set();
    let i = a.length, j = b.length;
    while (i && j) {
      if (a[i - 1] === b[j - 1]) { hits.add(i - 1); i--; j--; }
      else if (d[i - 1][j] >= d[i][j - 1]) i--; else j--;
    }
    return { len: d[a.length][b.length], hits };
  }
  function reveal(ans, target) {
    const m = lcs(ans, target);
    const slots = (ids, mark) => ids.map((id, i) => `<span class="slot full${mark ? (m.hits.has(i) ? ' hit' : ' miss') : ''}" title="${ITEM[id].n}">${ITEM[id].e}</span>`).join('');
    ui.work.innerHTML = `<p class="tray-cap">You served</p><div class="tray">${slots(ans, true) || '<span class="note">nothing</span>'}</div>
      <p class="tray-cap">They ordered</p><div class="tray">${slots(target, false)}</div>`;
    return m.len;
  }

  async function serveCustomer(A, o) {
    enter(o.look);
    say(o.label, S.voice ? 'Listen…' : 'Watch the speech bubble…');
    idle('Order coming up');
    await A(wait(500));
    await sayOrder(A, o.order, o.look.pitch);
    if (o.between) await o.between();
    say(o.label, `Build the tray: <b>${o.order.length} items</b>, in the order they said them.`);
    const ans = await A(recall(o.order.length));
    const n = reveal(ans, o.order.map(it => it.id));
    const perfect = n === o.order.length;
    addTips(n + (perfect ? 2 : 0));
    if (perfect) sfx.good(); else sfx.bad();
    bubble(perfect ? 'Perfect, thanks!' : n >= o.order.length / 2 ? 'Um… close enough.' : 'That is not what I said…');
    say(o.label, `<b>${n} of ${o.order.length}</b> in the right order.${perfect ? ' Bonus tip.' : ''}`);
    await A(next(o.nextLabel || 'Next customer'));
    leave();
    await A(wait(350));
    return { len: n, perfect };
  }

  /* ---------- the till ---------- */
  function till(ms) {
    const st = { right: 0, wrong: 0 };
    let live = true, correct = 0;
    ui.work.innerHTML = `<div class="till"><p class="kicker">Till · tap the total</p><div class="till-sum" id="sum"></div><div class="till-opts" id="opts"></div><p class="till-fb" id="tfb"></p></div>`;
    ui.actions.innerHTML = '';
    const sumEl = $('#sum'), opts = $('#opts'), fb = $('#tfb');
    function draw() {
      const a = 11 + rand(19), b = 3 + rand(7);
      correct = a + b;
      const alts = shuffle([correct + 1, correct - 1, correct + 2, correct - 2, correct + 10, correct - 10]).slice(0, 2);
      sumEl.textContent = `${a} + ${b}`;
      opts.innerHTML = shuffle([correct, ...alts]).map(v => `<button type="button" data-v="${v}">${v}</button>`).join('');
    }
    function answer(v) {
      if (!live) return;
      if (v === correct) { st.right++; addTips(1); fb.innerHTML = '<span class="ok">✓</span> rung up'; }
      else { st.wrong++; sfx.bad(); fb.innerHTML = `<span class="no">✗</span> that was ${correct}`; }
      draw();
    }
    opts.addEventListener('click', e => { const b = e.target.closest('button'); if (b) answer(+b.dataset.v); });
    keyHandler = e => { if ('123'.includes(e.key) && e.key.length === 1) { const b = opts.children[+e.key - 1]; if (b) answer(+b.dataset.v); } };
    draw(); runTimer(ms / 1000);
    return wait(ms).then(() => { live = false; keyHandler = null; stopTimer(); return st; });
  }

  /* ---------- shift 1: the rush (span + chunking) ---------- */
  async function shift1(A) {
    setShift(1, 'The Rush');
    await A(intro('Shift 1 of 3', 'The Rush', [
      'Each customer says their order <b>once</b>.',
      'Then build the tray <b>in the order they said it</b>.',
      'Orders get longer until you miss twice. Everyone misses. That is the point.'
    ], 'Open the doors'));
    let len = 3, fails = 0, span = 0, lastFail = null, c = 0;
    while (fails < 2 && len <= 7 && c < 7) {
      const got = await serveCustomer(A, { look: LOOKS[c % 7], order: unrelated(len), label: `Customer ${c + 1} · ${len} items` });
      if (got.perfect) { span = len; len++; } else { fails++; lastFail = { len, hit: got.len }; }
      c++;
    }
    const big = shuffle(PAIRS).flat().map(id => ITEM[id]);
    const got = await serveCustomer(A, { look: LOOKS[7], order: big, label: 'Last customer · a big order of 8', nextLabel: 'End of shift' });
    S.res.s1 = { span, lastFail, big: got.len };
  }

  /* ---------- shift 2: the till (Brown–Peterson) ---------- */
  async function shift2(A) {
    setShift(2, 'The Till');
    await A(intro('Shift 2 of 3', 'The Till', [
      'Orders are short now: <b>three items</b> each.',
      'But customers pay first. <b>Ring up sums</b> until the bar runs out. Each one is a tip.',
      'Then build the tray.'
    ], 'Start the shift'));
    const conds = shuffle(['t3', 't18', 't3', 't18']);
    conds.splice(1 + rand(4), 0, 'free');
    const r = { t3: { hit: 0, total: 0 }, t18: { hit: 0, total: 0 }, free: { hit: 0, total: 0 }, sums: 0, tillSecs: 0 };
    for (let c = 0; c < conds.length; c++) {
      const cond = conds[c], secs = cond === 't3' ? 3 : 18, label = `Customer ${c + 1} of ${conds.length}`;
      pips(conds.length, c);
      const got = await serveCustomer(A, {
        look: LOOKS[(c + 2) % 8], order: unrelated(3), label, nextLabel: c < conds.length - 1 ? 'Next customer' : 'End of shift',
        between: async () => {
          if (cond === 'free') {
            say(label, 'The card machine is thinking. <b>Nothing to ring up.</b>');
            idle('Waiting for the card machine…'); runTimer(secs);
            await A(wait(secs * 1000)); stopTimer();
          } else {
            say(label, 'They are paying. <b>Ring up the sums</b> until the bar runs out.');
            const st = await A(till(secs * 1000));
            r.sums += st.right; r.tillSecs += secs;
          }
        }
      });
      r[cond].hit += got.len; r[cond].total += 3;
    }
    S.res.s2 = r;
  }

  /* ---------- shift 3: name on the cup (divided attention) ---------- */
  function matchNames(group, foils) {
    return new Promise(res => {
      const order = shuffle(group), names = shuffle([...group.map(g => g.name), ...foils]), used = new Set(), out = [];
      let i = 0;
      ui.actions.innerHTML = ''; keyHandler = null;
      function step() {
        if (i >= order.length) { res(out); return; }
        const g = order[i];
        enter(g.look); bubble('<small>Is that mine?</small>'); pips(order.length, i);
        say(`Cup ${i + 1} of ${order.length}`, 'This customer is back for their drink. <b>What name did they give?</b>');
        ui.work.innerHTML = `<div class="chips">${names.map(n => `<button type="button" class="chip" data-n="${n}" aria-disabled="${used.has(n)}">${n}</button>`).join('')}</div>`;
      }
      ui.work.onclick = e => {
        const b = e.target.closest('.chip');
        if (!b || b.getAttribute('aria-disabled') === 'true' || i >= order.length) return;
        const g = order[i], ok = b.dataset.n === g.name;
        out.push({ ...g, ok, said: b.dataset.n }); used.add(b.dataset.n);
        if (ok) { sfx.good(); addTips(2); } else sfx.bad();
        i++;
        if (i >= order.length) ui.work.onclick = null;
        step();
      };
      step();
    });
  }

  async function shift3(A) {
    setShift(3, 'Name on the Cup');
    await A(intro('Shift 3 of 3', 'Name on the Cup', [
      'Each customer gives <b>a name for their cup</b>, once.',
      'Sometimes you will be <b>ringing up sums</b> when they say it. Keep ringing.',
      'After four customers, hand each drink to the right name.'
    ], 'Start the shift'));
    const names = shuffle(NAMES), looks = shuffle(LOOKS);
    const r = { free: { hit: 0, total: 0 }, busy: { hit: 0, total: 0 }, sums: 0 };
    for (let b = 0; b < 2; b++) {
      const conds = shuffle(['busy', 'busy', 'free', 'free']);
      const group = conds.map((cond, i) => ({ cond, name: names[b * 4 + i], look: looks[b * 4 + i] }));
      for (let i = 0; i < group.length; i++) {
        const g = group[i], label = `Customer ${i + 1} of 4`;
        const line = S.voice ? PULSE : `<span>It's for <b>${g.name}</b></span>`;
        pips(4, i); enter(g.look);
        if (g.cond === 'busy') {
          say(label, 'Ring up the sums. <b>They will say a name while you work.</b>');
          const t = till(5000);
          await A(wait(1700));
          if (S.voice) speak(`It's for ${g.name}`, g.look.pitch);
          bubble(line);
          await A(wait(1300)); bubble('');
          const st = await A(t);
          r.sums += st.right;
        } else {
          say(label, 'Nothing to ring up. <b>Listen for the name.</b>');
          idle('Till is quiet');
          await A(wait(1000));
          if (S.voice) speak(`It's for ${g.name}`, g.look.pitch);
          bubble(line);
          await A(wait(1300)); bubble('');
          await A(wait(1000));
        }
        leave();
        await A(wait(400));
      }
      const out = await A(matchNames(group, [names[8 + b * 2], names[9 + b * 2]]));
      for (const o of out) { r[o.cond].total++; if (o.ok) r[o.cond].hit++; }
      leave(); pips(0, 0);
      say('Drinks out', `<b>${out.filter(o => o.ok).length} of 4</b> cups went to the right name.`);
      ui.work.innerHTML = `<div class="recap">${out.map(o => `<div>${avatar(o.look)}<b>${o.name}</b><span class="${o.ok ? 'ok' : 'no'}">${o.ok ? '✓' : '✗ you said ' + o.said}</span></div>`).join('')}</div>`;
      await A(next(b === 0 ? 'Next four customers' : 'End of shift'));
    }
    S.res.s3 = r;
  }

  /* ---------- debriefs ---------- */
  const bars = rows => `<div class="bars">${rows.map(r =>
    `<div class="bar-row" title="${r.label}: ${r.v} of ${r.t}"><span>${r.label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct(r.v, r.t)}%"></div></div><span class="bar-val">${r.v} / ${r.t}</span></div>`).join('')}</div>`;
  const technique = (name, text) => `<div class="technique"><p class="kicker">Take this with you</p><p><b>${name}.</b> ${text}</p></div>`;

  function debriefHTML(n) {
    if (n === 1) {
      const r = S.res.s1;
      const un = r.lastFail ? { label: `Unrelated order of ${r.lastFail.len}`, v: r.lastFail.hit, t: r.lastFail.len } : { label: 'Unrelated order of 7', v: 7, t: 7 };
      const helped = pct(r.big, 8) > pct(un.v, un.t);
      return `<p class="kicker">Shift 1 debrief</p><h2>You ran out of room</h2>
        <div class="stat-row"><div class="stat"><b>${r.span || 'none'}</b><span>longest order fully right (items)</span></div><div class="stat"><b>${r.big} / 8</b><span>big order, in the right order</span></div></div>
        <p class="viz-title">Items served in the right order</p>
        <p class="viz-sub">${r.lastFail ? 'The order you dropped, next to the big one.' : 'You never dropped an unrelated order, so the longest one is shown.'}</p>
        ${bars([un, { label: '8 items in 4 familiar pairs', v: r.big, t: 8 }])}
        <p><b>What happened.</b> Working memory holds only a handful of unrelated items at once. In lab tasks people can repeat back about seven digits (${cite('miller', 'Miller, 1956')}). When they cannot rehearse or group the items, the estimate is about four chunks, typically three to five (${cite('cowan', 'Cowan, 2001')}).</p>
        <p><b>Why the big order was different.</b> It had eight items, but they arrived as four pairs you already knew. A familiar group counts as one chunk, so the load was closer to four than to eight (${cite('miller', 'Miller, 1956')}). With more than 230 hours of practice at grouping digits, one student raised his digit span from 7 to 79 (${cite('ericsson', 'Ericsson, Chase &amp; Faloon, 1980')}).</p>
        ${technique('Chunk it', 'Group what you hear into units you already know. Three groups are easier to hold than nine loose items.')}
        <p class="note">One informal run. The big order came last, so some of any gain could be practice.${helped ? '' : ' In this run the pairs did not help, which can happen in a single trial.'}</p>`;
    }
    if (n === 2) {
      const r = S.res.s2;
      const slow = r.tillSecs && r.sums / r.tillSecs < 1 / 4;
      return `<p class="kicker">Shift 2 debrief</p><h2>Three items, gone in seconds</h2>
        <p class="viz-title">Items served in the right order</p>
        <p class="viz-sub">Every order was three items. What changed was what you did before serving it.</p>
        ${bars([{ label: '3 seconds at the till', v: r.t3.hit, t: r.t3.total }, { label: '18 seconds at the till', v: r.t18.hit, t: r.t18.total }, { label: '18 seconds, nothing to do', v: r.free.hit, t: r.free.total }])}
        <p><b>What happened.</b> Three items is well within what you held in Shift 1. The till did not erase the order. It kept you from repeating it to yourself. In the original experiment, students heard three consonants and then counted backward. They recalled the letters on roughly 80% of trials after 3 seconds and roughly 10% after 18 seconds (${cite('peterson', 'Peterson &amp; Peterson, 1959')}; approximate values, as commonly reported from the paper's graph). ${cite('brown', 'Brown (1958)')} had reported the same kind of rapid loss.</p>
        <p><b>Why the card machine was different.</b> You waited the same 18 seconds but had nothing to do, so you were free to keep the order going in your head. In the lab there is also almost no forgetting on the very first trial. It appears as earlier items pile up and get in the way (${cite('keppel', 'Keppel &amp; Underwood, 1962')}).</p>
        ${technique('Say it back', 'Repeating something keeps it available, but only while your attention is free. If you are about to be busy, do not count on holding it in your head.')}
        <p class="note">One informal run with a few orders per bar, so expect noise.${slow ? ' You rang up few sums, so you may have had time to rehearse at the till.' : ''}</p>`;
    }
    const r = S.res.s3;
    return `<p class="kicker">Shift 3 debrief</p><h2>You were busy when it arrived</h2>
      <p class="viz-title">Cups handed to the right name</p>
      <p class="viz-sub">Every name was said once. Half arrived while you were ringing up sums.</p>
      ${bars([{ label: 'Name heard while free', v: r.free.hit, t: r.free.total }, { label: 'Name heard at the till', v: r.busy.hit, t: r.busy.total }])}
      <p><b>What happened.</b> A name that arrives while your attention is on something else is less likely to be stored at all. In experiments, doing a second task while taking in words caused large drops in later memory, while the same second task during recall cost little or nothing (${cite('craik96', 'Craik et al., 1996')}).</p>
      <p><b>The introductions version.</b> People who took turns reading words aloud later remembered the words spoken just before their own turn worse than the rest. This is the next-in-line effect (${cite('brenner', 'Brenner, 1973')}). It is a plausible reason a name vanishes during an introduction, when you are planning what to say yourself. That link is an interpretation. The study tested word lists, not introductions.</p>
      ${technique('Be there when it arrives', 'Stop what you are doing for the two seconds it takes to hear it. Attention at that moment matters more than effort afterwards.')}
      <p class="note">One informal run with four names per bar, and guessing is possible, so chance plays a big part.${r.busy.hit >= r.free.hit ? ' In this run the busy names were not worse.' : ''}</p>`;
  }

  function debrief(n) {
    return new Promise(res => {
      leave(); keyHandler = null;
      $('#debrief').innerHTML = debriefHTML(n) + `<div class="row"><button class="btn" id="deb-next" type="button">${n < 3 ? `On to shift ${n + 1}` : 'See my shift report'}</button></div>`;
      show('scr-debrief');
      $('#deb-next').addEventListener('click', () => res());
    });
  }

  function report() {
    const { s1, s2, s3 } = S.res;
    const isBest = S.tips > S.best;
    if (isBest) { S.best = S.tips; store.set('best', S.best); }
    ui.shift.textContent = 'Shift report';
    $('#report').innerHTML = `<p class="kicker">Shift report</p><h2>Why you forgot what you just heard</h2>
      <div class="stat-row"><div class="stat"><b>${S.tips}</b><span>tips earned${isBest ? ' · new best' : ''}</span></div><div class="stat"><b>${S.best}</b><span>your best on this device</span></div></div>
      <p><b>The short answer.</b> Often it was never stored. What you hear has to fit a workspace of a few chunks, it stays there only while you can rehearse it, and it gets in at all only if you were attending when it arrived.</p>
      <ul class="results">
        <li><b>The Rush.</b> Longest unrelated order fully right: ${s1.span || 'none'}. With eight items in four familiar pairs: ${s1.big} of 8 in order.</li>
        <li><b>The Till.</b> ${s2.t3.hit} of ${s2.t3.total} items after 3 seconds of sums, ${s2.t18.hit} of ${s2.t18.total} after 18 seconds of sums, ${s2.free.hit} of ${s2.free.total} after 18 seconds with nothing to do.</li>
        <li><b>Name on the Cup.</b> ${s3.free.hit} of ${s3.free.total} names heard while free, ${s3.busy.hit} of ${s3.busy.total} heard while at the till.</li>
      </ul>
      <h3>Three things to take with you</h3>
      <ol class="take">
        <li><b>Chunk it.</b> Group new information into units you already know (${cite('miller', 'Miller, 1956')}).</li>
        <li><b>Say it back.</b> Unrehearsed items are lost within seconds (${cite('peterson', 'Peterson &amp; Peterson, 1959')}), so repeat it while your attention is free.</li>
        <li><b>Be there when it arrives.</b> Divided attention while taking something in sharply reduces later memory (${cite('craik96', 'Craik et al., 1996')}).</li>
      </ol>
      <p class="note">This is a game built on simplified versions of laboratory tasks. It cannot measure your memory or compare you with anyone else.</p>
      <div class="row"><button class="btn ghost" id="rep-sources" type="button">Sources</button><button class="btn" id="rep-again" type="button">Play again</button></div>`;
    show('scr-report');
    $('#rep-sources').addEventListener('click', () => openSources());
    $('#rep-again').addEventListener('click', startGame);
  }

  /* ---------- game flow ---------- */
  async function startGame() {
    const run = ++S.run;
    const A = async p => { const v = await p; if (run !== S.run) throw CANCEL; return v; };
    unlockSpeech();
    S.tips = 0; ui.tips.textContent = '0'; S.res = {}; S.layout = shuffle(MENU);
    ui.tipsWrap.hidden = false; app.classList.add('playing');
    leave(); show('scr-play');
    try {
      await shift1(A); await A(debrief(1)); show('scr-play');
      await shift2(A); await A(debrief(2)); show('scr-play');
      await shift3(A); await A(debrief(3));
      report();
    } catch (e) { if (e !== CANCEL) throw e; }
  }
  function quit() {
    S.run++; keyHandler = null;
    if (canSpeak) speechSynthesis.cancel();
    stopTimer(); leave(); ui.work.onclick = null;
    app.classList.remove('playing'); ui.tipsWrap.hidden = true; ui.shift.textContent = '';
    bestNote(); show('scr-title');
  }
  function bestNote() { $('#best-note').textContent = S.best ? `Your best on this device: ${S.best} tips.` : 'About five minutes.'; }

  /* ---------- settings, sources ---------- */
  function setVoice(v) {
    S.voice = !!v && canSpeak; store.set('voice', S.voice);
    for (const id of ['#mode-hear', '#set-hear']) $(id).setAttribute('aria-pressed', S.voice);
    for (const id of ['#mode-read', '#set-read']) $(id).setAttribute('aria-pressed', !S.voice);
    if (!S.voice && canSpeak) speechSynthesis.cancel();
  }
  function setSound(v) {
    S.sound = !!v; store.set('sound', S.sound);
    $('#set-sfx-on').setAttribute('aria-pressed', S.sound); $('#set-sfx-off').setAttribute('aria-pressed', !S.sound);
  }
  const dlgSet = $('#dlg-settings'), dlgSrc = $('#dlg-sources');
  function openSources(id) {
    if (dlgSet.open) dlgSet.close();
    $$('.refs li').forEach(li => li.classList.remove('hl'));
    if (!dlgSrc.open) dlgSrc.showModal();
    const li = id && document.getElementById(id);
    if (li && li.closest('.refs')) { li.classList.add('hl'); li.scrollIntoView({ block: 'center' }); } else dlgSrc.scrollTop = 0;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a.cite');
    if (a) { e.preventDefault(); openSources(a.getAttribute('href').slice(1)); }
  });
  $$('.refs a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });

  $('#mode-hear').addEventListener('click', () => { setVoice(true); unlockSpeech(); speak('Welcome to your first shift'); });
  $('#mode-read').addEventListener('click', () => setVoice(false));
  $('#set-hear').addEventListener('click', () => setVoice(true));
  $('#set-read').addEventListener('click', () => setVoice(false));
  $('#set-sfx-on').addEventListener('click', () => { setSound(true); sfx.good(); });
  $('#set-sfx-off').addEventListener('click', () => setSound(false));
  $('#btn-settings').addEventListener('click', () => dlgSet.showModal());
  $('#btn-close-settings').addEventListener('click', () => dlgSet.close());
  $('#btn-sources').addEventListener('click', () => openSources());
  $('#btn-close-sources').addEventListener('click', () => dlgSrc.close());
  $('#btn-quit').addEventListener('click', () => { dlgSet.close(); quit(); });
  $('#btn-start').addEventListener('click', startGame);

  if (!canSpeak) {
    for (const id of ['#mode-hear', '#set-hear']) $(id).disabled = true;
    $('#mode-note').textContent = 'This browser has no built-in voice, so customers talk on screen.';
  }
  setVoice(S.voice); setSound(S.sound); bestNote();
  $('#title-art').innerHTML = LOOKS.slice(0, 5).map(avatar).join('');
})();
