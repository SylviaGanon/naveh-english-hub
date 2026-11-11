/* Nave English Hub - shared engine.
   NaveQuiz.start({...}) runs any lesson or weekly test page from a word list.
   NaveIndex.home() / NaveIndex.list('topics'|'quizzes') build the menu pages from assets/registry.js. */
(function () {
  'use strict';

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const h = (tag, props, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => { if (c != null && c !== false) e.append(c); });
    return e;
  };

  /* ---------- Voice: female English by default, dropdown to change, choice remembered ---------- */
  const PREFER = ['samantha', 'karen', 'zira', 'aria', 'jenny', 'google us english', 'victoria', 'female'];
  const Voice = {
    list: [], cur: null, select: null,
    load() {
      if (!('speechSynthesis' in window)) return;
      this.list = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
      if (!this.list.length || !this.select) return;
      const saved = store.get('nave-voice', '');
      let best = this.list.findIndex(v => v.name === saved);
      if (best < 0) {
        let rank = 99; best = 0;
        this.list.forEach((v, i) => {
          const r = PREFER.findIndex(p => v.name.toLowerCase().includes(p));
          if (r >= 0 && r < rank) { rank = r; best = i; }
        });
      }
      this.select.replaceChildren(...this.list.map((v, i) => h('option', { value: String(i) }, v.name)));
      this.select.value = String(best); this.cur = this.list[best];
    },
    pick() { this.cur = this.list[this.select.value]; if (this.cur) store.set('nave-voice', this.cur.name); this.say('Hello Nave'); },
    say(text) {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.8;
      if (this.cur) u.voice = this.cur;
      speechSynthesis.speak(u);
    }
  };
  const cheer = () => { if (window.confetti && !matchMedia('(prefers-reduced-motion:reduce)').matches) confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } }); };

  /* ---------- Lesson / weekly test page ----------
     cfg: id, title, words:[{en,he,icon?,sentence?}], back?, testTitle?, modules?, print? */
  function start(cfg) {
    const W = cfg.words;
    const MODS = cfg.modules || ['learn', 'mc', 'type', 'review'];
    const CAN_PRINT = cfg.print !== false;
    const META = { learn: ['📖', 'לימוד'], mc: ['👆', 'בחירה'], type: ['⌨️', 'הקלדה'], review: ['🔁', 'חזרה'] };
    const S = { li: 0, shuf: { mc: true, type: true, review: true }, mc: null, type: null, review: null };
    const sel = new Set(W.map(w => w.en));

    let view = (location.hash || '').slice(1);
    if (!(MODS.includes(view) || (view === 'print' && CAN_PRINT))) view = MODS[0];

    const voiceSel = h('select', { id: 'voice', 'aria-label': 'בחירת קול', onchange: () => Voice.pick() });
    Voice.select = voiceSel;
    const bar = h('div', { class: 'bar' },
      h('a', { class: 'back', href: cfg.back || 'index.html' }, '→ חזרה'),
      voiceSel,
      CAN_PRINT ? h('button', { class: 'teach', onclick: () => go('print') }, 'למורה') : null);
    const stage = h('main', { class: 'wrap' });
    const tabs = h('nav', { class: 'tabs', 'aria-label': 'שלבים' });
    document.getElementById('app').replaceChildren(bar, stage, tabs);
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => Voice.load();
    Voice.load();

    const go = v => { if (v !== view) S[view] = null; view = v; render(); scrollTo(0, 0); };
    const speaker = text => h('button', { class: 'snd', 'aria-label': 'השמע', onclick: () => Voice.say(text) }, '🔊');
    const counter = (i, n) => `${Math.min(i + 1, n)} / ${n}`;

    function state(m) {
      if (!S[m]) S[m] = { deck: S.shuf[m] ? shuffle(W) : [...W], i: 0, score: 0, miss: new Set(), tries: 0, show: false };
      return S[m];
    }
    function shufRow(m, text) {
      const cb = h('input', { type: 'checkbox', onchange: () => { S.shuf[m] = cb.checked; S[m] = null; render(); } });
      cb.checked = S.shuf[m];
      return h('div', { class: 'row2' }, h('span', { class: 'cnt' }, text), h('label', { class: 'sw' }, cb, h('span'), 'ערבוב'));
    }

    function render() {
      stage.replaceChildren();
      tabs.hidden = view === 'print' || MODS.length < 2;
      tabs.replaceChildren(h('div', {}, MODS.map(m => h('button', { role: 'tab', 'aria-selected': String(m === view), onclick: () => go(m) }, h('b', {}, META[m][0]), META[m][1]))));
      ({ learn: learnView, mc: mcView, type: typeView, review: reviewView, print: printView })[view]();
    }

    /* 1. Teach - Next button on TOP so answers stay hidden while screen sharing */
    function learnView() {
      const w = W[S.li], last = S.li === W.length - 1;
      const nextMode = MODS[MODS.indexOf('learn') + 1];
      const next = h('button', {
        class: 'btn', style: 'margin-top:0',
        onclick: () => {
          if (last) { S.li = 0; nextMode ? go(nextMode) : render(); }
          else { S.li++; render(); }
        }
      }, last ? (nextMode ? 'לבדיקה' : 'שוב מההתחלה') : 'הבא');
      stage.append(next, h('div', { class: 'card' },
        h('div', { class: 'cnt' }, counter(S.li, W.length)),
        w.icon ? h('div', { class: 'emo' }, w.icon) : null,
        h('div', { class: 'en' }, w.en),
        h('div', { class: 'he' }, w.he),
        speaker(w.en),
        w.sentence ? h('button', { class: 'lnk sent', dir: 'ltr', onclick: () => Voice.say(w.sentence) }, '🔊 ' + w.sentence) : null),
        h('button', { class: 'lnk', disabled: S.li === 0, onclick: () => { S.li--; render(); } }, 'הקודם'));
    }

    /* 2. Multiple choice (recognition) */
    function choices(w) {
      const pool = [...new Set(W.filter(x => x.he !== w.he).map(x => x.he))];
      if (S.shuf.mc) return shuffle([w.he, ...shuffle(pool).slice(0, 3)]);
      const at = W.findIndex(x => x.en === w.en), pick = new Set([w.he]);
      for (let k = 1; pick.size < Math.min(4, pool.length + 1) && k <= W.length; k++) pick.add(W[(at + k) % W.length].he);
      return [...new Set(W.map(x => x.he))].filter(v => pick.has(v));
    }
    function mcView() {
      const s = state('mc');
      if (s.i >= s.deck.length) return results('mc', s);
      const w = s.deck[s.i]; s.tries = 0;
      const grid = h('div', { class: 'opts' }, choices(w).map(o => h('button', {
        class: 'opt',
        onclick: e => {
          const b = e.currentTarget;
          if (o === w.he) {
            b.classList.add('ok'); if (!s.tries) s.score++; cheer();
            grid.querySelectorAll('button').forEach(x => x.disabled = true);
            setTimeout(() => { if (S.mc === s) { s.i++; render(); } }, 900);
          } else { s.tries++; s.miss.add(w.en); b.classList.add('bad'); b.disabled = true; }
        }
      }, o)));
      stage.append(shufRow('mc', counter(s.i, s.deck.length)),
        h('div', { class: 'card' }, h('div', { class: 'en' }, w.en), speaker(w.en), grid));
    }

    /* 3. Typing (active recall) */
    function typeView() {
      const s = state('type');
      if (s.i >= s.deck.length) return results('type', s);
      const w = s.deck[s.i]; s.tries = 0;
      const input = h('input', { class: 'ans', type: 'text', dir: 'ltr', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'תשובה באנגלית' });
      const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      const norm = v => v.trim().toLowerCase().replace(/\s+/g, ' ');
      const advance = ms => setTimeout(() => { if (S.type === s) { s.i++; render(); } }, ms);
      const check = () => {
        if (!input.value.trim() || input.disabled) return;
        if (norm(input.value) === norm(w.en)) {
          fb.className = 'fb ok'; fb.textContent = 'כל הכבוד!'; if (!s.tries) s.score++; cheer(); input.disabled = true; advance(900);
        } else {
          s.tries++; s.miss.add(w.en); fb.className = 'fb bad';
          if (s.tries === 1) { fb.textContent = `כמעט! מתחיל ב-${w.en[0]}`; input.select(); }
          else { fb.textContent = `התשובה: ${w.en}`; input.disabled = true; advance(2200); }
        }
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      stage.append(shufRow('type', counter(s.i, s.deck.length)),
        h('div', { class: 'card' },
          w.icon ? h('div', { class: 'emo' }, w.icon) : null,
          h('div', { class: 'he big' }, w.he), speaker(w.en), input, fb,
          h('button', { class: 'btn', style: 'margin-top:6px', onclick: check }, 'בדוק')));
    }

    /* 4. Daily review: English word, tap it to see the Hebrew, Next only. Shuffle ON by default. */
    function reviewView() {
      const s = state('review');
      if (s.i >= s.deck.length) {
        stage.append(h('div', { class: 'card' }, h('div', { class: 'emo' }, '🎉'), h('div', { class: 'he big' }, 'סיימת! כל הכבוד'),
          h('button', { class: 'btn', onclick: () => { S.review = null; render(); } }, 'להתחיל שוב')));
        cheer(); return;
      }
      const w = s.deck[s.i];
      const word = h('button', {
        class: 'card tap', 'aria-label': 'לחץ כדי להציג או להסתיר את התרגום',
        onclick: () => { s.show = !s.show; if (s.show) Voice.say(w.en); render(); }
      }, s.show ? h('div', { class: 'he big' }, w.he) : h('div', { class: 'en' }, w.en),
        h('div', { class: 'hint' }, s.show ? '' : 'לחצו על המילה כדי לראות את התרגום'));
      stage.append(shufRow('review', counter(s.i, s.deck.length)), word,
        h('button', { class: 'btn', onclick: () => { s.i++; s.show = false; render(); } }, 'הבא'));
    }

    function results(m, s) {
      const total = s.deck.length, shaky = [...s.miss];
      store.set(`nave-${cfg.id}-${m}`, { date: new Date().toISOString().slice(0, 10), score: s.score, total, shaky });
      cheer();
      const nextMode = m === 'mc' && MODS.includes('type') ? 'type' : null;
      stage.append(h('div', { class: 'card' },
        h('div', { class: 'emo' }, s.score === total ? '🏆' : '🌟'),
        h('div', { class: 'en', style: 'font-size:3rem' }, `${s.score} / ${total}`),
        h('div', { class: 'he' }, 'כל הכבוד נווה!'),
        shaky.length ? h('div', {}, h('div', { class: 'cnt' }, 'מילים לתרגל שוב'), h('div', { class: 'chips' }, shaky.map(x => h('span', {}, x)))) : h('div', { class: 'fb ok' }, 'בלי טעויות בכלל!'),
        nextMode ? h('button', { class: 'btn', onclick: () => go('type') }, 'לשלב הבא: הקלדה') : null,
        h('button', { class: nextMode ? 'btn alt' : 'btn', onclick: () => { S[m] = null; render(); } }, 'עוד פעם')));
    }

    /* Teacher: choose which words go on the paper test, then print (save as PDF from the print dialog) */
    function printView() {
      const name = (cfg.testTitle || cfg.title).replace(/[\p{Extended_Pictographic}️]/gu, '').trim();
      let keyMode = false;
      const ttl = h('h2'), rows = h('div', { class: 'rows' }), score = h('div', { class: 'score' });
      const sheet = h('div', { class: 'sheet' }, ttl,
        h('div', { class: 'sub' }, name),
        h('div', { class: 'fields' }, h('div', {}, 'שם: ', h('i')), h('div', {}, 'תאריך: ', h('i'))),
        h('p', { class: 'inst' }, 'כתבו ליד כל מילה באנגלית את התרגום שלה בעברית.'),
        rows, score);
      const count = h('div', { class: 'cnt', style: 'text-align:center;margin:10px 0' });
      const bT = h('button', { class: 'btn', onclick: () => doPrint(false) }, 'הדפס מבחן');
      const bK = h('button', { class: 'btn alt', onclick: () => doPrint(true) }, 'הדפס מפתח למורה');
      const list = h('div', { class: 'plist' }, W.map(w => {
        const cb = h('input', { type: 'checkbox', onchange: () => { cb.checked ? sel.add(w.en) : sel.delete(w.en); draw(); } });
        cb.checked = sel.has(w.en);
        return h('label', { class: 'pick' }, cb, h('span', { class: 'en2' }, w.en), h('span', {}, w.he));
      }));
      const setAll = on => { on ? W.forEach(w => sel.add(w.en)) : sel.clear(); list.querySelectorAll('input').forEach(c => c.checked = on); draw(); };

      function draw() {
        const L = W.filter(w => sel.has(w.en));
        count.textContent = `נבחרו ${L.length} מתוך ${W.length} מילים`;
        ttl.textContent = keyMode ? 'מפתח תשובות למורה' : 'מבחן באנגלית';
        sheet.style.setProperty('--rh', String(Math.max(5, Math.min(9.5, Math.floor(780 / Math.max(L.length, 1)) / 10))));
        rows.replaceChildren(...L.map((w, i) => h('div', { class: 'r' }, h('b', {}, `${i + 1}.`), h('span', { class: 'pw' }, w.en), h('span', { class: 'ln' }, keyMode ? w.he : ''))));
        score.textContent = `ציון: ____ / ${L.length}`;
        bT.disabled = bK.disabled = !L.length;
      }
      function doPrint(k) {
        keyMode = k; draw();
        const old = document.title;
        document.title = `מבחן ${name}${k ? ' - מפתח' : ''}`;
        addEventListener('afterprint', () => { document.title = old; keyMode = false; draw(); }, { once: true });
        window.print();
      }

      stage.append(
        h('div', { class: 'chooser' },
          h('h2', {}, 'בחירת מילים למבחן'),
          h('p', {}, 'סמנו את המילים שרוצים לבדוק, ואז הדפיסו.'),
          list,
          h('div', { class: 'two', style: 'margin-bottom:8px' },
            h('button', { class: 'btn alt', onclick: () => setAll(true) }, 'בחר הכל'),
            h('button', { class: 'btn alt', onclick: () => setAll(false) }, 'נקה הכל')),
          count,
          h('div', { class: 'two' }, bT, bK),
          h('button', { class: 'lnk', onclick: () => go(MODS[0]) }, 'חזרה לשיעור')),
        h('div', { class: 'paper' }, sheet));
      draw();
    }

    render();
  }

  /* ---------- Menu pages, built from assets/registry.js ---------- */
  const REG = () => window.NAVE_REGISTRY || { topics: [], quizzes: [] };
  const row = (it, base) => h('a', { class: 'item', href: base + it.href },
    h('div', {}, it.title, it.tag ? h('span', { class: 'tag' }, it.tag) : null),
    h('small', { style: 'unicode-bidi:plaintext' }, it.sub || ''));

  const NaveIndex = {
    home() {
      const R = REG(), latest = R.quizzes[0];
      document.getElementById('app').replaceChildren(h('main', { class: 'wrap plain' },
        h('h1', {}, 'היי נווה 👋'),
        latest ? h('a', { class: 'hero', href: latest.href + '#review' }, 'חזרה יומית', h('small', {}, `${latest.title} ${latest.sub || ''}`)) : null,
        h('h3', {}, 'מבחנים שבועיים', h('a', { href: 'quizzes/index.html' }, 'הכל')),
        ...R.quizzes.slice(0, 3).map(i => row(i, '')),
        h('h3', {}, 'נושאי לימוד', h('a', { href: 'topics/index.html' }, 'הכל')),
        ...R.topics.map(i => row(i, ''))));
    },
    list(section) {
      const R = REG(), items = R[section] || [];
      const title = section === 'topics' ? 'נושאי לימוד' : 'מבחנים שבועיים';
      document.getElementById('app').replaceChildren(
        h('div', { class: 'bar' }, h('a', { class: 'back', href: '../index.html' }, '→ בית')),
        h('main', { class: 'wrap plain' }, h('h1', {}, title),
          ...(items.length ? items.map(i => row(i, '../')) : [h('div', { class: 'empty' }, 'עדיין אין כאן כלום')])));
    }
  };


  /* ---------- Vowel pages. Sound ONLY when a speaker button is pressed. ---------- */
  const VOW = ['a', 'e', 'i', 'o', 'u'];
  function frame(cfg) {
    const voiceSel = h('select', { id: 'voice', 'aria-label': 'בחירת קול', onchange: () => Voice.pick() });
    Voice.select = voiceSel;
    const stage = h('main', { class: 'wrap' }), tabs = h('nav', { class: 'tabs', 'aria-label': 'שלבים' });
    document.getElementById('app').replaceChildren(
      h('div', { class: 'bar' }, h('a', { class: 'back', href: cfg.back || 'index.html' }, '→ חזרה'), voiceSel), stage, tabs);
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => Voice.load();
    Voice.load();
    return { stage, tabs };
  }
  const spk = text => h('button', { class: 'snd', 'aria-label': 'השמע', onclick: () => Voice.say(text) }, '🔊');
  const letters = (a, mid, b, cls) => h('div', { class: 'slot en', dir: 'ltr' }, h('span', {}, a), h('span', { class: 'gap ' + (cls || '') }, mid), h('span', {}, b));

  /* Swap the vowel: h _ t -> press a, e, i, o, u and see if it is a real word */
  function swap(cfg) {
    const B = cfg.bases, { stage } = frame(cfg);
    let bi = 0, vow = '';
    const go = i => { bi = (i + B.length) % B.length; vow = ''; render(); };
    function render() {
      const b = B[bi], w = vow ? b.words[vow] : null;
      const mid = vow || '_';
      const body = [letters(b.s, mid, b.e, vow ? (w ? 'ok' : 'no') : '')];
      if (!vow) body.push(h('div', { class: 'hint' }, 'בחרו תנועה'));
      else if (w) body.push(w.icon ? h('div', { class: 'emo' }, w.icon) : null, h('div', { class: 'he' }, w.he), spk(w.en));
      else body.push(h('div', { class: 'fb', style: 'margin-top:14px' }, 'אין מילה כזו באנגלית'));
      const vows = h('div', { class: 'vows', dir: 'ltr' }, VOW.map(v => h('button', {
        class: 'opt vb' + (v === vow ? ' on' : ''), 'aria-pressed': String(v === vow), onclick: () => { vow = v; render(); }
      }, v)));
      stage.replaceChildren(
        h('div', { class: 'row2' },
          h('button', { class: 'back', onclick: () => go(bi - 1) }, 'הקודם'),
          h('span', { class: 'cnt' }, `${bi + 1} / ${B.length}`),
          h('button', { class: 'back', onclick: () => go(bi + 1) }, 'הבא')),
        h('div', { class: 'card' }, body), vows,
        h('h3', {}, 'בחרו מילה'),
        h('div', { class: 'bases', dir: 'ltr' }, B.map((x, i) => h('button', { class: 'chip' + (i === bi ? ' on' : ''), onclick: () => go(i) }, `${x.s}_${x.e}`))));
    }
    render();
  }

  /* Fill the missing vowel / type the word / daily flash cards */
  function fill(cfg) {
    const W = cfg.words, MODS = cfg.modules || ['choose', 'type', 'review'];
    const META = { choose: ['👆', 'תנועה'], type: ['⌨️', 'הקלדה'], review: ['🔁', 'חזרה'] };
    const { stage, tabs } = frame(cfg);
    const S = {}; let view = (location.hash || '').slice(1); if (!MODS.includes(view)) view = MODS[0];
    const st = m => S[m] || (S[m] = { deck: shuffle(W), i: 0, score: 0, miss: new Set(), tries: 0, show: false });
    const go = v => { view = v; render(); scrollTo(0, 0); };
    const blank = w => { const k = w.en.search(/[aeiou]/i); return [w.en.slice(0, k), w.en.slice(k + 1), w.en[k].toLowerCase()]; };
    function render() {
      stage.replaceChildren();
      tabs.hidden = MODS.length < 2;
      tabs.replaceChildren(h('div', {}, MODS.map(m => h('button', { role: 'tab', 'aria-selected': String(m === view), onclick: () => go(m) }, h('b', {}, META[m][0]), META[m][1]))));
      ({ choose: chooseView, type: typeView, review: reviewView })[view]();
    }
    function done(m, s) {
      cheer(); const shaky = [...s.miss];
      store.set(`nave-${cfg.id}-${m}`, { date: new Date().toISOString().slice(0, 10), score: s.score, total: s.deck.length, shaky });
      const next = MODS[MODS.indexOf(m) + 1];
      stage.append(h('div', { class: 'card' }, h('div', { class: 'emo' }, s.score === s.deck.length ? '🏆' : '🌟'),
        h('div', { class: 'en', style: 'font-size:3rem' }, `${s.score} / ${s.deck.length}`), h('div', { class: 'he' }, 'כל הכבוד נווה!'),
        shaky.length ? h('div', {}, h('div', { class: 'cnt' }, 'מילים לתרגל שוב'), h('div', { class: 'chips' }, shaky.map(x => h('span', {}, x)))) : h('div', { class: 'fb ok' }, 'בלי טעויות בכלל!'),
        next && next !== 'review' ? h('button', { class: 'btn', onclick: () => go(next) }, 'לשלב הבא: ' + META[next][1]) : null,
        h('button', { class: 'btn alt', onclick: () => { S[m] = null; render(); } }, 'עוד פעם')));
    }
    function chooseView() {
      const s = st('choose'); if (s.i >= s.deck.length) return done('choose', s);
      const w = s.deck[s.i], [a, z, v] = blank(w); s.tries = 0;
      const grid = h('div', { class: 'opts vows', dir: 'ltr' }, VOW.map(o => h('button', { class: 'opt vb', onclick: e => {
        const b = e.currentTarget;
        if (o === v) { b.classList.add('ok'); if (!s.tries) s.score++; cheer(); grid.querySelectorAll('button').forEach(x => x.disabled = true); setTimeout(() => { if (S.choose === s) { s.i++; render(); } }, 900); }
        else { s.tries++; s.miss.add(w.en); b.classList.add('bad'); b.disabled = true; }
      } }, o)));
      stage.append(h('div', { class: 'row2' }, h('span', { class: 'cnt' }, `${s.i + 1} / ${s.deck.length}`)),
        h('div', { class: 'card' }, w.icon ? h('div', { class: 'emo' }, w.icon) : null, h('div', { class: 'he' }, w.he),
          letters(a, '_', z), spk(w.en), h('div', { class: 'hint' }, 'איזו תנועה חסרה?'), grid));
    }
    function typeView() {
      const s = st('type'); if (s.i >= s.deck.length) return done('type', s);
      const w = s.deck[s.i]; s.tries = 0;
      const input = h('input', { class: 'ans', type: 'text', dir: 'ltr', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'תשובה באנגלית' });
      const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      const adv = ms => setTimeout(() => { if (S.type === s) { s.i++; render(); } }, ms);
      const check = () => {
        if (!input.value.trim() || input.disabled) return;
        if (input.value.trim().toLowerCase() === w.en.toLowerCase()) { fb.className = 'fb ok'; fb.textContent = 'כל הכבוד!'; if (!s.tries) s.score++; cheer(); input.disabled = true; adv(900); }
        else { s.tries++; s.miss.add(w.en); fb.className = 'fb bad';
          if (s.tries === 1) { fb.textContent = `כמעט! מתחיל ב-${w.en[0]}`; input.select(); } else { fb.textContent = `התשובה: ${w.en}`; input.disabled = true; adv(2200); } }
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      stage.append(h('div', { class: 'row2' }, h('span', { class: 'cnt' }, `${s.i + 1} / ${s.deck.length}`)),
        h('div', { class: 'card' }, w.icon ? h('div', { class: 'emo' }, w.icon) : null, h('div', { class: 'he big' }, w.he), spk(w.en), input, fb,
          h('button', { class: 'btn', style: 'margin-top:6px', onclick: check }, 'בדוק')));
    }
    function reviewView() {
      const s = st('review');
      if (s.i >= s.deck.length) { cheer(); return void stage.append(h('div', { class: 'card' }, h('div', { class: 'emo' }, '🎉'), h('div', { class: 'he big' }, 'סיימת! כל הכבוד'),
        h('button', { class: 'btn', onclick: () => { S.review = null; render(); } }, 'להתחיל שוב'))); }
      const w = s.deck[s.i];
      stage.append(h('div', { class: 'row2' }, h('span', { class: 'cnt' }, `${s.i + 1} / ${s.deck.length}`)),
        h('button', { class: 'card tap', onclick: () => { s.show = !s.show; render(); } },
          s.show ? h('div', { class: 'he big' }, w.he) : h('div', { class: 'en' }, w.en),
          h('div', { class: 'hint' }, s.show ? '' : 'לחצו על המילה כדי לראות את התרגום')),
        h('div', { class: 'center' }, spk(w.en)),
        h('button', { class: 'btn', onclick: () => { s.i++; s.show = false; render(); } }, 'הבא'));
    }
    render();
  }


  /* ---------- Sound / sight-word pages: Learn (tap a word to swap it in) + Read (self-rate) ----------
     cfg: id, back, whole?, groups:[{s, label?, note?, words:[{en, icon?}]}], extra?:[{en, s, icon?}]
     No Hebrew on these pages and no sound unless a speaker button is pressed. */
  function sounds(cfg) {
    const G = cfg.groups, { stage, tabs } = frame(cfg);
    const META = { learn: ['📖', 'לימוד'], read: ['👀', 'קריאה'] };
    let view = (location.hash || '').slice(1); if (!META[view]) view = 'learn';
    let gi = 0, sel = -1, R = null, shuf = true;
    const hl = (w, t) => {
      if (cfg.whole) return w.split(' ').map((x, k) => [k ? ' ' : '', x.toLowerCase() === t.toLowerCase() ? h('span', { class: 'hl' }, x) : x]).flat();
      const i = w.toLowerCase().indexOf(t.toLowerCase());
      return i < 0 ? [w] : [w.slice(0, i), h('span', { class: 'hl' }, w.slice(i, i + t.length)), w.slice(i + t.length)];
    };
    const big = (txt, kids) => h('div', { class: 'bigw en', dir: 'ltr', style: `font-size:${txt.length <= 6 ? 5 : txt.length <= 10 ? 3.6 : 2.4}rem` }, kids);
    const go = v => { view = v; render(); scrollTo(0, 0); };
    function render() {
      stage.replaceChildren();
      tabs.replaceChildren(h('div', {}, Object.keys(META).map(m => h('button', { role: 'tab', 'aria-selected': String(m === view), onclick: () => go(m) }, h('b', {}, META[m][0]), META[m][1]))));
      (view === 'learn' ? learnV : readV)();
    }
    function learnV() {
      const g = G[gi], w = sel >= 0 ? g.words[sel] : null;
      const to = i => { gi = (i + G.length) % G.length; sel = -1; render(); };
      stage.append(
        h('div', { class: 'row2' }, h('button', { class: 'back', onclick: () => to(gi - 1) }, 'הקודם'),
          h('span', { class: 'cnt' }, `${gi + 1} / ${G.length}`), h('button', { class: 'back', onclick: () => to(gi + 1) }, 'הבא')),
        h('div', { class: 'card' },
          w ? big(w.en, hl(w.en, g.s)) : big(g.s, [h('span', { class: 'hl' }, g.s)]),
          g.note ? h('div', { class: 'note', dir: 'ltr' }, g.note) : null,
          w ? [w.icon ? h('div', { class: 'emo' }, w.icon) : null, spk(w.en)] : h('div', { class: 'hint' }, 'לחצו על מילה למטה')),
        h('div', { class: 'wbtns', dir: 'ltr' }, g.words.map((x, i) => h('button', {
          class: 'opt wb en' + (i === sel ? ' on' : ''), 'aria-pressed': String(i === sel), onclick: () => { sel = i === sel ? -1 : i; render(); }
        }, x.en))),
        h('h3', {}, 'בחרו צליל'),
        h('div', { class: 'bases', dir: 'ltr' }, G.map((x, i) => h('button', { class: 'chip' + (i === gi ? ' on' : ''), onclick: () => to(i) }, x.label || x.s))));
    }
    const items = () => [...G.flatMap(g => g.words.map(w => ({ en: w.en, s: g.s, icon: w.icon }))), ...(cfg.extra || [])];
    function newRound(list) { R = { deck: shuf ? shuffle(list) : [...list], i: 0, good: [], mid: [], bad: [], pic: false }; }
    function readV() {
      if (!R) newRound(items());
      if (R.i >= R.deck.length) return summary();
      const w = R.deck[R.i];
      const rate = k => h('button', { class: 'rt ' + k[0], onclick: () => { R[k[0]].push(w.en); R.i++; R.pic = false; render(); } }, k[1]);
      const cb = h('input', { type: 'checkbox', onchange: () => { shuf = cb.checked; R = null; render(); } }); cb.checked = shuf;
      stage.append(
        h('div', { class: 'row2' }, h('span', { class: 'cnt' }, `${R.i + 1} / ${R.deck.length}`), h('label', { class: 'sw' }, cb, h('span'), 'ערבוב')),
        h('div', { class: 'card' }, big(w.en, hl(w.en, w.s)),
          R.pic ? h('div', { class: 'emo' }, w.icon || '') : h('button', { class: 'lnk', onclick: () => { R.pic = true; render(); } }, 'הצגת תמונה'),
          spk(w.en)),
        h('div', { class: 'cnt', style: 'text-align:center;margin-top:16px' }, 'איך הוא קרא?'),
        h('div', { class: 'rates' }, [['good', '🟢 מצוין'], ['mid', '🟡 עם עזרה'], ['bad', '🔴 עוד תרגול']].map(rate)));
    }
    function summary() {
      const total = R.deck.length, again = [...R.mid, ...R.bad];
      store.set(`nave-${cfg.id}-read`, { date: new Date().toISOString().slice(0, 10), good: R.good, mid: R.mid, bad: R.bad });
      cheer();
      const line = (t, a, c) => a.length ? h('div', {}, h('div', { class: 'cnt' }, `${t} (${a.length})`), h('div', { class: 'chips ' + c }, a.map(x => h('span', {}, x)))) : null;
      stage.append(h('div', { class: 'card' }, h('div', { class: 'emo' }, '🌟'),
        h('div', { class: 'en', style: 'font-size:3rem' }, `${R.good.length} / ${total}`), h('div', { class: 'he' }, 'קרא מצוין'),
        line('עם עזרה', R.mid, 'mid'), line('עוד תרגול', R.bad, 'bad'),
        again.length ? h('button', { class: 'btn', onclick: () => { newRound(R.deck.filter(x => again.includes(x.en))); render(); } }, 'לתרגל רק את אלה') : null,
        h('button', { class: again.length ? 'btn alt' : 'btn', onclick: () => { R = null; render(); } }, 'עוד פעם מההתחלה')));
    }
    render();
  }

  window.NaveQuiz = { start };
  window.NaveSounds = { start: sounds };
  window.NaveVowels = { swap, fill };
  window.NaveIndex = NaveIndex;
})();
