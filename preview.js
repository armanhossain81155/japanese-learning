// Preview mode (open the site with ?preview): shows the login, shop, payment, account, paid exam and
// admin pages without a backend. Nothing is saved and no payment is real; a reload starts over.
// Loaded by shop.js only when the URL has ?preview.

function previewClient() {
  const demoCode = 'SS-DEMO-2026';
  const products = [
    { id: 'jlpt-n5-course-3m', kind: 'course', exam: 'JLPT-N5', test: null, title_en: 'JLPT N5 course: all mock tests, 3 months', title_bn: 'JLPT N5 কোর্স: সব মক টেস্ট, ৩ মাস', price: 999, days: 90, attempts: 1, active: true, sort: 1 },
    { id: 'jlpt-n5-test-01', kind: 'test', exam: 'JLPT-N5', test: 'N5/test-01', title_en: 'JLPT N5 Model Test 01', title_bn: 'JLPT N5 মডেল টেস্ট ০১', price: 500, days: null, attempts: 1, active: true, sort: 10 },
    { id: 'jlpt-n5-test-02', kind: 'test', exam: 'JLPT-N5', test: 'N5/test-02', title_en: 'JLPT N5 Model Test 02', title_bn: 'JLPT N5 মডেল টেস্ট ০২', price: 500, days: null, attempts: 1, active: true, sort: 11 }
  ];
  const state = {
    user: null, profile: null, ents: [], results: [],
    orders: [{ id: 'demo-0', user_id: 'other', product_id: 'jlpt-n5-test-02', amount: 500, method: 'bkash', sender: '01811-223344', trx_id: 'BKD7X2K9QP', status: 'pending', note: '', created_at: new Date(Date.now() - 3600e3).toISOString(),
      buyer: { name: 'Karim Ahmed', email: 'karim@example.com', phone: '01811223344' } }]
  };
  let listener = null;
  const emit = (event) => setTimeout(() => listener && listener(event, state.user ? { user: state.user } : null), 0);
  const signIn = (email, meta = {}) => {
    state.user = { id: 'demo', email };
    state.profile = { name: meta.name || 'Demo Student', phone: meta.phone || '01700000000', is_admin: true };
    emit('SIGNED_IN');
    return { data: { session: {} }, error: null };
  };
  const fail = (error) => ({ data: { ok: false, error }, error: null });
  const ok = (x = {}) => ({ data: { ok: true, ...x }, error: null });
  const title = (id) => products.find(p => p.id === id);

  const actions = {
    device: () => ok(),
    me: (b) => ok({
      email: state.user.email, profile: state.profile, entitlements: state.ents, results: state.results,
      orders: state.orders.filter(o => o.user_id === 'demo'),
      devices: [{ device_id: b.deviceId, label: deviceLabel(), last_seen: new Date().toISOString() }]
    }),
    order: (b) => {
      if (state.orders.some(o => o.trx_id === b.trxId.toUpperCase())) return fail('trx-used');
      const p = title(b.productId);
      state.orders.unshift({ id: 'demo-' + state.orders.length, user_id: 'demo', product_id: p.id, amount: p.price, method: b.method, sender: b.sender,
        trx_id: b.trxId.toUpperCase(), status: 'pending', note: '', created_at: new Date().toISOString(),
        buyer: { name: state.profile.name, email: state.user.email, phone: state.profile.phone } });
      return ok();
    },
    redeem: (b) => {
      const o = state.orders.find(x => x.code && x.code === b.code.trim().toUpperCase());
      if (!o) return fail('bad-code');
      if (o.redeemed) return fail('code-used');
      o.redeemed = true;
      const p = title(o.product_id);
      state.ents.push({ product_id: p.id, kind: p.kind, exam: p.exam, test: p.test, attempts_left: p.kind === 'test' ? 1 : null,
        expires_at: p.kind === 'course' ? new Date(Date.now() + p.days * 864e5).toISOString() : null });
      return ok();
    },
    start: async (b) => {
      state.lastTest = b.test;
      // The only public question file; in preview every test shows it
      const test = await (await fetch('model-tests/questions/N5/test-01.json')).json();
      return ok({
        test: { id: b.test, title: test.title, minutes: 90, level: test.level, sections: test.sections },
        session: { id: 'demo-session', startedAt: new Date().toISOString(), endsAt: new Date(Date.now() + 90 * 60000).toISOString(), answers: {}, tabSwitches: 0, shots: 0 }
      });
    },
    beat: () => ok({}),
    submit: (b) => {
      const answered = Object.values(b.answers || {}).filter(v => v != null).length;
      const score = { total: Math.round(answered / 67 * 180), max: 180, passed: answered >= 40, correct: answered, count: 67, cats: {} };
      state.results.unshift({ id: 'r' + state.results.length, test: state.lastTest, submitted_at: new Date().toISOString(), score });
      return ok({ score });
    },
    adminOrders: (b) => ok({ orders: state.orders.filter(o => o.status === (b.status || 'pending')).map(o => ({ ...o, products: title(o.product_id) })) }),
    adminReview: (b) => {
      const o = state.orders.find(x => x.id === b.orderId);
      o.status = b.approve ? 'approved' : 'rejected';
      o.note = b.note || '';
      if (!b.approve) return ok();
      o.code = o.user_id === 'demo' ? demoCode : 'SS-KRM8-4TQZ';
      return ok({ code: o.code, emailed: true });
    },
    adminResetDevices: () => ok()
  };

  return {
    auth: {
      onAuthStateChange(cb) { listener = cb; emit('INITIAL_SESSION'); },
      async signInWithPassword({ email }) { return signIn(email); },
      async signUp({ email, options }) { return signIn(email, options?.data); },
      async resetPasswordForEmail() { return { error: null }; },
      async updateUser() { return { error: null }; },
      async signOut() { state.user = null; emit('SIGNED_OUT'); return {}; }
    },
    from: () => ({ select: () => ({ order: async () => ({ data: products, error: null }) }) }),
    functions: {
      async invoke(name, { body }) {
        await new Promise(r => setTimeout(r, 250));
        const fn = actions[body.action];
        return fn ? fn(body) : fail('unknown-action');
      }
    }
  };
}

// Example payment details, so every method can be seen
Object.assign(BACKEND.payment, {
  bkash: { number: '01700-000000', type: 'Personal' },
  nagad: { number: '01800-000000', type: 'Personal' },
  rocket: { number: '01900-0000000', type: 'Personal' },
  bank: { bank: 'Example Bank', branch: 'Dhaka', accountName: 'Samurai Syntax', accountNumber: '0000 0000 0000', routing: '' }
});
if (!BACKEND.support) BACKEND.support = 'WhatsApp 01700-000000';

const previewBar = document.createElement('div');
previewBar.className = 'preview-bar';
previewBar.textContent = 'Preview mode: nothing is saved and no payment is real. · প্রিভিউ মোড: কিছুই সেভ হয় না, কোনো পেমেন্ট আসল নয়।';
document.body.prepend(previewBar);
