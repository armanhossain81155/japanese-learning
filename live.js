// ===== Live exams =====
// Questions are loaded from model-tests/questions (no answers). Answers are sent to the
// Google Apps Script backend, which grades them with the answer key kept in Google Sheets.

let liveTimer = null;
let liveTypes = null;

const liveStore = {
  progressKey: (id) => `nd-live-progress-${id}`,
  doneKey: (id) => `nd-live-done-${id}`,
  studentKey: 'nd-live-student'
};

const liveExam = (id) => LIVE_CONFIG.exams.find(e => e.id === id);
const liveStart = (ex) => ex.alwaysOpen ? null : Date.parse(ex.start);
const liveEnd = (ex) => ex.alwaysOpen ? null : Date.parse(ex.start) + ex.minutes * 60000;

function liveStatus(ex, now = Date.now()) {
  if (ex.alwaysOpen) return 'live';
  if (now < liveStart(ex)) return 'upcoming';
  return now < liveEnd(ex) ? 'live' : 'ended';
}

function stopLiveTimer() {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = null;
}

function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return d ? t('live.dhm', d, h, m) : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

async function loadJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

function statusPill(ex) {
  const st = liveStatus(ex);
  if (st === 'live') return `<span class="pill live">● ${t('live.now')}</span>`;
  if (st === 'upcoming') return `<span class="pill" data-countdown="${liveStart(ex)}">${t('live.startsIn')} ${fmtCountdown(liveStart(ex) - Date.now())}</span>`;
  return `<span class="pill ended">${t('live.ended')}</span>`;
}

// Re-render the lobby/join page when an exam opens or closes; update countdowns every second
function startLiveTicker(rerender) {
  stopLiveTimer();
  let last = LIVE_CONFIG.exams.map(e => liveStatus(e)).join();
  liveTimer = setInterval(() => {
    const now = LIVE_CONFIG.exams.map(e => liveStatus(e)).join();
    if (now !== last) { last = now; rerender(); return; }
    $$('[data-countdown]').forEach(el => {
      el.textContent = `${t('live.startsIn')} ${fmtCountdown(+el.dataset.countdown - Date.now())}`;
    });
  }, 1000);
}

function renderLiveLobby() {
  const exams = [...LIVE_CONFIG.exams].sort((a, b) => {
    const order = { live: 0, upcoming: 1, ended: 2 };
    return order[liveStatus(a)] - order[liveStatus(b)] || (liveStart(a) || 0) - (liveStart(b) || 0);
  });

  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">${t('live.eyebrow')}</span>
        <h1>${t('live.title')}</h1>
        <p class="muted">${t('live.sub')}</p>
      </div>
    </section>
    <section class="section tight">
      <div class="container">
        ${!LIVE_CONFIG.submitUrl ? `<p class="notice-bar">${t('live.noBackend')}</p>` : ''}
        <div class="live-list">
          ${exams.map(ex => {
            const level = LEVELS[ex.level];
            const done = store.get(liveStore.doneKey(ex.id), null);
            const st = liveStatus(ex);
            return `
              <article class="live-card" style="--c:${level.color}">
                <span class="level-badge">${ex.level}</span>
                <div class="live-info">
                  <h3>${L(ex.title)}</h3>
                  <p class="muted small">
                    ${ex.alwaysOpen ? t('live.alwaysOpen') : fmtDate(liveStart(ex))} · ${ex.minutes} ${t('min')}
                  </p>
                  ${statusPill(ex)}
                </div>
                <div class="live-action">
                  ${done
                    ? `<a class="btn btn-ghost btn-sm" href="#/live/${ex.id}/done">${t('live.viewResult')}</a>`
                    : st === 'live'
                      ? `<a class="btn btn-primary btn-sm" href="#/live/${ex.id}">${t('live.join')}</a>`
                      : `<button class="btn btn-ghost btn-sm" disabled>${st === 'upcoming' ? t('live.notOpen') : t('live.ended')}</button>`}
                </div>
              </article>`;
          }).join('') || `<p class="muted">${t('live.none')}</p>`}
        </div>
      </div>
    </section>`;
  startLiveTicker(renderLiveLobby);
}

function renderLiveJoin(id) {
  const ex = liveExam(id);
  if (!ex) return renderNotFound();
  if (store.get(liveStore.doneKey(id), null)) { location.hash = `#/live/${id}/done`; return; }

  const level = LEVELS[ex.level];
  const st = liveStatus(ex);
  const student = store.get(liveStore.studentKey, { name: '', roll: '' });
  const saved = store.get(liveStore.progressKey(id), null);

  app.innerHTML = `
    <section class="section tight" style="--c:${level.color}">
      <div class="container narrow">
        <a href="#/live" class="back">${t('live.back')}</a>
        <div class="card live-join">
          <div class="level-title">
            <span class="level-badge lg">${ex.level}</span>
            <div>
              <h1>${L(ex.title)}</h1>
              <p class="muted">${ex.alwaysOpen ? t('live.alwaysOpen') : fmtDate(liveStart(ex))} · ${ex.minutes} ${t('min')}</p>
            </div>
          </div>
          ${statusPill(ex)}

          <h3 class="mt-lg">${t('live.rulesTitle')}</h3>
          <ul class="rules">
            ${t('live.rules', ex.alwaysOpen ? null : fmtDate(liveEnd(ex))).map(r => `<li>${r}</li>`).join('')}
          </ul>

          ${st === 'live' ? `
            <form id="joinForm" class="join-form">
              <label>${t('live.name')}<input name="name" required maxlength="60" value="${student.name.replace(/"/g, '&quot;')}" ${saved ? 'readonly' : ''}></label>
              <label>${t('live.roll')}<input name="roll" required maxlength="80" value="${student.roll.replace(/"/g, '&quot;')}" ${saved ? 'readonly' : ''}></label>
              <button class="btn btn-primary btn-lg btn-block" type="submit">${saved ? t('live.resume') : t('live.start')}</button>
              <p class="small muted center" id="joinMsg"></p>
            </form>`
            : `<p class="notice-bar">${st === 'upcoming' ? t('live.notOpenYet') : t('live.closed')}</p>`}
        </div>
      </div>
    </section>`;

  startLiveTicker(() => renderLiveJoin(id));
  const form = $('#joinForm');
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const name = data.name.trim(), roll = data.roll.trim();
    if (!name || !roll) return;
    store.set(liveStore.studentKey, { name, roll });
    form.querySelector('button').disabled = true;
    $('#joinMsg').textContent = t('live.loading');
    try {
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      await startLiveExam(ex, { name, roll });
    } catch (err) {
      console.error(err);
      form.querySelector('button').disabled = false;
      $('#joinMsg').textContent = location.protocol === 'file:' ? t('live.needServer') : t('live.loadError');
    }
  };
}

// Turns a model test file into the item structure renderExam() uses.
// Options are shuffled per student; `order` maps shown positions back to the original index.
function buildLiveItems(test, types, savedOrders = {}) {
  const items = [];
  const sections = test.sections.map(sec => {
    const section = { id: sec.id, title: SECTION[sec.id], jp: sec.jp, groups: [] };
    sec.parts.forEach(part => {
      const tp = types[part.type];
      const makeGroup = (passage) => ({ type: T(tp.en, tp.bn), jp: tp.jp, instr: tp.instr, passage, questions: [] });
      const shared = makeGroup(part.passage);
      section.groups.push(shared);
      part.questions.forEach(q => {
        let group = shared;
        if (q.passage) { group = makeGroup(q.passage); section.groups.push(group); }
        let order = savedOrders[q.id];
        if (!order) {
          order = q.opts.map((_, i) => i);
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
        }
        const opts = order.map(i => q.opts[i]);
        const item = {
          id: q.id, q: q.q || BEST_RESPONSE, opts, order,
          // Real exam: in もんだい3/4 the options are only heard, and もんだい3 shows a picture instead of text
          audio: q.audio && q.spokenOpts ? [q.audio, ...opts.map((o, i) => `${i + 1}、${o}`)].join('\n') : q.audio,
          spoken: !!q.spokenOpts,
          hideText: !!q.image && !!q.spokenOpts,
          image: q.image ? `model-tests/${q.image}` : null,
          optImages: q.optImages ? order.map(i => `model-tests/${q.optImages[i]}`) : null
        };
        group.questions.push(item);
      });
    });
    section.groups = section.groups.filter(g => g.questions.length);
    section.groups.forEach(g => g.questions.forEach(q => items.push({ section, group: g, q })));
    return section;
  });
  return { sections, items };
}

async function startLiveExam(ex, student) {
  if (!liveTypes) liveTypes = await loadJson('model-tests/shared/types.json');
  const test = await loadJson(`model-tests/questions/${ex.test}.json`);
  const saved = store.get(liveStore.progressKey(ex.id), null);
  const { sections, items } = buildLiveItems(test, liveTypes, saved ? saved.orders : {});

  endExam();
  stopLiveTimer();
  const startedAt = saved ? saved.startedAt : Date.now();
  // Scheduled exams end for everyone at the same time; demo exams count from the student's start
  const endsAt = ex.alwaysOpen ? startedAt + ex.minutes * 60000 : liveEnd(ex);
  const answers = items.map(it => {
    const orig = saved ? saved.answers[it.q.id] : null;
    return orig == null ? null : it.q.order.indexOf(orig);
  });

  exam = {
    hash: `#/live/${ex.id}/run`,
    level: { id: ex.level, color: LEVELS[ex.level].color, sections },
    mode: 'all',
    items,
    answers,
    flags: new Set(saved ? saved.flags : []),
    cur: saved ? saved.cur : 0,
    plays: {},
    startedAt,
    endsAt,
    minutes: ex.minutes,
    timerId: null,
    live: { ex, student, tabSwitches: saved ? saved.tabSwitches : 0, shots: saved ? saved.shots || 0 : 0 }
  };
  saveLiveProgress();
  exam.timerId = setInterval(tick, 1000);
  location.hash = exam.hash;
}

function saveLiveProgress() {
  if (!exam || !exam.live) return;
  const answers = {}, orders = {};
  exam.items.forEach((it, i) => {
    orders[it.q.id] = it.q.order;
    answers[it.q.id] = exam.answers[i] == null ? null : it.q.order[exam.answers[i]];
  });
  store.set(liveStore.progressKey(exam.live.ex.id), {
    student: exam.live.student, startedAt: exam.startedAt, cur: exam.cur,
    flags: [...exam.flags], tabSwitches: exam.live.tabSwitches, shots: exam.live.shots, answers, orders
  });
}

// After a page refresh during a live exam, pick up where the student left off
async function resumeLive(id) {
  const ex = liveExam(id);
  const saved = ex && store.get(liveStore.progressKey(id), null);
  if (!ex || !saved || liveStatus(ex) !== 'live') { location.hash = `#/live/${id}`; return; }
  app.innerHTML = `<section class="section"><div class="container center muted">${t('live.loading')}</div></section>`;
  try {
    await startLiveExam(ex, saved.student);
    renderExam();
  } catch (err) {
    console.error(err);
    location.hash = `#/live/${id}`;
  }
}

async function submitLive(timeUp) {
  if (exam.live.submitting) return;
  exam.live.submitting = true;
  const { ex, student, tabSwitches, shots } = exam.live;
  clearInterval(exam.timerId);
  saveLiveProgress();
  const answers = {};
  exam.items.forEach((it, i) => {
    answers[it.q.id] = exam.answers[i] == null ? null : it.q.order[exam.answers[i]];
  });
  const payload = {
    examId: ex.id, test: ex.test, level: ex.level,
    name: student.name, roll: student.roll,
    answers, tabSwitches, shots, timeUp: !!timeUp,
    startedAt: new Date(exam.startedAt).toISOString(),
    submittedAt: new Date().toISOString()
  };

  showSubmitting();
  let result = { local: true };
  if (LIVE_CONFIG.submitUrl) {
    try {
      // text/plain avoids a CORS preflight, which Apps Script does not answer
      const res = await fetch(LIVE_CONFIG.submitUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      result = await res.json();
      // duplicate / closed are final answers from the server, not network errors
      if (!result.ok && !['duplicate', 'closed'].includes(result.error)) throw new Error(result.error || 'submit failed');
    } catch (err) {
      console.error(err);
      // Keep the progress so the student can retry. Once time is up, only retry is possible.
      $('#submitOverlay')?.remove();
      exam.live.submitting = false;
      const retry = await confirmModal(t('live.submitFailTitle'), t('live.submitFailText'), t('live.retry'));
      if (retry || timeUp || Date.now() >= exam.endsAt) return submitLive(timeUp || Date.now() >= exam.endsAt);
      exam.timerId = setInterval(tick, 1000);
      return;
    }
  }

  store.set(liveStore.doneKey(ex.id), { ...result, payload, at: Date.now() });
  try { localStorage.removeItem(liveStore.progressKey(ex.id)); } catch (e) {}
  $('#submitOverlay')?.remove();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  endExam();
  location.hash = `#/live/${ex.id}/done`;
}

function showSubmitting() {
  const el = document.createElement('div');
  el.id = 'submitOverlay';
  el.className = 'modal';
  el.innerHTML = `<div class="modal-card center"><div class="spinner"></div><p>${t('live.submitting')}</p></div>`;
  document.body.appendChild(el);
}

function renderLiveDone(id) {
  const ex = liveExam(id);
  const done = ex && store.get(liveStore.doneKey(id), null);
  if (!done) { location.hash = ex ? `#/live/${id}` : '#/live'; return; }
  const level = LEVELS[ex.level];
  const hasScore = done.ok && typeof done.total === 'number';

  app.innerHTML = `
    <section class="section tight" style="--c:${level.color}">
      <div class="container narrow">
        <a href="#/live" class="back">${t('live.back')}</a>
        <div class="card center live-done">
          <span class="empty-icon jp">${hasScore ? (done.passed ? '合' : '完') : '完'}</span>
          <h1>${t('live.submitted')}</h1>
          <p class="muted">${L(ex.title)} · ${done.payload.name} (${done.payload.roll})</p>
          ${hasScore ? `
            <div class="live-score">
              <b>${done.total}</b><span>/ ${done.max}</span>
            </div>
            <p class="${done.passed ? 'pass' : 'fail'} live-verdict">${done.passed ? t('res.passed') : t('res.failed')}</p>
            <p class="small muted">${t('res.correctOf', done.correct, done.count)}</p>`
          : done.error === 'duplicate'
            ? `<p class="notice-bar">${t('live.duplicate')}</p>`
          : done.error === 'closed'
            ? `<p class="notice-bar">${t('live.closedSubmit')}</p>`
            : `<p class="notice-bar">${t('live.savedLocal')}</p>
               <button class="btn btn-ghost" id="downloadAnswers">${t('live.download')}</button>`}
          <p class="small muted mt-lg">${t('live.answersLater')}</p>
        </div>
      </div>
    </section>`;

  const dl = $('#downloadAnswers');
  if (dl) dl.onclick = () => {
    const blob = new Blob([JSON.stringify(done.payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${ex.id}-${done.payload.roll}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

function renderLive(id, sub) {
  if (!id) return renderLiveLobby();
  if (sub === 'run') {
    if (exam && exam.hash === location.hash) return renderExam();
    return resumeLive(id);
  }
  if (sub === 'done') return renderLiveDone(id);
  renderLiveJoin(id);
}

// Count tab/app switches during a live exam
document.addEventListener('visibilitychange', () => {
  if (!exam || !exam.live) return;
  if (document.hidden) {
    exam.live.tabSwitches++;
    saveLiveProgress();
  } else {
    showToast(t('live.tabWarning', exam.live.tabSwitches));
  }
});

function showToast(text) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.classList.remove('show'), 4000);
}
