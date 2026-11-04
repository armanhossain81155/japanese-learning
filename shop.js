// ===== Accounts, buying and paid mock tests =====
// Login is Supabase Auth. Buying: the student pays by bKash / Nagad / Rocket / bank and enters the
// transaction ID; an admin checks it and approves, and the buyer gets an access code by email.
// Paid questions come from the `api` edge function (supabase/functions/api), never from this repo.

const shopOn = !!(BACKEND.supabaseUrl && BACKEND.supabaseAnonKey);
let sb = null;
// supabase-js is only downloaded when accounts are configured
const sbReady = shopOn ? new Promise((resolve) => {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  s.onload = () => { sb = supabase.createClient(BACKEND.supabaseUrl, BACKEND.supabaseAnonKey); resolve(); };
  s.onerror = () => resolve();
  document.head.appendChild(s);
}) : Promise.resolve();
const auth = { user: null, ready: false, me: null };
const PAY_METHODS = ['bkash', 'nagad', 'rocket', 'bank'];
const HEARTBEAT_MS = 30000;

// Escapes text typed by users before it goes into innerHTML
const h = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const testKey = (id) => encodeURIComponent(id);
const fmtTaka = (n) => `৳${Number(n).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}`;

// A random id per browser, used for the device limit and the one-device-per-exam rule
function deviceId() {
  let id = store.get('nd-device', null);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
    store.set('nd-device', id);
  }
  return id;
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return [br, os].filter(Boolean).join(' · ') || 'Browser';
}

async function api(action, data = {}) {
  await sbReady;
  if (!sb) return { ok: false, error: 'no-backend' };
  const { data: res, error } = await sb.functions.invoke('api', { body: { action, deviceId: deviceId(), ...data } });
  if (error) {
    console.error(error);
    return { ok: false, error: 'network' };
  }
  return res;
}

const errText = (code) => { const k = `err.${code}`; return t(k) === k ? t('err.server') : t(k); };

async function shopInit() {
  await sbReady;
  if (!sb) { auth.ready = true; if (shopOn) router({ keepScroll: true }); return; }
  sb.auth.onAuthStateChange(async (event, session) => {
    const before = auth.user?.id;
    auth.user = session?.user || null;
    auth.ready = true;
    if (event === 'PASSWORD_RECOVERY') { location.hash = '#/new-password'; return; }
    if (auth.user && auth.user.id !== before) {
      const res = await api('device', { label: deviceLabel() });
      if (!res.ok && res.error === 'device-limit') {
        await sb.auth.signOut();
        store.set('nd-auth-msg', 'device-limit');
      }
      auth.me = null;
    }
    if (!auth.user) auth.me = null;
    updateAccountLink();
    // Re-render pages that depend on login, but never interrupt an exam
    if (!exam) router({ keepScroll: true });
  });
}

function updateAccountLink() {
  const el = $('#accountLink');
  const shopLink = $('#navLinks a[data-route="shop"]');
  if (shopLink) shopLink.hidden = !shopOn;
  if (!el) return;
  el.hidden = !shopOn;
  el.textContent = auth.user ? t('nav.account') : t('nav.login');
  el.href = auth.user ? '#/account' : '#/login';
}

async function loadMe(force) {
  if (!auth.me || force) {
    const res = await api('me');
    if (res.ok) auth.me = res;
  }
  return auth.me;
}

// Pages that need a login send the user to #/login and back afterwards
function needLogin() {
  if (!shopOn) { renderNoBackend(); return true; }
  if (!auth.ready) { renderLoading(); return true; }
  if (!auth.user) {
    store.set('nd-after-login', location.hash);
    location.hash = '#/login';
    return true;
  }
  return false;
}

function renderLoading() {
  app.innerHTML = `<section class="section"><div class="container narrow center"><div class="spinner"></div></div></section>`;
}

function renderNoBackend() {
  app.innerHTML = `
    <section class="section tight"><div class="container narrow">
      <div class="card center"><h1>${t('shop.title')}</h1><p class="notice-bar">${t('shop.noBackend')}</p></div>
    </div></section>`;
}

// ===== Login / sign-up / password =====
function renderAuth(mode) {
  if (!shopOn) return renderNoBackend();
  if (!auth.ready) return renderLoading();
  if (!sb) return renderNoBackend();
  if (auth.user && mode !== 'new-password') { location.hash = '#/account'; return; }
  const msg = store.get('nd-auth-msg', null);
  if (msg) store.set('nd-auth-msg', null);
  const signup = mode === 'signup';
  const fields = mode === 'new-password'
    ? `<label>${t('auth.newPassword')}<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>`
    : `${signup ? `
        <label>${t('auth.name')}<input name="name" required maxlength="60" autocomplete="name"></label>
        <label>${t('auth.phone')}<input name="phone" required maxlength="20" inputmode="tel" autocomplete="tel"></label>` : ''}
      <label>${t('auth.email')}<input name="email" type="email" required autocomplete="email"></label>
      ${mode === 'forgot' ? '' : `<label>${t('auth.password')}<input name="password" type="password" required minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}"></label>`}`;

  app.innerHTML = `
    <section class="section tight">
      <div class="container narrow">
        <div class="card auth-card">
          <h1>${t(`auth.${mode}.title`)}</h1>
          ${msg ? `<p class="notice-bar">${errText(msg)}</p>` : ''}
          <form id="authForm" class="join-form">
            ${fields}
            <button class="btn btn-primary btn-lg btn-block" type="submit">${t(`auth.${mode}.btn`)}</button>
            <p class="small muted center" id="authMsg" role="status"></p>
          </form>
          <p class="small center auth-links">
            ${mode === 'login' ? `<a href="#/signup">${t('auth.toSignup')}</a> · <a href="#/forgot">${t('auth.toForgot')}</a>`
              : `<a href="#/login">${t('auth.toLogin')}</a>`}
          </p>
        </div>
      </div>
    </section>`;

  const form = $('#authForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const out = $('#authMsg');
    const btn = form.querySelector('button');
    btn.disabled = true;
    out.textContent = t('auth.wait');
    let error = null;
    const redirect = location.origin + location.pathname;
    if (mode === 'login') {
      ({ error } = await sb.auth.signInWithPassword({ email: d.email.trim(), password: d.password }));
      if (!error) {
        const next = store.get('nd-after-login', '#/account');
        store.set('nd-after-login', null);
        location.hash = next || '#/account';
        return;
      }
    } else if (mode === 'signup') {
      let data;
      ({ data, error } = await sb.auth.signUp({
        email: d.email.trim(), password: d.password,
        options: { data: { name: d.name.trim(), phone: d.phone.trim() }, emailRedirectTo: redirect }
      }));
      if (!error && !data.session) { out.textContent = t('auth.checkEmail'); return; }
    } else if (mode === 'forgot') {
      ({ error } = await sb.auth.resetPasswordForEmail(d.email.trim(), { redirectTo: redirect }));
      if (!error) { out.textContent = t('auth.resetSent'); return; }
    } else {
      ({ error } = await sb.auth.updateUser({ password: d.password }));
      if (!error) { location.hash = '#/account'; return; }
    }
    btn.disabled = false;
    out.textContent = error ? (error.message || t('err.server')) : '';
  };
}

// ===== Shop =====
async function loadProducts() {
  await sbReady;
  if (!sb) return [];
  if (!loadProducts.cache) {
    const { data, error } = await sb.from('products').select('*').order('sort');
    if (error) { console.error(error); return []; }
    loadProducts.cache = data;
  }
  return loadProducts.cache;
}

const examName = (exam) => exam.replace('-', ' ');

function productCard(p) {
  const course = p.kind === 'course';
  return `
    <article class="product-card${course ? ' course' : ''}">
      <span class="chip">${course ? t('shop.course') : t('shop.single')}</span>
      <h3>${h(lang === 'bn' ? p.title_bn : p.title_en)}</h3>
      <p class="muted small">${course ? t('shop.courseInfo', p.days) : t('shop.singleInfo', p.attempts)}</p>
      <div class="product-foot">
        <b class="price">${fmtTaka(p.price)}</b>
        <a class="btn btn-primary btn-sm" href="#/buy/${encodeURIComponent(p.id)}">${t('shop.buy')}</a>
      </div>
    </article>`;
}

async function renderShop(filter) {
  if (!shopOn) return renderNoBackend();
  renderLoading();
  const products = await loadProducts();
  const want = filter ? decodeURIComponent(filter) : '';
  const shown = products.filter(p => !want || p.exam === want || p.exam.startsWith(want + '-'));
  const exams = [...new Set(shown.map(p => p.exam))];
  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">${t('shop.eyebrow')}</span>
        <h1>${t('shop.title')}</h1>
        <p class="muted">${t('shop.sub')}</p>
        <div class="filter-row">
          <a class="chip-btn${want ? '' : ' on'}" href="#/shop">${t('shop.all')}</a>
          ${[...new Set(products.map(p => p.exam))].map(x => `<a class="chip-btn${x === want ? ' on' : ''}" href="#/shop/${encodeURIComponent(x)}">${h(examName(x))}</a>`).join('')}
        </div>
      </div>
    </section>
    <section class="section tight">
      <div class="container">
        ${exams.map(x => `
          <h2 class="shop-exam">${h(examName(x))}</h2>
          <div class="product-grid">${shown.filter(p => p.exam === x).map(productCard).join('')}</div>`).join('')
          || `<p class="muted">${t('shop.none')}</p>`}
        <p class="small muted mt-lg">${t('shop.how')}</p>
      </div>
    </section>`;
}

const payReady = (m) => !!(m === 'bank' ? BACKEND.payment.bank.accountNumber : BACKEND.payment[m].number);

function payDetails(method, price) {
  const p = BACKEND.payment[method];
  if (!payReady(method)) return `<p class="small">${t('pay.soon', t(`pay.${method}`))}</p>`;
  if (method === 'bank') {
    return `
      <dl class="pay-dl">
        <dt>${t('pay.bankName')}</dt><dd>${h(p.bank)}${p.branch ? `, ${h(p.branch)}` : ''}</dd>
        <dt>${t('pay.accountName')}</dt><dd>${h(p.accountName)}</dd>
        <dt>${t('pay.accountNumber')}</dt><dd><b class="copy">${h(p.accountNumber)}</b></dd>
        ${p.routing ? `<dt>${t('pay.routing')}</dt><dd>${h(p.routing)}</dd>` : ''}
        <dt>${t('pay.amount')}</dt><dd><b>${fmtTaka(price)}</b></dd>
      </dl>
      <p class="small muted">${t('pay.bankSteps')}</p>`;
  }
  return `
    <ol class="pay-steps">${t('pay.mobileSteps', t(`pay.${method}`), h(p.number), h(p.type), fmtTaka(price)).map(s => `<li>${s}</li>`).join('')}</ol>`;
}

async function renderBuy(id) {
  if (needLogin()) return;
  renderLoading();
  const p = (await loadProducts()).find(x => x.id === decodeURIComponent(id || ''));
  if (!p) return renderNotFound();
  // All methods are always listed; one without a number yet says so and takes no payments
  let method = PAY_METHODS.find(payReady) || PAY_METHODS[0];

  const draw = () => {
    app.innerHTML = `
      <section class="section tight">
        <div class="container narrow">
          <a href="#/shop/${encodeURIComponent(p.exam)}" class="back">${t('shop.back')}</a>
          <div class="card">
            <span class="chip">${p.kind === 'course' ? t('shop.course') : t('shop.single')}</span>
            <h1 class="mt-sm">${h(lang === 'bn' ? p.title_bn : p.title_en)}</h1>
            <p class="muted">${p.kind === 'course' ? t('shop.courseInfo', p.days) : t('shop.singleInfo', p.attempts)}</p>
            <p class="price big">${fmtTaka(p.price)}</p>

              <h3 class="mt-lg">${t('pay.choose')}</h3>
              <div class="pay-tabs" role="tablist">
                ${PAY_METHODS.map(m => `<button type="button" role="tab" class="pay-tab pay-${m}${m === method ? ' on' : ''}" aria-selected="${m === method}" data-m="${m}">${t(`pay.${m}`)}</button>`).join('')}
              </div>
              <div class="pay-box">${payDetails(method, p.price)}</div>

              ${payReady(method) ? `<form id="payForm" class="join-form">
                <label>${method === 'bank' ? t('pay.senderBank') : t('pay.sender')}<input name="sender" required maxlength="60" inputmode="${method === 'bank' ? 'text' : 'tel'}"></label>
                <label>${method === 'bank' ? t('pay.refBank') : t('pay.trx')}<input name="trx" required minlength="6" maxlength="60" autocapitalize="characters" spellcheck="false"></label>
                <button class="btn btn-primary btn-lg btn-block" type="submit">${t('pay.submit')}</button>
                <p class="small muted center" id="payMsg" role="status"></p>
              </form>` : ''}
              <p class="small muted">${t('pay.after', BACKEND.verifyHours)}${BACKEND.support ? ` ${t('pay.help', h(BACKEND.support))}` : ''}</p>
          </div>
        </div>
      </section>`;

    $$('.pay-tab').forEach(b => b.onclick = () => { method = b.dataset.m; draw(); });
    const form = $('#payForm');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('button');
      btn.disabled = true;
      $('#payMsg').textContent = t('auth.wait');
      const res = await api('order', { productId: p.id, method, sender: d.sender, trxId: d.trx });
      if (!res.ok) {
        btn.disabled = false;
        $('#payMsg').textContent = errText(res.error);
        return;
      }
      auth.me = null;
      app.innerHTML = `
        <section class="section tight"><div class="container narrow">
          <div class="card center">
            <span class="empty-icon jp">受</span>
            <h1>${t('pay.doneTitle')}</h1>
            <p class="muted">${t('pay.doneText', BACKEND.verifyHours)}</p>
            <a class="btn btn-primary" href="#/account">${t('nav.account')}</a>
          </div>
        </div></section>`;
    };
  };
  draw();
}

// ===== My account =====
async function renderAccount() {
  if (needLogin()) return;
  renderLoading();
  const [me, products] = await Promise.all([loadMe(true), loadProducts()]);
  if (!me) { app.innerHTML = `<section class="section"><div class="container narrow"><p class="notice-bar">${t('err.network')}</p></div></section>`; return; }

  // Tests this user can open: single purchases, plus every test of an exam with an active course
  const tests = new Map();
  me.entitlements.forEach(e => {
    if (e.kind === 'test') tests.set(e.test, { left: e.attempts_left });
    else products.filter(p => p.kind === 'test' && p.exam === e.exam).forEach(p => tests.set(p.test, { course: e.expires_at }));
  });
  const titleOf = (test) => {
    const p = products.find(x => x.test === test);
    return p ? (lang === 'bn' ? p.title_bn : p.title_en) : test;
  };
  const productTitle = (id) => {
    const p = products.find(x => x.id === id);
    return p ? (lang === 'bn' ? p.title_bn : p.title_en) : id;
  };
  const courses = me.entitlements.filter(e => e.kind === 'course');

  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">${t('acc.eyebrow')}</span>
        <h1>${h(me.profile.name || me.email)}</h1>
        <p class="muted">${h(me.email)}${me.profile.phone ? ` · ${h(me.profile.phone)}` : ''}</p>
      </div>
    </section>
    <section class="section tight">
      <div class="container account-grid">
        <div>
          <div class="card">
            <h2>${t('acc.redeem')}</h2>
            <p class="muted small">${t('acc.redeemText')}</p>
            <form id="redeemForm" class="redeem-form">
              <input name="code" required placeholder="SS-XXXX-XXXX" autocapitalize="characters" spellcheck="false" aria-label="${t('acc.redeem')}">
              <button class="btn btn-primary" type="submit">${t('acc.redeemBtn')}</button>
            </form>
            <p class="small" id="redeemMsg" role="status"></p>
          </div>

          <div class="card">
            <h2>${t('acc.myTests')}</h2>
            ${courses.map(c => `<p class="notice-bar ok">${t('acc.courseUntil', h(examName(c.exam)), fmtDate(Date.parse(c.expires_at)))}</p>`).join('')}
            ${tests.size ? `<div class="section-list">
              ${[...tests].map(([test, x]) => `
                <a class="section-item" href="#/my/${testKey(test)}">
                  <span class="section-info"><b>${h(titleOf(test))}</b>
                    <small class="muted">${x.course ? t('acc.inCourse') : t('acc.attemptsLeft', x.left)}</small></span>
                  <span class="section-meta">${t('acc.start')} →</span>
                </a>`).join('')}
            </div>` : `<p class="muted">${t('acc.noTests')} <a href="#/shop">${t('acc.goShop')}</a></p>`}
          </div>

          <div class="card">
            <h2>${t('acc.results')}</h2>
            ${me.results.length ? `<table class="table compact"><tbody>
              ${me.results.map(r => `<tr>
                <td><b>${h(titleOf(r.test))}</b><br><small class="muted">${fmtDate(Date.parse(r.submitted_at))}</small></td>
                <td class="right">${r.score ? `<b>${r.score.total}</b> / ${r.score.max}<br><small class="${r.score.passed ? 'pass' : 'fail'}">${r.score.passed ? t('res.passed') : t('res.failed')}</small>` : '—'}</td>
              </tr>`).join('')}
            </tbody></table>` : `<p class="muted">${t('acc.noResults')}</p>`}
          </div>
        </div>

        <aside>
          <div class="card">
            <h3>${t('acc.orders')}</h3>
            ${me.orders.length ? me.orders.map(o => `
              <div class="order-row">
                <div><b>${h(productTitle(o.product_id))}</b><br>
                  <small class="muted">${t(`pay.${o.method}`)} · ${h(o.trx_id)} · ${fmtTaka(o.amount)}</small>
                  ${o.note ? `<br><small class="muted">${h(o.note)}</small>` : ''}</div>
                <span class="status-pill ${o.status}">${t(`order.${o.status}`)}</span>
              </div>`).join('') : `<p class="muted small">${t('acc.noOrders')}</p>`}
          </div>
          <div class="card">
            <h3>${t('acc.devices')}</h3>
            <p class="muted small">${t('acc.devicesText')}</p>
            ${me.devices.map(d => `<div class="score-row"><span>${h(d.label)}${d.device_id === deviceId() ? ` <b>(${t('acc.thisDevice')})</b>` : ''}</span><small class="muted">${fmtDate(Date.parse(d.last_seen))}</small></div>`).join('')}
          </div>
          ${me.profile.is_admin ? `<a class="btn btn-ghost btn-block" href="#/admin">${t('admin.title')}</a>` : ''}
          <button class="btn btn-ghost btn-block mt-sm" id="logoutBtn">${t('acc.logout')}</button>
        </aside>
      </div>
    </section>`;

  $('#logoutBtn').onclick = async () => { await sb.auth.signOut(); location.hash = '#/'; };
  const form = $('#redeemForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    $('#redeemMsg').textContent = t('auth.wait');
    const res = await api('redeem', { code: form.code.value.trim() });
    btn.disabled = false;
    if (!res.ok) { $('#redeemMsg').textContent = errText(res.error); return; }
    renderAccount();
  };
}

// ===== Paid exam =====
const paidDoneKey = (test) => `nd-paid-done-${test}`;
const paidOrderKey = (sessionId) => `nd-paid-order-${sessionId}`;

function renderMy(key, sub) {
  const test = decodeURIComponent(key || '');
  if (sub === 'run') {
    if (exam && exam.hash === location.hash) return renderExam();
    return renderPaidJoin(test);
  }
  if (sub === 'done') return renderPaidDone(test);
  renderPaidJoin(test);
}

function renderPaidJoin(test) {
  if (needLogin()) return;
  app.innerHTML = `
    <section class="section tight">
      <div class="container narrow">
        <a href="#/account" class="back">${t('acc.back')}</a>
        <div class="card live-join">
          <h1>${h(test)}</h1>
          <h3 class="mt-lg">${t('live.rulesTitle')}</h3>
          <ul class="rules">${t('paid.rules').map(r => `<li>${r}</li>`).join('')}</ul>
          <button class="btn btn-primary btn-lg btn-block" id="paidStart">${t('paid.start')}</button>
          <p class="small muted center" id="paidMsg" role="status"></p>
        </div>
      </div>
    </section>`;
  $('#paidStart').onclick = async () => {
    const btn = $('#paidStart');
    btn.disabled = true;
    $('#paidMsg').textContent = t('live.loading');
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    const res = await api('start', { test });
    if (!res.ok) {
      btn.disabled = false;
      $('#paidMsg').textContent = errText(res.error);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return;
    }
    await startPaidExam(res.test, res.session);
  };
}

async function startPaidExam(test, session) {
  if (!liveTypes) liveTypes = await loadJson('model-tests/shared/types.json');
  const { sections, items } = buildLiveItems(test, liveTypes, store.get(paidOrderKey(session.id), {}));
  const orders = {};
  items.forEach(it => { orders[it.q.id] = it.q.order; });
  store.set(paidOrderKey(session.id), orders);

  endExam();
  const me = auth.me || {};
  exam = {
    hash: `#/my/${testKey(test.id)}/run`,
    level: { id: test.level, color: LEVELS[test.level].color, sections },
    mode: 'all',
    items,
    answers: items.map(it => {
      const orig = session.answers[it.q.id];
      return orig == null ? null : it.q.order.indexOf(orig);
    }),
    flags: new Set(),
    cur: 0,
    plays: {},
    startedAt: Date.parse(session.startedAt),
    endsAt: Date.parse(session.endsAt),
    minutes: test.minutes,
    timerId: null,
    live: {
      paid: { sessionId: session.id, test: test.id, lastBeat: 0, beatTimer: null },
      ex: { id: test.id, title: test.title },
      student: { name: me.profile?.name || auth.user.email, roll: auth.user.email },
      tabSwitches: session.tabSwitches || 0,
      shots: session.shots || 0
    }
  };
  exam.timerId = setInterval(tick, 1000);
  exam.live.paid.beatTimer = setInterval(() => paidBeat(true), HEARTBEAT_MS);
  location.hash = exam.hash;
}

function paidAnswers() {
  const answers = {};
  exam.items.forEach((it, i) => {
    answers[it.q.id] = exam.answers[i] == null ? null : it.q.order[exam.answers[i]];
  });
  return answers;
}

// Saves answers to the server; also tells it this device is still inside the exam
async function paidBeat(force) {
  if (!exam || !exam.live?.paid) return;
  const p = exam.live.paid;
  if (!force && Date.now() - p.lastBeat < 5000) {
    clearTimeout(p.pending);
    p.pending = setTimeout(() => paidBeat(true), 5000);
    return;
  }
  p.lastBeat = Date.now();
  const res = await api('beat', { sessionId: p.sessionId, answers: paidAnswers(), tabSwitches: exam.live.tabSwitches, shots: exam.live.shots });
  if (!res.ok && ['taken', 'submitted', 'bad-session'].includes(res.error) && exam?.live?.paid === p) {
    stopPaid();
    endExam();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    app.innerHTML = `<section class="section tight"><div class="container narrow"><div class="card center">
      <h1>${t('paid.stoppedTitle')}</h1><p class="notice-bar">${errText(res.error)}</p>
      <a class="btn btn-primary" href="#/account">${t('nav.account')}</a></div></div></section>`;
  }
}

function stopPaid() {
  const p = exam?.live?.paid;
  if (!p) return;
  clearInterval(p.beatTimer);
  clearTimeout(p.pending);
}

async function submitPaid(timeUp) {
  if (exam.live.submitting) return;
  exam.live.submitting = true;
  clearInterval(exam.timerId);
  const p = exam.live.paid;
  showSubmitting();
  const res = await api('submit', { sessionId: p.sessionId, answers: paidAnswers(), tabSwitches: exam.live.tabSwitches, shots: exam.live.shots });
  $('#submitOverlay')?.remove();
  if (!res.ok && res.error === 'network') {
    exam.live.submitting = false;
    const retry = await confirmModal(t('live.submitFailTitle'), t('paid.submitFail'), t('live.retry'));
    if (retry || timeUp || Date.now() >= exam.endsAt) return submitPaid(timeUp || Date.now() >= exam.endsAt);
    exam.timerId = setInterval(tick, 1000);
    return;
  }
  stopPaid();
  store.set(paidDoneKey(p.test), { ...res, title: exam.live.ex.title, at: Date.now() });
  try { localStorage.removeItem(paidOrderKey(p.sessionId)); } catch (e) {}
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  auth.me = null;
  const hash = `#/my/${testKey(p.test)}/done`;
  endExam();
  location.hash = hash;
}

function renderPaidDone(test) {
  const done = store.get(paidDoneKey(test), null);
  if (!done) { location.hash = '#/account'; return; }
  const s = done.score;
  app.innerHTML = `
    <section class="section tight">
      <div class="container narrow">
        <a href="#/account" class="back">${t('acc.back')}</a>
        <div class="card center live-done">
          <span class="empty-icon jp">${s?.passed ? '合' : '完'}</span>
          <h1>${t('live.submitted')}</h1>
          <p class="muted">${h(L(done.title))}</p>
          ${s ? `
            <div class="live-score"><b>${s.total}</b><span>/ ${s.max}</span></div>
            <p class="${s.passed ? 'pass' : 'fail'} live-verdict">${s.passed ? t('res.passed') : t('res.failed')}</p>
            <p class="small muted">${t('res.correctOf', s.correct, s.count)}</p>`
          : `<p class="notice-bar">${errText(done.error)}</p>`}
        </div>
      </div>
    </section>`;
}

// ===== Admin: check payments =====
async function renderAdmin(status = 'pending') {
  if (needLogin()) return;
  renderLoading();
  const res = await api('adminOrders', { status });
  if (!res.ok) {
    app.innerHTML = `<section class="section"><div class="container narrow"><p class="notice-bar">${errText(res.error)}</p></div></section>`;
    return;
  }
  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">Admin</span>
        <h1>${t('admin.title')}</h1>
        <p class="muted">${t('admin.sub')}</p>
        <div class="filter-row">
          ${['pending', 'approved', 'rejected'].map(s => `<a class="chip-btn${s === status ? ' on' : ''}" href="#/admin/${s}">${t(`order.${s}`)}</a>`).join('')}
        </div>
      </div>
    </section>
    <section class="section tight">
      <div class="container">
        <div class="table-wrap">
          <table class="table admin-table">
            <thead><tr><th>${t('admin.buyer')}</th><th>${t('admin.product')}</th><th>${t('admin.payment')}</th><th>${t('admin.time')}</th><th></th></tr></thead>
            <tbody>
              ${res.orders.map(o => `
                <tr data-id="${h(o.id)}">
                  <td><b>${h(o.buyer?.name)}</b><br><small>${h(o.buyer?.email)}</small><br><small class="muted">${h(o.buyer?.phone)}</small></td>
                  <td>${h(o.products?.title_en)}<br><b>${fmtTaka(o.amount)}</b></td>
                  <td>${t(`pay.${o.method}`)}<br><small>${t('admin.from')} <b>${h(o.sender)}</b></small><br><small>TrxID <b class="copy">${h(o.trx_id)}</b></small></td>
                  <td><small>${fmtDate(Date.parse(o.created_at))}</small></td>
                  <td class="admin-actions">
                    ${o.status === 'pending' ? `
                      <button class="btn btn-primary btn-sm" data-approve>${t('admin.approve')}</button>
                      <button class="btn btn-ghost btn-sm" data-reject>${t('admin.reject')}</button>`
                      : `<span class="status-pill ${o.status}">${t(`order.${o.status}`)}</span>${o.note ? `<br><small class="muted">${h(o.note)}</small>` : ''}`}
                    <div class="small admin-out"></div>
                  </td>
                </tr>`).join('') || `<tr><td colspan="5" class="muted">${t('admin.empty')}</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="card mt-lg narrow-card">
          <h3>${t('admin.resetTitle')}</h3>
          <p class="muted small">${t('admin.resetText')}</p>
          <form id="resetForm" class="redeem-form">
            <input name="email" type="email" required placeholder="student@email.com" aria-label="Email">
            <button class="btn btn-ghost" type="submit">${t('admin.reset')}</button>
          </form>
          <p class="small" id="resetMsg" role="status"></p>
        </div>
      </div>
    </section>`;

  $$('.admin-table tr[data-id]').forEach(row => {
    const out = row.querySelector('.admin-out');
    const review = async (approve) => {
      const note = approve ? '' : (prompt(t('admin.reasonPrompt')) ?? null);
      if (note === null) return;
      row.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const r = await api('adminReview', { orderId: row.dataset.id, approve, note });
      if (!r.ok) {
        out.textContent = errText(r.error);
        row.querySelectorAll('button').forEach(b => { b.disabled = false; });
        return;
      }
      row.querySelectorAll('button').forEach(b => b.remove());
      out.innerHTML = approve
        ? `${t('order.approved')} · <b class="copy">${h(r.code)}</b><br>${r.emailed ? t('admin.emailed') : `<span class="fail">${t('admin.notEmailed')}</span>`}`
        : t('order.rejected');
    };
    row.querySelector('[data-approve]')?.addEventListener('click', () => review(true));
    row.querySelector('[data-reject]')?.addEventListener('click', () => review(false));
  });

  const form = $('#resetForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const r = await api('adminResetDevices', { email: form.email.value.trim() });
    $('#resetMsg').textContent = r.ok ? t('admin.resetDone') : errText(r.error);
  };
}
