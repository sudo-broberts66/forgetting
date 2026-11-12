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
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, text) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  };

  function runTimer(el, secs) {
    const f = el.firstElementChild;
    el.classList.add('on');
    f.style.transition = 'none'; f.style.width = '100%';
    void f.offsetWidth;
    f.style.transition = `width ${secs}s linear`; f.style.width = '0%';
  }
  const stopTimer = el => el.classList.remove('on');

  /* ---------- line chart (SVG, responsive, hover + table view) ---------- */
  function lineChart(host, cfg) {
    host.innerHTML = '';
    host.insertAdjacentHTML('beforeend',
      `<p class="viz-title">${cfg.title}</p><p class="viz-sub">${cfg.sub}</p>` +
      (cfg.series.length > 1
        ? `<ul class="legend">${cfg.series.map(s => `<li><span class="swatch ${s.cls}"></span>${s.name}</li>`).join('')}</ul>` : ''));
    const plot = document.createElement('div');
    plot.className = 'plot';
    const tip = document.createElement('div');
    tip.className = 'tip';
    host.append(plot);

    const f = cfg.x.log ? Math.log10 : (v => v);
    const xs = [...new Set(cfg.series.flatMap(s => s.points.map(p => p.x)))].sort((a, b) => a - b);
    const xLabel = v => (cfg.x.ticks.find(t => t.v === v) || {}).full || `${v}`;

    // table view
    const rows = xs.map(x => `<tr><td>${xLabel(x)}</td>${cfg.series.map(s => {
      const p = s.points.find(q => q.x === x); return `<td>${p ? p.y + '%' : 'n/a'}</td>`;
    }).join('')}</tr>`).join('');
    host.insertAdjacentHTML('beforeend',
      `<details class="table"><summary>View as table</summary><table><thead><tr><th>${cfg.x.title}</th>${cfg.series.map(s => `<th>${s.name}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></details>`);

    let lastW = -1;
    function draw() {
      const W = Math.floor(plot.clientWidth);
      if (!W || W === lastW) return;
      lastW = W;
      const direct = cfg.series.length > 1 && W > 540;
      const m = { l: 42, r: direct ? 132 : 18, t: 14, b: 46 };
      const H = Math.round(Math.min(300, Math.max(220, W * 0.5)));
      const sx = v => m.l + (f(v) - f(cfg.x.min)) / (f(cfg.x.max) - f(cfg.x.min)) * (W - m.l - m.r);
      const sy = v => m.t + (1 - v / 100) * (H - m.t - m.b);
      const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': `${cfg.title}. ${cfg.sub}. Values are in the table below the chart.` });

      for (const t of [0, 25, 50, 75, 100]) {
        root.append(svg('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t) }));
        root.append(svg('text', { class: 'axis-text', x: m.l - 8, y: sy(t) + 4, 'text-anchor': 'end' }, t + '%'));
      }
      for (const t of cfg.x.ticks) {
        root.append(svg('text', { class: 'axis-text', x: sx(t.v), y: H - m.b + 18, 'text-anchor': 'middle' }, t.label));
      }
      root.append(svg('text', { class: 'axis-title', x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle' }, cfg.x.title));

      const cross = svg('line', { class: 'cross', y1: m.t, y2: H - m.b });
      root.append(cross);

      const labels = [];
      for (const s of cfg.series) {
        if (s.line !== false && s.points.length > 1) {
          root.append(svg('path', { class: `line ${s.cls}`, d: s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('') }));
        }
        for (const p of s.points) {
          root.append(s.square
            ? svg('rect', { class: `pt ${s.cls}`, x: sx(p.x) - 5, y: sy(p.y) - 5, width: 10, height: 10, rx: 1.5 })
            : svg('circle', { class: `pt ${s.cls}`, cx: sx(p.x), cy: sy(p.y), r: 5 }));
        }
        const last = s.points[s.points.length - 1];
        if (direct && last) labels.push({ y: sy(last.y), x: sx(last.x), text: s.short || s.name });
      }
      if (labels.length === 2 && Math.abs(labels[0].y - labels[1].y) < 16) {
        const mid = (labels[0].y + labels[1].y) / 2, up = labels[0].y <= labels[1].y ? 0 : 1;
        labels[up].y = mid - 8; labels[1 - up].y = mid + 8;
      }
      for (const l of labels) root.append(svg('text', { class: 'dlabel', x: l.x + 12, y: l.y + 4 }, l.text));

      plot.innerHTML = '';
      plot.append(root, tip);

      const show = ev => {
        const r = root.getBoundingClientRect();
        const px = ev.clientX - r.left;
        let best = xs[0];
        for (const x of xs) if (Math.abs(sx(x) - px) < Math.abs(sx(best) - px)) best = x;
        const hits = cfg.series.map(s => ({ s, p: s.points.find(q => q.x === best) })).filter(h => h.p);
        if (!hits.length) return;
        cross.setAttribute('x1', sx(best)); cross.setAttribute('x2', sx(best));
        cross.style.visibility = 'visible';
        tip.innerHTML = `<b>${xLabel(best)}</b>` + hits.map(h =>
          `<div><i style="background:var(--series-${h.s.cls.slice(1)})"></i>${h.s.short || h.s.name}: ${h.p.y}%${h.p.note ? ' (' + h.p.note + ')' : ''}</div>`).join('');
        tip.style.visibility = 'visible';
        const tw = tip.offsetWidth / 2 + 4;
        tip.style.left = Math.max(tw, Math.min(W - tw, sx(best))) + 'px';
        tip.style.top = Math.max(tip.offsetHeight + 4, Math.min(...hits.map(h => sy(h.p.y))) - 12) + 'px';
      };
      const hide = () => { tip.style.visibility = 'hidden'; cross.style.visibility = 'hidden'; };
      root.addEventListener('pointermove', show);
      root.addEventListener('pointerdown', show);
      root.addEventListener('pointerleave', hide);
    }
    new ResizeObserver(draw).observe(plot);
    draw();
  }

  /* ======================= LAB 1: Brown–Peterson ======================= */
  const CONS = 'BCDFGHJKLMNPQRSTVWXZ';
  const bp = { order: [], n: 0, res: [], phase: 'idle', run: 0, target: '', cur: 0, steps: 0 };
  const bpEl = { k: $('#bp-kicker'), big: $('#bp-big'), hint: $('#bp-hint'), timer: $('#bp-timer'), input: $('#bp-input'), btn: $('#bp-btn'), res: $('#bp-results') };

  function bpReset() {
    bp.run++;
    bp.order = shuffle([3, 3, 9, 9, 18, 18]); bp.n = 0; bp.res = []; bp.phase = 'idle';
    bpEl.k.textContent = 'Ready'; bpEl.big.textContent = '· · ·';
    bpEl.hint.textContent = 'Keep counting until the bar runs out. No peeking, no writing down.';
    bpEl.btn.textContent = 'Start round 1 of 6'; bpEl.btn.style.visibility = 'visible';
    bpEl.input.value = ''; bpEl.input.classList.add('idle');
    stopTimer(bpEl.timer);
    bpEl.res.hidden = true;
  }

  async function bpRound() {
    const run = bp.run, delay = bp.order[bp.n];
    bp.target = shuffle(CONS.split('')).slice(0, 3).join('');
    bp.cur = 400 + rand(590); bp.steps = 0;
    bp.phase = 'show';
    bpEl.btn.style.visibility = 'hidden';
    bpEl.input.value = ''; bpEl.input.inputMode = 'numeric'; bpEl.input.classList.add('idle');
    bpEl.input.focus({ preventScroll: true });
    bpEl.k.textContent = `Round ${bp.n + 1} of 6 · remember`;
    bpEl.big.textContent = bp.target.split('').join(' ');
    bpEl.hint.textContent = 'Remember these letters.';
    await wait(2000); if (run !== bp.run) return;

    bp.phase = 'count';
    bpEl.k.textContent = `Round ${bp.n + 1} of 6 · count backward by 3`;
    bpEl.big.textContent = bp.cur;
    bpEl.hint.textContent = `Type ${bp.cur} minus 3, then keep going.`;
    bpEl.input.classList.remove('idle'); bpEl.input.value = '';
    runTimer(bpEl.timer, delay);
    await wait(delay * 1000); if (run !== bp.run) return;

    bp.phase = 'recall';
    stopTimer(bpEl.timer);
    bpEl.k.textContent = `Round ${bp.n + 1} of 6 · recall`;
    bpEl.big.textContent = '? ? ?';
    bpEl.hint.textContent = 'Type the three letters in order, then press Enter. Guess if you are unsure.';
    bpEl.input.value = ''; bpEl.input.inputMode = 'text';
    bpEl.btn.textContent = 'Check'; bpEl.btn.style.visibility = 'visible';
    bpEl.input.focus({ preventScroll: true });
  }

  function bpSubmit() {
    const ans = bpEl.input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    let hits = 0;
    const marks = bp.target.split('').map((c, i) => { const ok = ans[i] === c; if (ok) hits++; return `<span class="${ok ? 'hit' : 'miss'}">${c}</span>`; }).join('');
    bp.res.push({ delay: bp.order[bp.n], hits, steps: bp.steps, round: bp.n + 1 });
    bp.n++;
    bp.phase = 'feedback';
    bpEl.k.textContent = `Round ${bp.n} of 6 · answer`;
    bpEl.big.innerHTML = `<span class="fb">${marks}</span>`;
    bpEl.hint.innerHTML = `You typed <b>${ans || 'nothing'}</b>. ${hits} of 3 letters in the right place after ${bp.res[bp.n - 1].delay} seconds of counting.`;
    bpEl.input.value = ''; bpEl.input.classList.add('idle');
    bpEl.btn.textContent = bp.n < 6 ? `Start round ${bp.n + 1} of 6` : 'See my results';
    bpEl.btn.focus({ preventScroll: true });
  }

  function bpResults() {
    bp.phase = 'done';
    bpEl.k.textContent = 'Done'; bpEl.big.textContent = '✓';
    bpEl.hint.textContent = 'Your results are below.';
    bpEl.btn.textContent = 'Run it again';
    const by = d => bp.res.filter(r => r.delay === d).reduce((a, r) => a + r.hits, 0);
    const steps = bp.res.reduce((a, r) => a + r.steps, 0);
    const first = bp.res[0].hits, later = bp.res.slice(1).reduce((a, r) => a + r.hits, 0) / 5;
    bpEl.res.hidden = false;
    bpEl.res.innerHTML = `
      <h3>Your results</h3>
      <div class="stat-row">
        ${[3, 9, 18].map(d => `<div class="stat"><b>${by(d)} / 6</b><span>letters after ${d} s</span></div>`).join('')}
        <div class="stat"><b>${steps}</b><span>correct counting steps</span></div>
      </div>
      <div class="viz" id="bp-viz"></div>
      <div class="takeaway">
        <p><strong>What the original found.</strong> Students recalled the three-letter item correctly on
        roughly 80% of trials after 3 seconds of counting, and on roughly 10% after 18 seconds
        (${cite('peterson', 'Peterson &amp; Peterson, 1959')}; approximate values, as commonly reported from the
        paper's graph). ${cite('brown', 'Brown (1958)')} had reported the same kind of rapid loss a year earlier,
        which is why this is called the Brown–Peterson task.</p>
        <p><strong>Why it works.</strong> Counting backward does not erase the letters. It keeps you from
        silently repeating them. Without rehearsal, even a load far below your capacity can be out of
        reach within seconds.</p>
        <p class="note">Read your own line loosely. Two rounds per delay cannot give a smooth curve, you were
        scored per letter while the original scored whole items, and slow counting leaves time to rehearse${steps < 12 ? ' (you logged few counting steps, so that may apply here)' : ''}.</p>
      </div>`;
    lineChart($('#bp-viz'), {
      title: 'Recall after counting backward',
      sub: 'Percent correct by seconds of counting. Your score is letters in the right position.',
      x: { min: 2, max: 19, title: 'Seconds of counting before recall', ticks: [3, 6, 9, 12, 15, 18].map(v => ({ v, label: v + ' s', full: v + ' s' })) },
      series: [
        { name: 'You (letters correct)', short: 'You', cls: 's1', points: [3, 9, 18].map(d => ({ x: d, y: pct(by(d), 6) })) },
        { name: 'Peterson & Peterson, 1959 (items correct, approx.)', short: 'Original, 1959', cls: 's2', square: true, line: false, points: [{ x: 3, y: 80, note: 'approx.' }, { x: 18, y: 10, note: 'approx.' }] }
      ]
    });
    $('#bp-order-note').innerHTML = `<strong>Your Lab 1 run:</strong> ${first} of 3 letters on round 1, and an average of ${later.toFixed(1)} of 3 on rounds 2 to 6. The interference account predicts that round 1 is the easiest. A single run cannot test that, but you can see whether yours fits.`;
    bpEl.res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  bpEl.btn.addEventListener('click', () => {
    if (bp.phase === 'idle') bpRound();
    else if (bp.phase === 'recall') bpSubmit();
    else if (bp.phase === 'feedback') (bp.n < 6 ? bpRound() : bpResults());
    else if (bp.phase === 'done') bpReset();
  });
  bpEl.input.addEventListener('input', () => {
    const el = bpEl.input;
    if (bp.phase === 'count') {
      const v = el.value.replace(/\D/g, '');
      el.value = v;
      if (v.length >= 3) {
        const exp = bp.cur - 3;
        if (+v === exp) { bp.steps++; bpEl.hint.innerHTML = '<span class="ok">✓</span> Keep going.'; }
        else bpEl.hint.innerHTML = `<span class="no">✗</span> That was ${exp}. Keep going.`;
        bp.cur = exp; bpEl.big.textContent = exp; el.value = '';
      }
    } else if (bp.phase === 'recall') {
      el.value = el.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    } else el.value = '';
  });
  bpEl.input.addEventListener('keydown', e => { if (e.key === 'Enter' && bp.phase === 'recall') bpSubmit(); });
  bpReset();

  /* ======================= LAB 2: digit span ======================= */
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const ds = { mode: canSpeak ? 'listen' : 'watch', len: 4, fails: 0, best: 0, phase: 'idle', run: 0, seq: [] };
  const dsEl = { k: $('#ds-kicker'), big: $('#ds-big'), hint: $('#ds-hint'), input: $('#ds-input'), btn: $('#ds-btn'), res: $('#ds-results'), listen: $('#ds-listen'), watch: $('#ds-watch'), note: $('#ds-modenote') };

  function dsSetMode(m) {
    ds.mode = m;
    dsEl.listen.setAttribute('aria-pressed', m === 'listen');
    dsEl.watch.setAttribute('aria-pressed', m === 'watch');
    if (ds.phase !== 'idle') dsReset();
  }
  if (!canSpeak) { dsEl.listen.disabled = true; dsEl.note.textContent = 'This browser has no built-in voice, so digits are shown on screen.'; }
  dsSetMode(ds.mode);
  dsEl.listen.addEventListener('click', () => dsSetMode('listen'));
  dsEl.watch.addEventListener('click', () => dsSetMode('watch'));

  function dsReset() {
    ds.run++; ds.len = 4; ds.fails = 0; ds.best = 0; ds.phase = 'idle';
    if (canSpeak) speechSynthesis.cancel();
    dsEl.k.textContent = 'Ready'; dsEl.big.textContent = '· · ·';
    dsEl.hint.textContent = 'Wait until the digits stop before you type.';
    dsEl.btn.textContent = 'Start with 4 digits'; dsEl.btn.disabled = false;
    dsEl.input.value = ''; dsEl.input.classList.add('idle');
    dsEl.res.hidden = true;
  }

  function speak(text, volume = 1) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1; u.volume = volume;
    speechSynthesis.speak(u);
  }

  async function dsTrial() {
    const run = ds.run;
    ds.seq = [];
    while (ds.seq.length < ds.len) { const d = rand(10); if (d !== ds.seq[ds.seq.length - 1]) ds.seq.push(d); }
    ds.phase = 'present';
    dsEl.btn.disabled = true; dsEl.btn.textContent = '…';
    dsEl.input.value = ''; dsEl.input.classList.add('idle');
    dsEl.input.focus({ preventScroll: true });
    dsEl.k.textContent = `${ds.len} digits`;
    const listen = ds.mode === 'listen';
    if (listen) { speechSynthesis.cancel(); speak(' ', 0); }
    dsEl.big.innerHTML = listen ? '<span class="pulse"><i></i><i></i><i></i><i></i></span>' : '';
    dsEl.hint.textContent = listen ? 'Listen…' : 'Watch…';
    await wait(900); if (run !== ds.run) return;
    for (const d of ds.seq) {
      if (listen) speak(String(d)); else dsEl.big.textContent = d;
      await wait(750); if (run !== ds.run) return;
      if (!listen) dsEl.big.textContent = '';
      await wait(250); if (run !== ds.run) return;
    }
    await wait(listen ? 500 : 100); if (run !== ds.run) return;
    ds.phase = 'recall';
    dsEl.big.textContent = '?';
    dsEl.hint.textContent = 'Type the digits in order, then press Enter.';
    dsEl.input.classList.remove('idle'); dsEl.input.value = '';
    dsEl.input.focus({ preventScroll: true });
    dsEl.btn.disabled = false; dsEl.btn.textContent = 'Check';
  }

  function dsSubmit() {
    const ans = dsEl.input.value.replace(/\D/g, ''), target = ds.seq.join('');
    const ok = ans === target;
    dsEl.big.innerHTML = `<span class="fb">${ds.seq.map((c, i) => `<span class="${ans[i] === String(c) ? 'hit' : 'miss'}">${c}</span>`).join('')}</span>`;
    dsEl.input.value = ''; dsEl.input.classList.add('idle');
    ds.phase = 'feedback';
    if (ok) {
      ds.best = ds.len; ds.len++; ds.fails = 0;
      dsEl.hint.innerHTML = `<span class="ok">Correct.</span> You typed ${ans}.`;
      dsEl.btn.textContent = ds.len > 12 ? 'See my result' : `Next: ${ds.len} digits`;
    } else {
      ds.fails++;
      dsEl.hint.innerHTML = `<span class="no">Not quite.</span> You typed ${ans || 'nothing'}.`;
      dsEl.btn.textContent = ds.fails >= 2 ? 'See my result' : `Try ${ds.len} digits again`;
    }
    dsEl.btn.focus({ preventScroll: true });
  }

  function dsResults() {
    ds.phase = 'done';
    dsEl.k.textContent = 'Done'; dsEl.big.textContent = '✓'; dsEl.hint.textContent = 'Your result is below.';
    dsEl.btn.textContent = 'Run it again';
    const n = ds.best;
    dsEl.res.hidden = false;
    dsEl.res.innerHTML = `
      <h3>${n ? `Your span in this run: ${n} digits` : 'No list recalled this time'}</h3>
      <div class="span-strip" role="img" aria-label="Scale from 1 to 12 digits with your span of ${n} filled in">
        ${Array.from({ length: 12 }, (_, i) => `<div class="${i < n ? 'fill' : ''}">${i + 1}</div>`).join('')}
      </div>
      <div class="span-marks" aria-hidden="true">
        <div style="grid-column:4 / span 3">≈ 4 chunks, no rehearsal</div>
        <div style="grid-column:7 / span 6">≈ 7 digits, typical span</div>
      </div>
      <div class="takeaway">
        <p><strong>Two numbers to compare with.</strong> People can typically repeat back about seven digits
        (${cite('miller', 'Miller, 1956')}). When rehearsing and grouping are prevented, the estimate of what
        the workspace itself holds is about four chunks, usually three to five (${cite('cowan', 'Cowan, 2001')}).</p>
        <p><strong>Notice how you did it.</strong> If you got past four or five, you probably repeated the
        digits silently or grouped them in twos and threes. That is rehearsal and chunking doing the work.
        In a conversation the speaker keeps talking, so you rarely get the quiet second you had here.</p>
        <p class="note">One short run is a rough estimate. ${n ? '' : 'Missing at four digits usually means a slip of attention or a typing error. Try again. '}Span varies with the voice, the pace and how you type.</p>
      </div>`;
    dsEl.res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  dsEl.btn.addEventListener('click', () => {
    if (ds.phase === 'idle') dsTrial();
    else if (ds.phase === 'recall') dsSubmit();
    else if (ds.phase === 'feedback') ((ds.fails >= 2 || ds.len > 12) ? dsResults() : dsTrial());
    else if (ds.phase === 'done') dsReset();
  });
  dsEl.input.addEventListener('input', () => {
    dsEl.input.value = ds.phase === 'recall' ? dsEl.input.value.replace(/\D/g, '').slice(0, 14) : '';
  });
  dsEl.input.addEventListener('keydown', e => { if (e.key === 'Enter' && ds.phase === 'recall') dsSubmit(); });

  /* ======================= LAB 3: chunking ======================= */
  const POOL = ['USB', 'PDF', 'GPS', 'DNA', 'ATM', 'FAQ', 'VIP', 'CEO', 'DIY', 'URL', 'SMS', 'GIF'];
  const ch = { phase: 'idle', run: 0, round: 0, sets: [], shown: [], scores: [] };
  const chEl = { k: $('#ch-kicker'), big: $('#ch-big'), hint: $('#ch-hint'), timer: $('#ch-timer'), input: $('#ch-input'), btn: $('#ch-btn'), res: $('#ch-results') };

  function lcs(a, b) {
    const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
    return d[a.length][b.length];
  }

  function chReset() {
    ch.run++; ch.phase = 'idle'; ch.round = 0; ch.scores = [];
    const picks = shuffle(POOL);
    ch.sets = [picks.slice(0, 4), picks.slice(4, 8)];
    let scr;
    do { scr = shuffle(ch.sets[0].join('').split('')).join(''); } while (POOL.some(p => scr.includes(p)));
    ch.shown = [scr, ch.sets[1].join('')];
    chEl.k.textContent = 'Ready'; chEl.big.textContent = '· · · · · · · · · · · ·';
    chEl.hint.textContent = 'Just look. Typing starts when the letters disappear.';
    chEl.btn.textContent = 'Show round 1'; chEl.btn.style.visibility = 'visible';
    chEl.input.value = ''; chEl.input.classList.add('idle');
    stopTimer(chEl.timer);
    chEl.res.hidden = true;
  }

  async function chRound() {
    const run = ch.run;
    ch.phase = 'show';
    chEl.btn.style.visibility = 'hidden';
    chEl.input.value = ''; chEl.input.classList.add('idle');
    chEl.input.focus({ preventScroll: true });
    chEl.k.textContent = `Round ${ch.round + 1} of 2 · look`;
    chEl.big.textContent = ch.shown[ch.round];
    chEl.hint.textContent = 'Remember as many as you can, in order.';
    runTimer(chEl.timer, 6);
    await wait(6000); if (run !== ch.run) return;
    stopTimer(chEl.timer);
    ch.phase = 'recall';
    chEl.k.textContent = `Round ${ch.round + 1} of 2 · recall`;
    chEl.big.textContent = '? ? ?';
    chEl.hint.textContent = 'Type the letters in order, then press Enter.';
    chEl.input.classList.remove('idle');
    chEl.input.focus({ preventScroll: true });
    chEl.btn.textContent = 'Check'; chEl.btn.style.visibility = 'visible';
  }

  function chSubmit() {
    const ans = chEl.input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12);
    const score = lcs(ans, ch.shown[ch.round]);
    ch.scores.push(score);
    ch.phase = 'feedback';
    chEl.big.textContent = ch.shown[ch.round];
    chEl.hint.innerHTML = `You typed <b>${ans || 'nothing'}</b>: ${score} of 12 letters in the right order.`;
    chEl.input.value = ''; chEl.input.classList.add('idle');
    ch.round++;
    chEl.btn.textContent = ch.round < 2 ? 'Show round 2' : 'See what changed';
    chEl.btn.focus({ preventScroll: true });
  }

  function chResults() {
    ch.phase = 'done';
    chEl.k.textContent = 'Done'; chEl.big.textContent = '✓'; chEl.hint.textContent = 'Your results are below.';
    chEl.btn.textContent = 'Run it again with new letters';
    const [a, b] = ch.scores;
    const bar = (label, v) => `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct(v, 12)}%"></div></div><span class="bar-val">${v} / 12</span></div>`;
    chEl.res.hidden = false;
    chEl.res.innerHTML = `
      <h3>Same number of letters, different load</h3>
      <div class="bars" role="img" aria-label="Round 1: ${a} of 12 letters. Round 2: ${b} of 12 letters.">
        ${bar('Round 1 · scrambled', a)}${bar('Round 2 · groupable', b)}
      </div>
      <div class="takeaway">
        <p><strong>What was different.</strong> Round 2 was <b>${ch.sets[1].join(' · ')}</b>: four familiar
        abbreviations. Round 1 was <b>${ch.sets[0].join(' · ')}</b> with the letters shuffled, so there was
        nothing to group them by.</p>
        <p><strong>Why it matters.</strong> Twelve unrelated letters overflow the workspace. Four units you
        already know do not, because each one counts as a single chunk
        (${cite('miller', 'Miller, 1956')}). What you already have in long-term memory decides how much new
        material you can hold.</p>
        <p class="note">Caveats: round 2 always came second, so part of any gain could be practice, and the
        effect depends on your knowing the abbreviations.${b <= a ? ' In this run you did not do better on round 2, which can happen in a single trial.' : ''}</p>
      </div>`;
    chEl.res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  chEl.btn.addEventListener('click', () => {
    if (ch.phase === 'idle') chRound();
    else if (ch.phase === 'recall') chSubmit();
    else if (ch.phase === 'feedback') (ch.round < 2 ? chRound() : chResults());
    else if (ch.phase === 'done') chReset();
  });
  chEl.input.addEventListener('input', () => {
    chEl.input.value = ch.phase === 'recall' ? chEl.input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12) : '';
  });
  chEl.input.addEventListener('keydown', e => { if (e.key === 'Enter' && ch.phase === 'recall') chSubmit(); });
  chReset();

  /* ======================= stages ======================= */
  const STAGES = [
    {
      what: `For a moment after a sound ends, a fairly raw trace of it remains available. Researchers call this echoic (auditory sensory) memory.`,
      lost: `It is brief. ${cite('darwin', 'Darwin, Turvey &amp; Crowder (1972)')} played listeners three spoken lists at once and then signalled which one to report. The signal helped only if it came within about 4 seconds of the sounds ending. After that, whatever had not already been picked out was no longer there to report.`,
      means: `Anything you were not listening to has a window of a few seconds in which it can still be picked up. Then the next sounds have arrived and that chance is over.`
    },
    {
      what: `Only what you attend to is processed enough to be remembered later. Attention works like a gate between hearing something and being able to recall it.`,
      lost: `When people did a second task while hearing a list of words, their later memory for the words dropped sharply. The same second task during recall cost much less (${cite('craik96', 'Craik et al., 1996')}). In another study people took turns reading words aloud to a group, and later recalled the words spoken just before their own turn worse than the rest: the “next-in-line effect” (${cite('brenner', 'Brenner, 1973')}).`,
      means: `This is a plausible reason a name vanishes during an introduction: at the moment it is spoken, your attention is on what you are about to say. That link is an interpretation. Brenner tested word lists, not introductions.`
    },
    {
      what: `What gets through is held in working memory, the small workspace for whatever you are thinking about right now.`,
      lost: `It is limited in two ways. <b>Capacity:</b> people can repeat back about seven digits (${cite('miller', 'Miller, 1956')}), and about four chunks once rehearsal and grouping are prevented (${cite('cowan', 'Cowan, 2001')}). <b>Duration:</b> without rehearsal, contents become unavailable in seconds. Students who counted backward after hearing three consonants recalled them on roughly 80% of trials after 3 seconds and roughly 10% after 18 seconds (${cite('peterson', 'Peterson &amp; Peterson, 1959')}, approximate values; see also ${cite('brown', 'Brown, 1958')}).`,
      means: `Labs 1 and 2 above are simplified versions of these tasks. In ordinary listening, new words keep arriving and you seldom get to rehearse the old ones.`
    },
    {
      what: `To outlast the moment, information has to be encoded into long-term memory.`,
      lost: `Holding something in mind does not store it by itself. ${cite('craik72', 'Craik &amp; Lockhart (1972)')} proposed that how durable a memory is depends on how deeply the material is processed. In the tests that followed, words that people had judged for meaning were remembered far better than words judged for their sound or typeface, even when people were not expecting a memory test (${cite('craik75', 'Craik &amp; Tulving, 1975')}).`,
      means: `Hearing a fact and thinking “got it” is shallow processing. Asking what it means, or tying it to something you know, is what gives it a place to stay. Lab 3 shows the other side of this: what you already know shapes how much you can take in.`
    }
  ];
  const tabs = $$('.tabs [role="tab"]'), panel = $('#panel');
  function selectStage(i, focus) {
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
    $$('.funnel .band').forEach((b, j) => b.classList.toggle('on', j === i));
    panel.setAttribute('aria-labelledby', 'tab-' + i);
    const s = STAGES[i];
    panel.innerHTML = `<dl><div><dt>What it is</dt><dd>${s.what}</dd></div><div><dt>How things are lost here</dt><dd>${s.lost}</dd></div><div><dt>What that means for you</dt><dd>${s.means}</dd></div></dl>`;
    if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectStage(i));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectStage((i + 1) % 4, true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectStage((i + 3) % 4, true); }
    });
  });
  selectStage(0);

  /* ======================= Ebbinghaus chart ======================= */
  const EBB = [[19, 58.2, '19m', '19 minutes'], [63, 44.2, '63m', '63 minutes'], [525, 35.8, '8.8h', '8.75 hours'], [1440, 33.7, '1d', '1 day'], [2880, 27.8, '2d', '2 days'], [8640, 25.4, '6d', '6 days'], [44640, 21.1, '31d', '31 days']];
  lineChart($('#ebb-viz'), {
    title: 'Ebbinghaus (1885): savings when relearning',
    sub: 'Percent of the original learning time saved. One participant, lists of nonsense syllables.',
    x: { min: 14, max: 60000, log: true, title: 'Time since learning (log scale)', ticks: EBB.map(e => ({ v: e[0], label: e[2], full: e[3] })) },
    series: [{ name: 'Savings', cls: 's1', points: EBB.map(e => ({ x: e[0], y: e[1] })) }]
  });
})();
