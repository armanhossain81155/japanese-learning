// ===== Helpers =====
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const app = $('#app');

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
};

const fmtTime = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtDate = (ts) => new Date(ts).toLocaleString(lang === 'bn' ? 'bn-BD' : undefined, {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const modeLabel = (level, mode) => {
  if (mode === 'all') return t('mode.full');
  const sec = level.sections.find(s => s.id === mode);
  return t('mode.practice', sec ? L(sec.title) : '');
};

function countQuestions(level, mode = 'all') {
  return level.sections
    .filter(s => mode === 'all' || s.id === mode)
    .reduce((n, s) => n + s.groups.reduce((m, g) => m + g.questions.length, 0), 0);
}

// Section practice gets a share of the mock time proportional to the official timing
function examMinutes(level, mode) {
  if (mode === 'all') return level.mockTime;
  const totalOfficial = level.official.reduce((n, o) => n + o.time, 0);
  const idx = level.sections.findIndex(s => s.id === mode);
  return Math.max(5, Math.ceil(level.mockTime * level.official[idx].time / totalOfficial));
}

// ===== Modal =====
function confirmModal(title, text, okLabel = t('modal.ok')) {
  const modal = $('#modal');
  $('#modalTitle').textContent = title;
  $('#modalText').textContent = text;
  $('#modalOk').textContent = okLabel;
  modal.hidden = false;
  $('#modalOk').focus();
  return new Promise(resolve => {
    const close = (val) => {
      modal.hidden = true;
      $('#modalOk').onclick = $('#modalCancel').onclick = modal.onclick = null;
      resolve(val);
    };
    $('#modalOk').onclick = () => close(true);
    $('#modalCancel').onclick = () => close(false);
    modal.onclick = (e) => { if (e.target === modal) close(false); };
  });
}

// ===== Speech (listening section) =====
// Pick separate Japanese voices for narrator / man / woman when the browser has them
const MALE_HINTS = /ichiro|keita|daichi|naoki|otoya|hattori|takumi|kenji|male|男/i;
const FEMALE_HINTS = /haruka|ayumi|sayaka|nanami|aoi|mayu|shiori|kyoko|mizuki|female|google|女/i;
const voices = { narr: null, m: null, f: null, count: 0 };

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const ja = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('ja'));
  voices.count = ja.length;
  if (!ja.length) return;
  const male = ja.filter(v => MALE_HINTS.test(v.name) && !/female/i.test(v.name));
  const female = ja.filter(v => FEMALE_HINTS.test(v.name) && !male.includes(v));
  voices.realMale = !!male[0];
  voices.m = male[0] || ja.find(v => v !== female[0]) || ja[0];
  voices.f = female[0] || ja.find(v => v !== voices.m) || ja[0];
  // Narrator: a third voice if there is one, otherwise reuse the female voice
  voices.narr = ja.find(v => v !== voices.m && v !== voices.f) || female[1] || voices.f;
}

// Distinct voices are available when man and woman got different voices
const hasDistinctVoices = () => voices.m && voices.f && voices.m !== voices.f;
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Speaks a script line by line. 男 / 女 / narrator lines use different voices when available;
// with a single voice, pitch and speed are changed so the speakers still sound different.
function speak(script, { onEnd, rate = 0.9 } = {}) {
  if (!('speechSynthesis' in window)) return false;
  stopSpeech();
  if (!voices.count) loadVoices();
  const distinct = hasDistinctVoices();
  const lines = script.split('\n').filter(Boolean);
  lines.forEach((line, i) => {
    let role = 'narr';
    let text = line;
    const m = line.match(/^(男|女)：(.*)$/);
    if (m) {
      role = m[1] === '男' ? 'm' : 'f';
      text = m[2];
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (voices[role]) u.voice = voices[role];
    if (distinct) {
      // No real male voice: lower the pitch of the second voice so it sounds like a man
      u.pitch = role === 'm' ? (voices.realMale ? 0.95 : 0.6) : 1;
      u.rate = role === 'narr' ? rate * 0.95 : rate;
    } else {
      u.pitch = { m: 0.5, f: 1.5, narr: 1 }[role];
      u.rate = { m: rate * 0.9, f: rate * 1.08, narr: rate * 0.95 }[role];
    }
    if (i === lines.length - 1 && onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    speechSynthesis.speak(u);
  });
  return true;
}

const scriptHtml = (script) => script.split('\n').map(line => {
  const m = line.match(/^(男|女)：(.*)$/);
  return m
    ? `<p><span class="speaker ${m[1] === '男' ? 'm' : 'f'}">${m[1]}</span>${m[2]}</p>`
    : `<p class="narr">${line}</p>`;
}).join('');

// ===== Exam state =====
let exam = null;
let lastResult = null;

function buildItems(level, mode) {
  const items = [];
  level.sections.forEach(section => {
    if (mode !== 'all' && section.id !== mode) return;
    section.groups.forEach(group => {
      group.questions.forEach(q => items.push({ section, group, q }));
    });
  });
  return items;
}

function startExam(levelId, mode) {
  const level = LEVELS[levelId];
  if (!level) return renderNotFound();
  if (mode !== 'all' && !level.sections.some(s => s.id === mode)) mode = 'all';

  endExam();
  const minutes = examMinutes(level, mode);
  const items = buildItems(level, mode);
  exam = {
    hash: `#/exam/${levelId}/${mode}`,
    level,
    mode,
    items,
    answers: new Array(items.length).fill(null),
    flags: new Set(),
    cur: 0,
    plays: {},
    startedAt: Date.now(),
    endsAt: Date.now() + minutes * 60 * 1000,
    minutes,
    timerId: null
  };
  exam.timerId = setInterval(tick, 1000);
  renderExam();
}

function endExam() {
  if (exam && exam.timerId) clearInterval(exam.timerId);
  stopSpeech();
  exam = null;
  document.body.classList.remove('in-exam');
}

function tick() {
  if (!exam) return;
  const left = (exam.endsAt - Date.now()) / 1000;
  const el = $('#timer');
  if (el) {
    el.textContent = fmtTime(left);
    el.classList.toggle('warn', left <= 300 && left > 60);
    el.classList.toggle('danger', left <= 60);
  }
  if (left <= 0) finishExam(true);
}

function goTo(i) {
  if (!exam) return;
  stopSpeech();
  exam.cur = Math.min(Math.max(0, i), exam.items.length - 1);
  if (exam.live) saveLiveProgress();
  renderExam();
  const card = $('.q-card');
  if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start' });
}

function choose(i) {
  if (!exam) return;
  exam.answers[exam.cur] = i;
  if (exam.live) saveLiveProgress();
  renderExam();
}

function toggleFlag() {
  if (!exam) return;
  exam.flags.has(exam.cur) ? exam.flags.delete(exam.cur) : exam.flags.add(exam.cur);
  if (exam.live) saveLiveProgress();
  renderExam();
}

async function confirmSubmit() {
  if (!exam) return;
  const unanswered = exam.answers.filter(a => a === null).length;
  const text = unanswered ? t('submit.unanswered', unanswered) : t('submit.sure');
  if (await confirmModal(t('submit.title'), text, t('exam.submit'))) finishExam(false);
}

function finishExam(timeUp) {
  if (!exam) return;
  if (exam.live) return submitLive(timeUp);
  const { level, mode, items, answers, flags, startedAt } = exam;
  const duration = Math.min(Date.now() - startedAt, exam.minutes * 60 * 1000) / 1000;

  // Scaled score per category, like the real JLPT score report
  const catStats = {};
  items.forEach((it, i) => {
    const c = (catStats[it.group.cat] ||= { correct: 0, total: 0 });
    c.total++;
    if (answers[i] === it.q.a) c.correct++;
  });

  const cats = Object.entries(catStats).map(([key, s]) => {
    const def = level.scoring.cats[key];
    const score = Math.round(s.correct / s.total * def.max);
    return { key, ...def, ...s, score, ok: score >= def.min };
  });

  const correct = items.filter((it, i) => answers[i] === it.q.a).length;
  const isFull = mode === 'all';
  const total = cats.reduce((n, c) => n + c.score, 0);
  const max = cats.reduce((n, c) => n + c.max, 0);
  const passed = isFull ? total >= level.scoring.pass && cats.every(c => c.ok) : null;

  // Breakdown by question type (keeps the group so labels can be translated at render time)
  const types = [];
  items.forEach((it, i) => {
    let tp = types.find(x => x.group === it.group);
    if (!tp) types.push(tp = { group: it.group, correct: 0, total: 0 });
    tp.total++;
    if (answers[i] === it.q.a) tp.correct++;
  });

  lastResult = {
    level, mode, items, answers, flags: [...flags], cats, types,
    correct, totalQ: items.length, total, max, passed, duration, timeUp
  };

  const history = store.get('nd-history', []);
  history.unshift({
    ts: Date.now(), level: level.id, mode,
    total, max, passed, correct, totalQ: items.length, duration
  });
  store.set('nd-history', history.slice(0, 50));

  endExam();
  location.hash = '#/result';
}

// ===== Views =====
function levelCard(level) {
  const q = countQuestions(level);
  return `
    <article class="level-card" style="--c:${level.color}">
      <div class="level-head">
        <span class="level-badge">${level.id}</span>
        <span class="chip">${L(level.tag)}</span>
      </div>
      <h3>${level.name}</h3>
      <p class="muted">${L(level.desc)}</p>
      <ul class="level-facts">
        <li><b>${L(level.words)}</b><span>${t('vocabulary')}</span></li>
        <li><b>${L(level.kanji)}</b><span>${t('kanji')}</span></li>
        <li><b>${level.scoring.pass}/180</b><span>${t('passMark')}</span></li>
      </ul>
      <div class="level-foot">
        <span class="muted small">${t('qmin', q, level.mockTime)}</span>
        <a class="btn btn-primary btn-sm" href="#/test/${level.id}">${t('start', level.id)}</a>
      </div>
    </article>`;
}

function renderHome() {
  const totalQ = Object.values(LEVELS).reduce((n, l) => n + countQuestions(l), 0);
  app.innerHTML = `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">${t('hero.eyebrow')}</span>
          <h1>${t('hero.title')}</h1>
          <p class="lead">${t('hero.lead')}</p>
          <div class="hero-cta">
            <a href="#/tests" class="btn btn-primary btn-lg">${t('hero.cta1')}</a>
            <a href="#/study" class="btn btn-ghost btn-lg">${t('hero.cta2')}</a>
          </div>
          <ul class="hero-stats">
            <li><b>3</b><span>${t('hero.stat1')}</span></li>
            <li><b>${totalQ}+</b><span>${t('hero.stat2')}</span></li>
            <li><b>聴解</b><span>${t('hero.stat3')}</span></li>
          </ul>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="sun"></div>
          <div class="preview-card">
            <div class="preview-top">
              <span class="level-badge sm" style="--c:var(--n4)">N4</span>
              <span class="timer-pill">⏱ 24:13</span>
            </div>
            <small class="muted">${t('preview.type')}</small>
            <p class="jp preview-q">来月 <u>旅行</u>に 行きます。</p>
            <div class="preview-opts">
              <span>1 りょうこう</span>
              <span class="on">2 りょこう</span>
              <span>3 りょこ</span>
              <span>4 りょうこ</span>
            </div>
          </div>
          <div class="float-kana k1">あ</div>
          <div class="float-kana k2">カ</div>
          <div class="float-kana k3">語</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">${t('levels.eyebrow')}</span>
          <h2>${t('levels.title')}</h2>
          <p class="muted">${t('levels.sub')}</p>
        </div>
        <div class="level-grid">${Object.values(LEVELS).map(levelCard).join('')}</div>
      </div>
    </section>

    <section class="section alt">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">${t('format.eyebrow')}</span>
          <h2>${t('format.title')}</h2>
        </div>
        <div class="format-grid">
          ${[['文字・語彙', 'vocab'], ['文法・読解', 'grammar'], ['聴解', 'listening']].map(([jp, k]) => `
            <div class="format-card">
              <span class="format-jp">${jp}</span>
              <h3>${t(`format.${k}.t`)}</h3>
              <p class="muted">${t(`format.${k}.d`)}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">${t('features.eyebrow')}</span>
          <h2>${t('features.title')}</h2>
        </div>
        <div class="feature-grid">
          ${t('features.list').map(([i, title, d]) => `
            <div class="feature">
              <span class="feature-icon">${i}</span>
              <h3>${title}</h3>
              <p class="muted">${d}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section alt">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">${t('tips.eyebrow')}</span>
          <h2>${t('tips.title')}</h2>
        </div>
        <div class="tips-grid">
          ${TIPS.map((tip, i) => `
            <div class="tip">
              <span class="tip-num">${['一', '二', '三', '四'][i]}</span>
              <div><h3>${L(tip.title)}</h3><p class="muted">${L(tip.text)}</p></div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="cta-band">
          <div>
            <h2>${t('cta.title')}</h2>
            <p>${t('cta.text')}</p>
          </div>
          <a href="#/test/N5" class="btn btn-light btn-lg">${t('cta.btn')}</a>
        </div>
      </div>
    </section>`;
}

function renderTests() {
  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">${t('tests.eyebrow')}</span>
        <h1>${t('tests.title')}</h1>
        <p class="muted">${t('tests.sub')}</p>
      </div>
    </section>
    <section class="section tight">
      <div class="container">
        <div class="level-grid">${Object.values(LEVELS).map(levelCard).join('')}</div>

        <h2 class="mt-xl">${t('tests.glance')}</h2>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>${t('th.level')}</th><th>${t('th.time')}</th><th>${t('th.pass')}</th><th>${t('th.mins')}</th></tr></thead>
            <tbody>
              ${Object.values(LEVELS).map(l => `
                <tr>
                  <td><span class="level-badge sm" style="--c:${l.color}">${l.id}</span></td>
                  <td>${l.official.reduce((n, o) => n + o.time, 0)} ${t('min')}</td>
                  <td><b>${l.scoring.pass}</b> / 180</td>
                  <td class="small">${Object.values(l.scoring.cats).map(c => `${L(c.label)}: ${c.min}/${c.max}`).join('<br>')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>`;
}

function renderLevel(levelId) {
  const level = LEVELS[levelId];
  if (!level) return renderNotFound();
  const officialTotal = level.official.reduce((n, o) => n + o.time, 0);

  app.innerHTML = `
    <section class="page-head" style="--c:${level.color}">
      <div class="container">
        <a href="#/tests" class="back">${t('level.back')}</a>
        <div class="level-title">
          <span class="level-badge lg">${level.id}</span>
          <div>
            <h1>${t('level.title', level.name)}</h1>
            <p class="muted">${L(level.tag)} · ${L(level.desc)}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section tight">
      <div class="container level-layout">
        <div>
          <div class="card start-card" style="--c:${level.color}">
            <h2>${t('mode.full')}</h2>
            <p class="muted">${t('level.fullDesc')}</p>
            <ul class="start-facts">
              <li><b>${countQuestions(level)}</b><span>${t('level.questions')}</span></li>
              <li><b>${level.mockTime}</b><span>${t('level.minutes')}</span></li>
              <li><b>${level.scoring.pass}</b><span>${t('level.toPass')}</span></li>
            </ul>
            <a class="btn btn-primary btn-lg btn-block" href="#/exam/${level.id}/all">${t('level.startFull')}</a>
            <p class="small muted center">${t('level.soundTip')}</p>
          </div>

          <h3 class="mt-lg">${t('level.practiseOne')}</h3>
          <div class="section-list">
            ${level.sections.map(s => `
              <a class="section-item" href="#/exam/${level.id}/${s.id}">
                <span class="section-jp jp">${s.jp}</span>
                <span class="section-info">
                  <b>${L(s.title)}</b>
                  <small class="muted">${s.groups.map(g => L(g.type)).join(' · ')}</small>
                </span>
                <span class="section-meta">${countQuestions(level, s.id)} ${t('q')} · ${examMinutes(level, s.id)} ${t('min')} →</span>
              </a>`).join('')}
          </div>
        </div>

        <aside>
          <div class="card">
            <h3>${t('level.official')}</h3>
            <table class="table compact">
              <tbody>
                ${level.official.map(o => `
                  <tr><td><b>${L(o.part)}</b><br><small class="muted jp">${o.jp}</small></td><td class="right">${o.time} ${t('min')}</td></tr>`).join('')}
                <tr class="total"><td>${t('level.total')}</td><td class="right">${officialTotal} ${t('min')}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="card">
            <h3>${t('level.scoring')}</h3>
            <p class="small muted">${t('level.scoringText', level.scoring.pass)}</p>
            ${Object.values(level.scoring.cats).map(c => `
              <div class="score-row"><span>${L(c.label)}</span><span><b>${c.min}</b> / ${c.max}</span></div>`).join('')}
          </div>
          <div class="card">
            <h3>${t('level.know')}</h3>
            <div class="score-row"><span>${t('vocabulary')}</span><b>${L(level.words)}</b></div>
            <div class="score-row"><span>${t('kanji')}</span><b>${L(level.kanji)}</b></div>
          </div>
        </aside>
      </div>
    </section>`;
}

function renderExam() {
  if (!exam) return;
  document.body.classList.add('in-exam');
  const { level, mode, items, answers, flags, cur } = exam;
  const it = items[cur];
  const { section, group, q } = it;
  const answered = answers.filter(a => a !== null).length;
  const left = (exam.endsAt - Date.now()) / 1000;
  const isListening = !!q.audio;
  const hasSpeech = 'speechSynthesis' in window;

  // Palette grouped by section
  let idx = 0;
  const palette = level.sections
    .filter(s => mode === 'all' || s.id === mode)
    .map(s => {
      const n = s.groups.reduce((m, g) => m + g.questions.length, 0);
      const btns = Array.from({ length: n }, () => {
        const i = idx++;
        const cls = ['pal-btn'];
        if (answers[i] !== null) cls.push('done');
        if (flags.has(i)) cls.push('flag');
        if (i === cur) cls.push('cur');
        return `<button class="${cls.join(' ')}" data-go="${i}" aria-label="${t('exam.qLabel', i + 1)}">${i + 1}</button>`;
      }).join('');
      return `<div class="pal-sec"><p class="pal-title"><span class="jp">${s.jp}</span> ${L(s.title)}</p><div class="pal-grid">${btns}</div></div>`;
    }).join('');

  app.innerHTML = `
    <section class="exam" style="--c:${level.color}">
      <div class="exam-bar">
        <div class="container exam-bar-inner">
          <div class="exam-title">
            <span class="level-badge sm">${level.id}</span>
            <div>
              <b>${exam.live ? L(exam.live.ex.title) : modeLabel(level, mode)}</b>
              <small class="muted">${L(section.title)} · <span class="jp">${section.jp}</span></small>
            </div>
          </div>
          <div class="timer ${left <= 60 ? 'danger' : left <= 300 ? 'warn' : ''}" id="timer" title="${t('exam.timeLeft')}">${fmtTime(left)}</div>
          <button class="btn btn-primary btn-sm" id="submitBtn">${t('exam.submit')}</button>
        </div>
        <div class="exam-progress"><span style="width:${answered / items.length * 100}%"></span></div>
      </div>

      <div class="container exam-body">
        <article class="q-card">
          <div class="q-meta">
            <span class="q-type">${L(group.type)} <span class="jp muted">${group.jp}</span></span>
            <span class="muted small">${t('exam.question', cur + 1, items.length)}</span>
          </div>
          <p class="q-instr">${L(group.instr)}</p>

          ${group.passage ? `<div class="passage jp">${group.passage}</div>` : ''}

          ${isListening ? `
            <div class="audio-box">
              <button class="play-btn" id="playBtn" ${hasSpeech ? '' : 'disabled'} aria-label="${t('exam.play')}">
                <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
              </button>
              <div>
                <b id="playLabel">${t('exam.play')}</b>
                <small class="muted">${hasSpeech ? t('exam.plays', exam.plays[cur] || 0) : t('exam.noSpeech')}</small>
                ${hasSpeech && !hasDistinctVoices() ? `<small class="voice-note">${t('exam.voiceNote')}</small>` : ''}
              </div>
              <button class="btn btn-ghost btn-sm" id="scriptBtn">${hasSpeech ? t('exam.showScript') : t('exam.script')}</button>
            </div>
            <div class="script jp" id="scriptBox" hidden>${scriptHtml(q.audio)}</div>` : ''}

          ${q.image ? `<img class="q-image" src="${q.image}" alt="">` : ''}
          ${q.hideText ? '' : `<div class="q-text jp">${L(q.q)}</div>`}
          ${q.spoken ? `<p class="small muted">${t('exam.spokenOpts')}</p>` : ''}

          <div class="opts ${q.optImages ? 'pics' : ''} ${q.spoken ? 'spoken' : ''}">
            ${q.opts.map((o, i) => `
              <button class="opt ${answers[cur] === i ? 'selected' : ''}" data-opt="${i}" aria-label="${i + 1}">
                <span class="opt-num">${i + 1}</span>
                ${q.optImages ? `<img src="${q.optImages[i]}" alt="${o}">` : q.spoken ? '<span class="muted">🔊</span>' : `<span class="jp">${o}</span>`}
              </button>`).join('')}
          </div>

          <div class="q-nav">
            <button class="btn btn-ghost" id="prevBtn" ${cur === 0 ? 'disabled' : ''}>${t('exam.prev')}</button>
            <button class="btn btn-ghost flag-btn ${flags.has(cur) ? 'on' : ''}" id="flagBtn">⚑ ${flags.has(cur) ? t('exam.flagged') : t('exam.flag')}</button>
            ${cur === items.length - 1
              ? `<button class="btn btn-primary" id="finishBtn">${t('exam.finish')}</button>`
              : `<button class="btn btn-primary" id="nextBtn">${t('exam.next')}</button>`}
          </div>
          <p class="kbd-hint small muted">${t('exam.shortcuts')}</p>
        </article>

        <aside class="palette">
          <div class="pal-head">
            <b>${t('exam.questions')}</b>
            <span class="muted small">${t('exam.answered', answered, items.length)}</span>
          </div>
          ${palette}
          <div class="pal-legend small muted">
            <span><i class="lg-done"></i>${t('legend.answered')}</span>
            <span><i class="lg-flag"></i>${t('legend.flagged')}</span>
            <span><i class="lg-cur"></i>${t('legend.current')}</span>
          </div>
        </aside>
      </div>
    </section>`;

  // Events
  $$('.opt', app).forEach(b => b.onclick = () => choose(+b.dataset.opt));
  $$('[data-go]', app).forEach(b => b.onclick = () => goTo(+b.dataset.go));
  $('#prevBtn').onclick = () => goTo(cur - 1);
  $('#flagBtn').onclick = toggleFlag;
  $('#submitBtn').onclick = confirmSubmit;
  if ($('#nextBtn')) $('#nextBtn').onclick = () => goTo(cur + 1);
  if ($('#finishBtn')) $('#finishBtn').onclick = confirmSubmit;

  if (isListening) {
    $('#scriptBtn').onclick = () => {
      const box = $('#scriptBox');
      box.hidden = !box.hidden;
      $('#scriptBtn').textContent = box.hidden ? t('exam.showScript') : t('exam.hideScript');
    };
    const playBtn = $('#playBtn');
    if (playBtn) playBtn.onclick = () => {
      const qIndex = cur;
      exam.plays[qIndex] = (exam.plays[qIndex] || 0) + 1;
      playBtn.classList.add('playing');
      $('#playLabel').textContent = t('exam.playing');
      speak(q.audio, {
        onEnd: () => {
          if (!exam || exam.cur !== qIndex) return;
          playBtn.classList.remove('playing');
          $('#playLabel').textContent = t('exam.playAgain');
        }
      });
    };
  }
}

let reviewFilter = 'all';

function renderResult() {
  const r = lastResult;
  if (!r) { location.hash = '#/history'; return; }
  const { level, mode, cats, types, items, answers } = r;
  const isFull = mode === 'all';
  const pct = Math.round(r.correct / r.totalQ * 100);
  const ringPct = isFull ? r.total / r.max : r.correct / r.totalQ;
  const C = 2 * Math.PI * 54;
  const wrongCount = items.filter((it, i) => answers[i] !== null && answers[i] !== it.q.a).length;

  app.innerHTML = `
    <section class="section tight" style="--c:${level.color}">
      <div class="container">
        <a href="#/test/${level.id}" class="back">← ${level.name}</a>

        <div class="result-hero card">
          <div class="ring">
            <svg viewBox="0 0 120 120" width="160" height="160">
              <circle cx="60" cy="60" r="54" class="ring-bg"/>
              <circle cx="60" cy="60" r="54" class="ring-fg ${r.passed === false ? 'fail' : ''}"
                stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - ringPct)}"/>
            </svg>
            <div class="ring-label">
              ${isFull ? `<b>${r.total}</b><span>/ ${r.max}</span>` : `<b>${pct}%</b><span>${t('res.accuracy')}</span>`}
            </div>
          </div>
          <div class="result-info">
            <span class="level-badge sm">${level.id}</span>
            <span class="muted">${modeLabel(level, mode)}</span>
            ${isFull
              ? `<h1 class="${r.passed ? 'pass' : 'fail'}">${r.passed ? t('res.passed') : t('res.failed')}</h1>
                 <p class="muted">${r.passed
                   ? t('res.passMsg', level.scoring.pass)
                   : r.total >= level.scoring.pass ? t('res.minFail') : t('res.failMsg', level.scoring.pass)}</p>`
              : `<h1>${pct >= 70 ? t('res.great') : pct >= 50 ? t('res.ok') : t('res.keep')}</h1>
                 <p class="muted">${t('res.practiceNote')}</p>`}
            ${r.timeUp ? `<p class="time-up">${t('res.timeUp')}</p>` : ''}
            <ul class="result-stats">
              <li><b>${r.correct}/${r.totalQ}</b><span>${t('res.correct')}</span></li>
              <li><b>${pct}%</b><span>${t('res.accuracy')}</span></li>
              <li><b>${fmtTime(r.duration)}</b><span>${t('res.time')}</span></li>
            </ul>
          </div>
        </div>

        <div class="result-grid">
          <div class="card">
            <h3>${isFull ? t('res.sectional') : t('res.score')}</h3>
            ${cats.map(c => `
              <div class="cat">
                <div class="cat-top">
                  <span>${L(c.label)}</span>
                  <span><b>${c.score}</b> / ${c.max} ${isFull ? `<span class="tag ${c.ok ? 'ok' : 'bad'}">${c.ok ? t('res.aboveMin') : t('res.belowMin')}</span>` : ''}</span>
                </div>
                <div class="bar">
                  <span class="${c.ok ? '' : 'bad'}" style="width:${c.score / c.max * 100}%"></span>
                  ${isFull ? `<i class="min-mark" style="left:${c.min / c.max * 100}%" title="${t('res.minTitle', c.min)}"></i>` : ''}
                </div>
                <small class="muted">${t('res.correctOf', c.correct, c.total)}${isFull ? t('res.minimum', c.min) : ''}</small>
              </div>`).join('')}
          </div>

          <div class="card">
            <h3>${t('res.byType')}</h3>
            <div class="types">
              ${types.map(tp => {
                const p = Math.round(tp.correct / tp.total * 100);
                return `
                  <div class="type-row">
                    <div><b>${L(tp.group.type)}</b> <small class="muted jp">${tp.group.jp}</small></div>
                    <div class="type-bar"><span class="${p < 50 ? 'bad' : p < 100 ? 'mid' : ''}" style="width:${p}%"></span></div>
                    <span class="small">${tp.correct}/${tp.total}</span>
                  </div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="result-actions">
          <a class="btn btn-primary" href="#/exam/${level.id}/${mode}">${t('res.retake')}</a>
          <a class="btn btn-ghost" href="#/tests">${t('res.another')}</a>
          <a class="btn btn-ghost" href="#/history">${t('res.myResults')}</a>
        </div>

        <div class="review-head">
          <h2>${t('res.review')}</h2>
          <div class="filters" id="filters">
            <button class="chip-btn" data-f="all">${t('f.all')} (${items.length})</button>
            <button class="chip-btn" data-f="wrong">${t('f.wrong')} (${wrongCount})</button>
            <button class="chip-btn" data-f="blank">${t('f.blank')} (${answers.filter(a => a === null).length})</button>
            <button class="chip-btn" data-f="flag">${t('f.flag')} (${r.flags.length})</button>
          </div>
        </div>
        <div class="review" id="review"></div>
      </div>
    </section>`;

  const renderReview = (filter) => {
    reviewFilter = filter;
    $$('#filters .chip-btn').forEach(x => x.classList.toggle('on', x.dataset.f === filter));
    const list = items.map((it, i) => ({ it, i })).filter(({ it, i }) => {
      if (filter === 'wrong') return answers[i] !== null && answers[i] !== it.q.a;
      if (filter === 'blank') return answers[i] === null;
      if (filter === 'flag') return r.flags.includes(i);
      return true;
    });
    $('#review').innerHTML = list.length ? list.map(({ it, i }) => {
      const a = answers[i];
      const ok = a === it.q.a;
      const status = a === null ? 'blank' : ok ? 'ok' : 'bad';
      return `
        <article class="rv ${status}">
          <div class="rv-head">
            <span class="rv-num">${i + 1}</span>
            <span class="small muted">${L(it.section.title)} · ${L(it.group.type)}</span>
            <span class="tag ${status === 'ok' ? 'ok' : status === 'bad' ? 'bad' : ''}">${status === 'ok' ? t('rv.correct') : status === 'bad' ? t('rv.wrong') : t('rv.blank')}</span>
          </div>
          ${it.group.passage ? `<details class="rv-passage"><summary>${t('rv.passage')}</summary><div class="passage jp">${it.group.passage}</div></details>` : ''}
          ${it.q.audio ? `
            <details class="rv-passage"><summary>${t('rv.script')}</summary>
              <div class="script jp">${scriptHtml(it.q.audio)}</div>
              ${'speechSynthesis' in window ? `<button class="btn btn-ghost btn-sm" data-speak="${i}">${t('rv.listen')}</button>` : ''}
            </details>` : ''}
          <div class="q-text jp">${L(it.q.q)}</div>
          <ul class="rv-opts">
            ${it.q.opts.map((o, j) => `
              <li class="${j === it.q.a ? 'correct' : j === a ? 'wrong' : ''}">
                <span class="opt-num">${j + 1}</span><span class="jp">${o}</span>
                ${j === it.q.a ? `<small>${t('rv.correctAns')}</small>` : j === a ? `<small>${t('rv.yourAns')}</small>` : ''}
              </li>`).join('')}
          </ul>
          <p class="exp"><b>${t('rv.exp')}</b> ${L(it.q.exp)}</p>
        </article>`;
    }).join('') : `<p class="empty muted">${t('rv.empty')}</p>`;

    $$('[data-speak]', app).forEach(b => b.onclick = () => speak(items[+b.dataset.speak].q.audio));
  };

  $$('#filters .chip-btn').forEach(b => b.onclick = () => renderReview(b.dataset.f));
  renderReview(reviewFilter);
}

function renderHistory() {
  const history = store.get('nd-history', []);
  const best = {};
  history.filter(h => h.mode === 'all').forEach(h => {
    if (!best[h.level] || h.total > best[h.level].total) best[h.level] = h;
  });
  const passes = history.filter(h => h.passed).length;

  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">${t('hist.eyebrow')}</span>
        <h1>${t('hist.title')}</h1>
        <p class="muted">${t('hist.sub')}</p>
      </div>
    </section>
    <section class="section tight">
      <div class="container">
        ${history.length ? `
          <div class="stat-grid">
            <div class="stat"><b>${history.length}</b><span>${t('hist.taken')}</span></div>
            <div class="stat"><b>${passes}</b><span>${t('hist.passed')}</span></div>
            ${Object.values(LEVELS).map(l => `
              <div class="stat" style="--c:${l.color}">
                <b>${best[l.id] ? best[l.id].total : '—'}</b>
                <span>${t('hist.best', l.id)}</span>
              </div>`).join('')}
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>${t('th.date')}</th><th>${t('th.level')}</th><th>${t('th.mode')}</th><th>${t('th.correct')}</th><th>${t('th.score')}</th><th>${t('th.result')}</th></tr></thead>
              <tbody>
                ${history.filter(h => LEVELS[h.level]).map(h => `
                  <tr>
                    <td class="small">${fmtDate(h.ts)}</td>
                    <td><span class="level-badge sm" style="--c:${LEVELS[h.level].color}">${h.level}</span></td>
                    <td>${modeLabel(LEVELS[h.level], h.mode)}</td>
                    <td>${h.correct}/${h.totalQ}</td>
                    <td>${h.mode === 'all' ? `<b>${h.total}</b> / ${h.max}` : `${Math.round(h.correct / h.totalQ * 100)}%`}</td>
                    <td>${h.passed === null ? `<span class="tag">${t('tag.practice')}</span>` : h.passed ? `<span class="tag ok">${t('tag.passed')}</span>` : `<span class="tag bad">${t('tag.failed')}</span>`}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <button class="btn btn-ghost mt-lg" id="clearHistory">${t('hist.clear')}</button>
        ` : `
          <div class="empty-state card">
            <span class="empty-icon jp">空</span>
            <h3>${t('hist.emptyTitle')}</h3>
            <p class="muted">${t('hist.emptyText')}</p>
            <a href="#/tests" class="btn btn-primary">${t('hero.cta1')}</a>
          </div>`}
      </div>
    </section>`;

  const clearBtn = $('#clearHistory');
  if (clearBtn) clearBtn.onclick = async () => {
    if (await confirmModal(t('hist.clearTitle'), t('hist.clearText'), t('hist.clearOk'))) {
      store.set('nd-history', []);
      renderHistory();
    }
  };
}

function renderStudy() {
  let script = store.get('nd-kana', 'hiragana');
  let withDakuten = store.get('nd-kana-dakuten', true);
  const toCells = (rows, romaji) => rows.flatMap((row, r) =>
    [...row].map((k, c) => ({ k, r: romaji[r][c] })).filter(x => x.k.trim()));
  const allKana = (s) => [
    ...toCells(KANA[s], KANA_ROMAJI),
    ...(withDakuten ? toCells(KANA_DAKUTEN[s], KANA_DAKUTEN_ROMAJI) : [])
  ];
  const gridHtml = (rows, romaji) => rows.map((row, r) => [...row].map((k, c) =>
    k.trim()
      ? `<button class="kana" data-k="${k}"><span class="jp">${k}</span><small>${romaji[r][c]}</small></button>`
      : '<span class="kana empty"></span>'
  ).join('')).join('');

  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">五十音 · Gojūon</span>
        <h1>${t('study.title')}</h1>
        <p class="muted">${t('study.sub')}</p>
      </div>
    </section>
    <section class="section tight">
      <div class="container study-layout">
        <div class="card">
          <div class="tabs" id="kanaTabs">
            <button data-s="hiragana">${t('study.hira')}</button>
            <button data-s="katakana">${t('study.kata')}</button>
          </div>
          <h3 class="kana-heading">${t('study.basic')} <span class="jp muted">清音</span></h3>
          <div class="kana-grid" id="kanaGrid"></div>
          <h3 class="kana-heading">${t('study.dakuten')} <span class="jp muted">濁音・半濁音</span></h3>
          <p class="small muted">${t('study.dakutenText')}</p>
          <div class="kana-grid" id="dakutenGrid"></div>
        </div>
        <aside class="card quiz">
          <h3>${t('quiz.title')}</h3>
          <p class="small muted">${t('quiz.q')}</p>
          <div class="quiz-kana jp" id="quizKana"></div>
          <div class="quiz-opts" id="quizOpts"></div>
          <p class="quiz-score small muted" id="quizScore"></p>
          <label class="quiz-toggle small"><input type="checkbox" id="dakutenToggle" ${withDakuten ? 'checked' : ''}> ${t('quiz.dakuten')}</label>
        </aside>
      </div>
    </section>`;

  let score = 0, tries = 0;

  const drawChart = () => {
    $$('#kanaTabs button').forEach(b => b.classList.toggle('on', b.dataset.s === script));
    $('#kanaGrid').innerHTML = gridHtml(KANA[script], KANA_ROMAJI);
    $('#dakutenGrid').innerHTML = gridHtml(KANA_DAKUTEN[script], KANA_DAKUTEN_ROMAJI);
    $$('.kana[data-k]').forEach(b => b.onclick = () => speak(b.dataset.k, { rate: 0.8 }));
  };

  const nextQuiz = () => {
    if (!$('#quizKana')) return; // left the page
    const pool = allKana(script);
    const target = pool[Math.floor(Math.random() * pool.length)];
    const opts = [target.r];
    while (opts.length < 4) {
      const r = pool[Math.floor(Math.random() * pool.length)].r;
      if (!opts.includes(r)) opts.push(r);
    }
    opts.sort(() => Math.random() - 0.5);
    $('#quizKana').textContent = target.k;
    $('#quizOpts').innerHTML = opts.map(o => `<button class="opt" data-r="${o}">${o}</button>`).join('');
    $('#quizScore').textContent = tries ? t('quiz.score', score, tries) : '';
    $$('#quizOpts .opt').forEach(b => b.onclick = () => {
      tries++;
      const ok = b.dataset.r === target.r;
      if (ok) score++;
      $$('#quizOpts .opt').forEach(x => {
        x.disabled = true;
        if (x.dataset.r === target.r) x.classList.add('correct');
      });
      if (!ok) b.classList.add('wrong');
      speak(target.k, { rate: 0.8 });
      $('#quizScore').textContent = t('quiz.score', score, tries);
      setTimeout(nextQuiz, 900);
    });
  };

  $$('#kanaTabs button').forEach(b => b.onclick = () => {
    script = b.dataset.s;
    store.set('nd-kana', script);
    drawChart();
    nextQuiz();
  });
  $('#dakutenToggle').onchange = (e) => {
    withDakuten = e.target.checked;
    store.set('nd-kana-dakuten', withDakuten);
    nextQuiz();
  };
  drawChart();
  nextQuiz();
}

function renderNotFound() {
  app.innerHTML = `
    <section class="section">
      <div class="container center">
        <div class="empty-state card">
          <span class="empty-icon jp">迷</span>
          <h3>${t('nf.title')}</h3>
          <p class="muted">${t('nf.text')}</p>
          <a href="#/" class="btn btn-primary">${t('nf.back')}</a>
        </div>
      </div>
    </section>`;
}

// ===== Router =====
function router({ keepScroll = false } = {}) {
  const [route = '', a, b] = location.hash.replace(/^#\/?/, '').split('/');

  const examRoute = route === 'exam' || (route === 'live' && b === 'run');
  if (!examRoute && exam) endExam();
  stopLiveTimer();
  if (route !== 'result') reviewFilter = 'all';
  document.body.classList.remove('menu-open');
  $$('#navLinks a').forEach(l => {
    const r = l.dataset.route;
    l.classList.toggle('active', r === (route || 'home') || (r === 'tests' && route === 'test'));
  });

  switch (route) {
    case '': renderHome(); break;
    case 'tests': renderTests(); break;
    case 'test': renderLevel(a); break;
    case 'exam':
      if (!exam || exam.hash !== location.hash) startExam(a, b || 'all');
      else renderExam();
      break;
    case 'result': renderResult(); break;
    case 'history': renderHistory(); break;
    case 'study': renderStudy(); break;
    case 'live': renderLive(a, b); break;
    default: renderNotFound();
  }
  if (!keepScroll && (!examRoute || !exam || exam.cur === 0)) window.scrollTo(0, 0);
}

// Warn before leaving an exam in progress
let suppressGuard = false;
window.addEventListener('hashchange', async () => {
  if (suppressGuard) { suppressGuard = false; return; }
  if (exam && location.hash !== exam.hash) {
    const target = location.hash;
    suppressGuard = true;
    location.hash = exam.hash;
    if (await confirmModal(t('leave.title'), t('leave.text'), t('leave.ok'))) {
      endExam();
      location.hash = target;
    }
    return;
  }
  router();
});

window.addEventListener('beforeunload', (e) => {
  if (exam) { e.preventDefault(); e.returnValue = ''; }
});

// Keyboard shortcuts in the exam
document.addEventListener('keydown', (e) => {
  if (!exam || !$('#modal').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  const n = exam.items[exam.cur].q.opts.length;
  if (/^[1-9]$/.test(e.key) && +e.key <= n) choose(+e.key - 1);
  else if (e.key === 'ArrowRight') goTo(exam.cur + 1);
  else if (e.key === 'ArrowLeft') goTo(exam.cur - 1);
  else if (e.key.toLowerCase() === 'f') toggleFlag();
});

// ===== Global UI =====
$('#themeToggle').onclick = () => {
  const root = document.documentElement;
  const isDark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = isDark ? 'light' : 'dark';
  try { localStorage.setItem('nd-theme', root.dataset.theme); } catch (e) {}
};

// Switch language in place: an exam in progress keeps its answers and timer
$('#langToggle').onclick = () => {
  lang = lang === 'en' ? 'bn' : 'en';
  try { localStorage.setItem('nd-lang', lang); } catch (e) {}
  applyStaticI18n();
  if (exam) renderExam();
  else router({ keepScroll: true });
};

$('#menuBtn').onclick = () => document.body.classList.toggle('menu-open');
$('#year').textContent = new Date().getFullYear();

applyStaticI18n();
router();
